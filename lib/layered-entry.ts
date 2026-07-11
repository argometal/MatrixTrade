import type { TradePlan } from "./plan-types";
import type { Playbook } from "./playbook-types";
import {
  computeLayeredAverageEntry,
  type LayeredEntryLimit,
  type LayeredEntryPlan,
  type LayeredEntryStatus,
} from "./layered-entry-types";

export type LayeredEntryInput = {
  executionMethod: LayeredEntryPlan["executionMethod"];
  limits: LayeredEntryLimit[];
};

export type LayeredEntryUpdateInput = {
  filledThroughIndex?: number;
  status?: LayeredEntryStatus;
};

export interface LayeredEntryScenario {
  label: string;
  limitsFilled: number;
  capitalPercent: number;
  averageEntry: number;
}

const VALID_TRANSITIONS: Record<LayeredEntryStatus, LayeredEntryStatus[]> = {
  planned: ["partial", "full", "missed", "active", "cancelled"],
  partial: ["full", "active", "missed", "cancelled"],
  full: ["active", "cancelled"],
  missed: [],
  active: ["cancelled"],
  cancelled: [],
};

function parseLimit(raw: unknown): LayeredEntryLimit | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const price = Number(obj.price);
  const allocationPercent = Number(obj.allocationPercent ?? obj.allocation);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(allocationPercent) || allocationPercent <= 0) return null;
  const limit: LayeredEntryLimit = { price, allocationPercent };
  if (obj.filled === true || obj.filled === "true") limit.filled = true;
  return limit;
}

export function parseLayeredEntryInput(raw: unknown): LayeredEntryInput | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const method = String(obj.executionMethod ?? "layered_limits").trim();
  const methods = ["single_limit", "layered_limits", "market"] as const;
  if (!methods.includes(method as (typeof methods)[number])) return undefined;

  const limitsRaw = obj.limits;
  if (!Array.isArray(limitsRaw) || limitsRaw.length === 0) return undefined;
  const limits = limitsRaw.map(parseLimit).filter((l): l is LayeredEntryLimit => l !== null);
  if (limits.length === 0) return undefined;

  return {
    executionMethod: method as LayeredEntryPlan["executionMethod"],
    limits,
  };
}

export function validateLayeredEntry(input: LayeredEntryInput): string[] {
  const errors: string[] = [];
  if (input.limits.length === 0) errors.push("layeredEntry.limits[] required (min 1)");
  const totalAlloc = input.limits.reduce((sum, l) => sum + l.allocationPercent, 0);
  if (Math.abs(totalAlloc - 100) > 0.01) {
    errors.push(`layeredEntry allocations must sum to 100% (got ${totalAlloc})`);
  }
  for (const [i, limit] of input.limits.entries()) {
    if (!Number.isFinite(limit.price) || limit.price <= 0) {
      errors.push(`layeredEntry.limits[${i}].price must be positive`);
    }
    if (!Number.isFinite(limit.allocationPercent) || limit.allocationPercent <= 0) {
      errors.push(`layeredEntry.limits[${i}].allocationPercent must be positive`);
    }
  }
  if (input.executionMethod === "layered_limits" && input.limits.length < 2) {
    errors.push("layered_limits requires at least 2 limits");
  }
  return errors;
}

export function authorizeLayeredEntry(input: LayeredEntryInput): LayeredEntryPlan {
  const firstLimitPrice = input.limits[0]?.price;
  return {
    executionMethod: input.executionMethod,
    limits: input.limits.map((l) => ({ ...l })),
    noChase: true,
    status: "planned",
    firstLimitPrice,
  };
}

export function applyFilledThroughIndex(
  entry: LayeredEntryPlan,
  filledThroughIndex: number
): LayeredEntryPlan {
  const limits = entry.limits.map((limit, index) => ({
    ...limit,
    filled: index <= filledThroughIndex,
  }));
  const fillPercent = limits
    .filter((l) => l.filled)
    .reduce((sum, l) => sum + l.allocationPercent, 0);

  let status: LayeredEntryStatus = "planned";
  if (filledThroughIndex < 0 || fillPercent <= 0) {
    status = "missed";
  } else if (filledThroughIndex >= limits.length - 1) {
    status = "full";
  } else {
    status = "partial";
  }

  return enrichLayeredEntryMetrics({
    ...entry,
    limits,
    status,
    fillPercent,
  });
}

export function enrichLayeredEntryMetrics(entry: LayeredEntryPlan): LayeredEntryPlan {
  const filledIndexes = entry.limits
    .map((l, i) => (l.filled ? i : -1))
    .filter((i) => i >= 0);
  const filledThroughIndex =
    filledIndexes.length > 0 ? Math.max(...filledIndexes) : entry.status === "missed" ? -1 : undefined;

  let averageEntry = entry.averageEntry;
  let fillPercent = entry.fillPercent;
  let entryImprovementVsFirst = entry.entryImprovementVsFirst;
  const firstLimitPrice = entry.firstLimitPrice ?? entry.limits[0]?.price;

  if (filledThroughIndex !== undefined && filledThroughIndex >= 0) {
    averageEntry = computeLayeredAverageEntry(entry.limits, filledThroughIndex);
    fillPercent = entry.limits
      .slice(0, filledThroughIndex + 1)
      .reduce((sum, l) => sum + l.allocationPercent, 0);
  } else if (entry.status === "missed") {
    averageEntry = undefined;
    fillPercent = 0;
    entryImprovementVsFirst = undefined;
  }

  if (
    averageEntry !== undefined &&
    firstLimitPrice !== undefined &&
    Number.isFinite(firstLimitPrice)
  ) {
    entryImprovementVsFirst = firstLimitPrice - averageEntry;
  }

  return {
    ...entry,
    firstLimitPrice,
    averageEntry,
    fillPercent,
    entryImprovementVsFirst,
  };
}

export function buildLayeredEntryScenarios(limits: LayeredEntryLimit[]): LayeredEntryScenario[] {
  if (limits.length === 0) return [];
  const scenarios: LayeredEntryScenario[] = [];
  for (let i = 0; i < limits.length; i++) {
    const capitalPercent = limits
      .slice(0, i + 1)
      .reduce((sum, l) => sum + l.allocationPercent, 0);
    scenarios.push({
      label:
        i === 0
          ? "Only L1 fills"
          : i === limits.length - 1
            ? "All limits fill"
            : `L1–L${i + 1} fill`,
      limitsFilled: i + 1,
      capitalPercent,
      averageEntry: computeLayeredAverageEntry(limits, i),
    });
  }
  scenarios.push({
    label: "None fill — no chase",
    limitsFilled: 0,
    capitalPercent: 0,
    averageEntry: 0,
  });
  return scenarios;
}

export function validateLayeredEntryTransition(
  from: LayeredEntryStatus,
  to: LayeredEntryStatus
): string | null {
  if (from === to) return null;
  if (!VALID_TRANSITIONS[from].includes(to)) {
    return `Layered entry cannot transition from ${from} to ${to}.`;
  }
  return null;
}

export function applyLayeredEntryUpdate(
  plan: TradePlan,
  input: LayeredEntryUpdateInput
): { plan?: TradePlan; errors?: string[] } {
  if (!plan.layeredEntry) {
    return { errors: ["No layered entry on this scout."] };
  }

  const now = new Date().toISOString();
  let entry = { ...plan.layeredEntry, limits: plan.layeredEntry.limits.map((l) => ({ ...l })) };

  if (input.filledThroughIndex !== undefined) {
    entry = applyFilledThroughIndex(entry, input.filledThroughIndex);
  } else if (input.status === "missed") {
    entry = enrichLayeredEntryMetrics({
      ...entry,
      status: "missed",
      limits: entry.limits.map((l) => ({ ...l, filled: false })),
      fillPercent: 0,
      averageEntry: undefined,
      entryImprovementVsFirst: undefined,
    });
  } else if (input.status) {
    const transitionError = validateLayeredEntryTransition(entry.status, input.status);
    if (transitionError) return { errors: [transitionError] };
    entry = enrichLayeredEntryMetrics({ ...entry, status: input.status });
  } else {
    return { errors: ["filledThroughIndex or status required."] };
  }

  return {
    plan: {
      ...plan,
      layeredEntry: entry,
      executionMethod: entry.executionMethod,
      updatedAt: now,
    },
  };
}

export function formatLayeredEntrySummary(entry: LayeredEntryPlan): string {
  const filled = entry.limits.filter((l) => l.filled).length;
  const total = entry.limits.length;
  const parts = [
    `${entry.executionMethod.replace(/_/g, " ")}`,
    `${filled}/${total} limits`,
  ];
  if (entry.fillPercent !== undefined) parts.push(`${entry.fillPercent}% capital`);
  if (entry.averageEntry !== undefined) parts.push(`avg $${entry.averageEntry.toFixed(2)}`);
  return parts.join(" · ");
}

export function getHighestLimitPrice(entry: LayeredEntryPlan): number | undefined {
  if (entry.limits.length === 0) return undefined;
  return Math.max(...entry.limits.map((l) => l.price));
}

export function getExecutionExperimentContext(playbook?: Playbook): {
  noChaseRule?: string;
  hypothesis?: string;
  metrics?: string[];
} | null {
  const exp = playbook?.executionExperiments;
  if (!exp) return null;
  return {
    noChaseRule: exp.noChaseRule,
    hypothesis: exp.layeredEntryHypothesis,
    metrics: exp.metrics,
  };
}

export { formatLayeredEntrySection } from "./layered-entry-types";
