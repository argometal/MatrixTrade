import type { TradePlan } from "./plan-types";
import { computePlannedRR } from "./plan-risk";
import {
  buildLayeredEntryScenarios,
  getHighestLimitPrice,
  type LayeredEntryScenario,
} from "./layered-entry";
import type { LayeredEntryPlan } from "./layered-entry-types";
import {
  formatStockThesisZone,
  type StockThesis,
  type StockThesisLevels,
} from "./stock-thesis-types";

export type PlanLevelRowKind =
  | "target"
  | "entry"
  | "limit"
  | "zone"
  | "support"
  | "stop"
  | "resistance";

export interface PlanLevelRow {
  kind: PlanLevelRowKind;
  label: string;
  value: string;
  detail?: string;
  emphasis?: "primary" | "danger" | "success" | "muted";
}

export interface PlanLevelsView {
  ticker: string;
  strategy: string;
  source: "plan" | "profile" | "both";
  rows: PlanLevelRow[];
  plannedRR?: number;
  /** Estimated from profile zones when no scout plan exists */
  estimatedRR?: number;
  minRR?: number;
  invalidation?: string;
  window?: string;
  layeredEntry?: {
    plan: LayeredEntryPlan;
    scenarios: LayeredEntryScenario[];
    highestLimit?: number;
    /** R:R at each scenario when stop/target known */
    scenarioRR?: Array<{ label: string; rr?: number }>;
  };
}

function formatPrice(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function buildRowsFromLevels(levels: StockThesisLevels): PlanLevelRow[] {
  const rows: PlanLevelRow[] = [];
  const targets = levels.targets ?? [];

  if (targets.length > 0) {
    rows.push({
      kind: "target",
      label: targets.length > 1 ? "Targets" : "Target",
      value: targets.map((t) => formatPrice(t)).join(" · "),
      emphasis: "success",
    });
  }

  if (levels.primaryZone) {
    rows.push({
      kind: "zone",
      label: "Primary zone",
      value: `$${levels.primaryZone.low}–$${levels.primaryZone.high}`,
      detail: "Support / entry area",
      emphasis: "primary",
    });
  }

  if (levels.secondaryZone) {
    rows.push({
      kind: "zone",
      label: "Secondary zone",
      value: `$${levels.secondaryZone.low}–$${levels.secondaryZone.high}`,
      detail: "Deeper support",
      emphasis: "muted",
    });
  }

  if (levels.majorSupport !== undefined) {
    rows.push({
      kind: "support",
      label: "Major support",
      value: formatPrice(levels.majorSupport),
    });
  }

  if (levels.majorResistance !== undefined) {
    rows.push({
      kind: "resistance",
      label: "Major resistance",
      value: formatPrice(levels.majorResistance),
      emphasis: "muted",
    });
  }

  return rows;
}

function buildRowsFromPlan(plan: TradePlan): PlanLevelRow[] {
  const rows: PlanLevelRow[] = [];

  if (plan.targetPrice !== undefined) {
    rows.push({
      kind: "target",
      label: "Target",
      value: formatPrice(plan.targetPrice),
      emphasis: "success",
    });
  }

  if (plan.layeredEntry?.limits.length) {
    for (const [index, limit] of plan.layeredEntry.limits.entries()) {
      const filled = limit.filled ? " · filled" : "";
      rows.push({
        kind: "limit",
        label: `Limit ${index + 1}`,
        value: formatPrice(limit.price),
        detail: `${limit.allocationPercent}% capital${filled}`,
        emphasis: limit.filled ? "success" : index === 0 ? "primary" : "muted",
      });
    }
  } else if (plan.plannedEntry !== undefined) {
    rows.push({
      kind: "entry",
      label: "Planned entry",
      value: formatPrice(plan.plannedEntry),
      emphasis: "primary",
    });
  }

  if (plan.supportLevel !== undefined) {
    rows.push({
      kind: "support",
      label: "Support",
      value: formatPrice(plan.supportLevel),
      detail: "Plan support level",
    });
  }

  if (plan.stopPrice !== undefined) {
    rows.push({
      kind: "stop",
      label: "Stop",
      value: formatPrice(plan.stopPrice),
      emphasis: "danger",
    });
  }

  return rows;
}

function estimateRRFromProfile(levels: StockThesisLevels): number | undefined {
  if (!levels.primaryZone || !levels.targets?.length) return undefined;
  const entry = (levels.primaryZone.low + levels.primaryZone.high) / 2;
  const stop =
    levels.secondaryZone?.low ??
    levels.majorSupport ??
    levels.primaryZone.low * 0.95;
  const target = levels.targets[0];
  const computed = computePlannedRR(entry, stop, target);
  return computed?.rr;
}

export function buildPlanLevelsView(
  thesis: StockThesis,
  plan?: TradePlan
): PlanLevelsView {
  const strategy =
    plan?.thesis?.trim() ||
    thesis.currentHypothesis?.trim() ||
    thesis.thesis?.trim() ||
    "—";

  const planRows = plan ? buildRowsFromPlan(plan) : [];
  const profileRows = buildRowsFromLevels(thesis.levels);

  let rows: PlanLevelRow[];
  let source: PlanLevelsView["source"];

  if (planRows.length > 0) {
    rows = planRows;
    if (!rows.some((r) => r.kind === "zone") && thesis.levels.primaryZone) {
      rows.splice(
        rows.findIndex((r) => r.kind === "entry") >= 0
          ? rows.findIndex((r) => r.kind === "entry") + 1
          : 1,
        0,
        {
          kind: "zone",
          label: "Primary zone",
          value: formatStockThesisZone(thesis.levels.primaryZone),
          detail: "From Stock Profile",
          emphasis: "primary",
        }
      );
    }
    source = profileRows.length > 0 ? "both" : "plan";
  } else {
    rows = profileRows;
    source = "profile";
  }

  const window =
    plan?.validFrom || plan?.validUntil
      ? [
          plan.validFrom ? new Date(plan.validFrom).toLocaleDateString() : "…",
          plan.validUntil ? new Date(plan.validUntil).toLocaleDateString() : "…",
        ].join(" → ")
      : undefined;

  const estimatedRR =
    plan?.plannedRR === undefined ? estimateRRFromProfile(thesis.levels) : undefined;

  let layeredEntry: PlanLevelsView["layeredEntry"];
  if (plan?.layeredEntry) {
    const scenarios = buildLayeredEntryScenarios(plan.layeredEntry.limits);
    const scenarioRR =
      plan.stopPrice !== undefined && plan.targetPrice !== undefined
        ? scenarios
            .filter((s) => s.limitsFilled > 0)
            .map((s) => {
              const computed = computePlannedRR(s.averageEntry, plan.stopPrice!, plan.targetPrice!);
              return { label: s.label, rr: computed?.rr };
            })
        : undefined;
    layeredEntry = {
      plan: plan.layeredEntry,
      scenarios,
      highestLimit: getHighestLimitPrice(plan.layeredEntry),
      scenarioRR,
    };
  }

  return {
    ticker: thesis.ticker,
    strategy,
    source,
    rows,
    plannedRR: plan?.plannedRR,
    estimatedRR,
    minRR: thesis.riskRules.minimumRR,
    invalidation: thesis.riskRules.invalidation,
    window,
    layeredEntry,
  };
}
