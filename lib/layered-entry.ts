import type { TradePlan } from "./plan-types";
import type { Playbook } from "./playbook-types";
import {
  computeLayeredAverageEntry,
  type EntryConfidence,
  type LayerRole,
  type LayerSizingMode,
  type LayeredEntryLimit,
  type LayeredEntryPlan,
  type LayeredEntryProposalSource,
  type LayeredEntryStatus,
  type StopModel,
} from "./layered-entry-types";
import {
  DEFAULT_RISK_BUDGET_USD,
  recomputeLayeredEntryPlan,
} from "./layered-entry-risk";

export type LayeredEntryInput = {
  executionMethod: LayeredEntryPlan["executionMethod"];
  limits: LayeredEntryLimit[];
  stopModel?: StopModel;
  commonStopPrice?: number;
  primaryTargetPrice?: number;
  authorizedRiskAmount?: number;
  currency?: "USD";
  sizingMode?: LayerSizingMode;
  cancelConditions?: string[];
  proposalSource?: LayeredEntryProposalSource;
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

const LAYER_ROLES: LayerRole[] = [
  "starter",
  "preferred",
  "preferred_pullback",
  "deep_pullback",
  "confirmation",
  "reclaim_confirmation",
  "custom",
];
const CONFIDENCES: EntryConfidence[] = ["low", "medium", "high"];

function parseLimit(raw: unknown): LayeredEntryLimit | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const price = Number(obj.price);
  const allocationPercent = Number(obj.allocationPercent ?? obj.allocation);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(allocationPercent) || allocationPercent <= 0) return null;
  const limit: LayeredEntryLimit = { price, allocationPercent };
  if (typeof obj.id === "string" && obj.id.trim()) limit.id = obj.id.trim();
  if (obj.filled === true || obj.filled === "true") limit.filled = true;
  if (obj.stopPrice !== undefined) {
    const stop = Number(obj.stopPrice);
    if (Number.isFinite(stop)) limit.stopPrice = stop;
  }
  if (typeof obj.role === "string" && LAYER_ROLES.includes(obj.role as LayerRole)) {
    limit.role = obj.role as LayerRole;
  }
  if (
    typeof obj.confidence === "string" &&
    CONFIDENCES.includes(obj.confidence as EntryConfidence)
  ) {
    limit.confidence = obj.confidence as EntryConfidence;
  }
  if (typeof obj.rationale === "string") limit.rationale = obj.rationale;
  if (typeof obj.structuralBasis === "string") limit.structuralBasis = obj.structuralBasis;
  if (typeof obj.uncertaintyNote === "string") limit.uncertaintyNote = obj.uncertaintyNote;
  if (obj.fillPrice !== undefined) {
    const fp = Number(obj.fillPrice);
    if (Number.isFinite(fp)) limit.fillPrice = fp;
  }
  if (obj.filledQuantity !== undefined) {
    const fq = Number(obj.filledQuantity);
    if (Number.isFinite(fq)) limit.filledQuantity = fq;
  }
  // Intentionally ignore client `derived` — recomputed server-side.
  return limit;
}

function parseProposalSource(raw: unknown): LayeredEntryProposalSource | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    human: obj.human === true,
    ai: obj.ai === true,
    validatedByHuman: obj.validatedByHuman === true,
  };
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

  const input: LayeredEntryInput = {
    executionMethod: method as LayeredEntryPlan["executionMethod"],
    limits,
  };

  if (obj.stopModel === "common" || obj.stopModel === "per_layer") {
    input.stopModel = obj.stopModel;
  }
  if (obj.sizingMode === "position_percent" || obj.sizingMode === "risk_percent") {
    input.sizingMode = obj.sizingMode;
  }
  if (obj.commonStopPrice !== undefined) {
    const v = Number(obj.commonStopPrice);
    if (Number.isFinite(v)) input.commonStopPrice = v;
  }
  if (obj.primaryTargetPrice !== undefined) {
    const v = Number(obj.primaryTargetPrice);
    if (Number.isFinite(v)) input.primaryTargetPrice = v;
  }
  if (obj.authorizedRiskAmount !== undefined) {
    const v = Number(obj.authorizedRiskAmount);
    if (Number.isFinite(v)) input.authorizedRiskAmount = v;
  }
  if (obj.currency === "USD") input.currency = "USD";
  if (Array.isArray(obj.cancelConditions)) {
    input.cancelConditions = obj.cancelConditions.filter((c): c is string => typeof c === "string");
  }
  const source = parseProposalSource(obj.proposalSource);
  if (source) input.proposalSource = source;

  return input;
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

export function authorizeLayeredEntry(
  input: LayeredEntryInput,
  ctx?: {
    primaryTargetPrice?: number;
    planStopPrice?: number;
    defaultRiskBudget?: number;
  }
): LayeredEntryPlan {
  const firstLimitPrice = input.limits[0]?.price;
  const hasExplicitRisk =
    input.authorizedRiskAmount !== undefined || input.sizingMode === "risk_percent";
  const stopModel = input.stopModel ?? "common";
  const sizingMode = input.sizingMode ?? "position_percent";

  const base: LayeredEntryPlan = {
    executionMethod: input.executionMethod,
    limits: input.limits.map((l) => ({ ...l })),
    noChase: true,
    status: "planned",
    firstLimitPrice,
    stopModel,
    sizingMode,
    commonStopPrice: input.commonStopPrice ?? ctx?.planStopPrice,
    primaryTargetPrice: input.primaryTargetPrice ?? ctx?.primaryTargetPrice,
    currency: input.currency ?? "USD",
    cancelConditions: input.cancelConditions,
    proposalSource: input.proposalSource,
  };

  // Do not infer authorized risk on legacy capital-split plans.
  if (hasExplicitRisk) {
    base.authorizedRiskAmount =
      input.authorizedRiskAmount ?? ctx?.defaultRiskBudget ?? DEFAULT_RISK_BUDGET_USD;
  } else if (input.authorizedRiskAmount !== undefined) {
    base.authorizedRiskAmount = input.authorizedRiskAmount;
  }

  if (
    base.primaryTargetPrice !== undefined &&
    base.authorizedRiskAmount !== undefined &&
    (base.commonStopPrice !== undefined ||
      base.stopModel === "per_layer" ||
      base.limits.some((l) => l.stopPrice !== undefined))
  ) {
    const { plan } = recomputeLayeredEntryPlan(base, {
      primaryTargetPrice: base.primaryTargetPrice,
      planStopPrice: base.commonStopPrice ?? ctx?.planStopPrice,
      authorizedRiskAmount: base.authorizedRiskAmount,
      defaultRiskBudget: ctx?.defaultRiskBudget,
    });
    return plan;
  }

  return base;
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

  let enriched: LayeredEntryPlan = {
    ...entry,
    firstLimitPrice,
    averageEntry,
    fillPercent,
    entryImprovementVsFirst,
    filled: (fillPercent ?? 0) > 0,
  };

  if (
    enriched.primaryTargetPrice !== undefined &&
    enriched.authorizedRiskAmount !== undefined &&
    (enriched.commonStopPrice !== undefined ||
      enriched.limits.some((l) => l.stopPrice !== undefined))
  ) {
    const { plan } = recomputeLayeredEntryPlan(enriched, {
      primaryTargetPrice: enriched.primaryTargetPrice,
      planStopPrice: enriched.commonStopPrice,
      authorizedRiskAmount: enriched.authorizedRiskAmount,
    });
    enriched = {
      ...plan,
      status: enriched.status,
      averageEntry,
      fillPercent,
      entryImprovementVsFirst,
      firstLimitPrice,
      filled: enriched.filled,
      limits: plan.limits.map((l, i) => ({
        ...l,
        filled: enriched.limits[i]?.filled,
        fillPrice: enriched.limits[i]?.fillPrice,
        filledQuantity: enriched.limits[i]?.filledQuantity,
      })),
    };
  }

  return enriched;
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
  if (entry.fillPercent !== undefined) parts.push(`${entry.fillPercent}% alloc`);
  if (entry.averageEntry !== undefined) parts.push(`avg $${entry.averageEntry.toFixed(2)}`);
  if (entry.authorizedRiskAmount !== undefined) {
    parts.push(`risk $${entry.authorizedRiskAmount}`);
  }
  if (entry.blendedRR !== undefined) parts.push(`${entry.blendedRR.toFixed(1)}R`);
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
export {
  DEFAULT_RISK_BUDGET_USD,
  projectFillStates,
  recomputeLayeredEntryPlan,
  validateLayeredRiskPlan,
} from "./layered-entry-risk";
