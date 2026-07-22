import type { TradePlan } from "./plan-types";
import { computePlannedRR, resolvePlannedRRFromPlan } from "./plan-risk";
import {
  buildLayeredEntryScenarios,
  getHighestLimitPrice,
  projectFillStates,
  type LayeredEntryScenario,
} from "./layered-entry";
import type { LayeredEntryPlan } from "./layered-entry-types";
import { LAYER_ROLE_LABELS } from "./layered-entry-types";
import type { LayeredFillStateProjection } from "./layered-entry-risk";
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
  /** R:R from plan entry + strategy stop + target — never structural invalidation */
  plannedRR?: number;
  minRR?: number;
  invalidation?: string;
  window?: string;
  layeredEntry?: {
    plan: LayeredEntryPlan;
    scenarios: LayeredEntryScenario[];
    highestLimit?: number;
    /** R:R at each scenario when stop/target known */
    scenarioRR?: Array<{ label: string; rr?: number }>;
    fillStates?: LayeredFillStateProjection[];
    sizingModeLabel?: string;
    stopModelLabel?: string;
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

function allocLabel(plan: LayeredEntryPlan, percent: number): string {
  const mode = plan.sizingMode ?? "position_percent";
  return mode === "risk_percent" ? `${percent}% risk` : `${percent}% position`;
}

function buildRowsFromPlan(plan: TradePlan): PlanLevelRow[] {
  const rows: PlanLevelRow[] = [];

  if (plan.targetPrice !== undefined || plan.layeredEntry?.primaryTargetPrice !== undefined) {
    rows.push({
      kind: "target",
      label: "Primary target",
      value: formatPrice(plan.layeredEntry?.primaryTargetPrice ?? plan.targetPrice),
      emphasis: "success",
    });
  }

  if (plan.layeredEntry?.authorizedRiskAmount !== undefined) {
    rows.push({
      kind: "entry",
      label: "Authorized risk",
      value: `$${plan.layeredEntry.authorizedRiskAmount.toFixed(0)}`,
      detail: `Sizing: ${plan.layeredEntry.sizingMode ?? "position_percent"} · Stop: ${plan.layeredEntry.stopModel ?? "common"}`,
      emphasis: "muted",
    });
  }

  if (plan.layeredEntry?.limits.length) {
    for (const [index, limit] of plan.layeredEntry.limits.entries()) {
      const filled = limit.filled ? " · filled" : "";
      const role = limit.role ? LAYER_ROLE_LABELS[limit.role] : `Limit ${index + 1}`;
      const rr = limit.derived?.rr;
      const risk$ = limit.derived?.plannedRiskAmount;
      const stop = limit.stopPrice ?? plan.layeredEntry.commonStopPrice ?? plan.stopPrice;
      rows.push({
        kind: "limit",
        label: role,
        value: formatPrice(limit.price),
        detail: [
          allocLabel(plan.layeredEntry, limit.allocationPercent),
          stop !== undefined ? `stop ${formatPrice(stop)}` : null,
          rr !== undefined ? `${rr.toFixed(2)}R` : null,
          risk$ !== undefined ? `risk $${risk$.toFixed(0)}` : null,
          limit.confidence ? limit.confidence : null,
          filled.trim() || null,
        ]
          .filter(Boolean)
          .join(" · "),
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

  if (plan.stopPrice !== undefined || plan.layeredEntry?.commonStopPrice !== undefined) {
    rows.push({
      kind: "stop",
      label:
        (plan.layeredEntry?.stopModel ?? "common") === "common"
          ? "Common stop"
          : "Strategy stop",
      value: formatPrice(plan.layeredEntry?.commonStopPrice ?? plan.stopPrice),
      detail: "Human/AI structural proposal — used for planned R:R",
      emphasis: "danger",
    });
  }

  return rows;
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

  const plannedRR = plan ? resolvePlannedRRFromPlan(plan) : undefined;

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

    let fillStates: LayeredFillStateProjection[] | undefined;
    const le = plan.layeredEntry;
    if (
      le.authorizedRiskAmount !== undefined &&
      (le.primaryTargetPrice ?? plan.targetPrice) !== undefined &&
      (le.commonStopPrice ?? plan.stopPrice) !== undefined
    ) {
      fillStates = projectFillStates({
        limits: le.limits,
        primaryTargetPrice: le.primaryTargetPrice ?? plan.targetPrice!,
        authorizedRiskAmount: le.authorizedRiskAmount,
        stopModel: le.stopModel ?? "common",
        commonStopPrice: le.commonStopPrice ?? plan.stopPrice,
        sizingMode: le.sizingMode ?? "position_percent",
        noChase: true,
      });
    }

    layeredEntry = {
      plan: plan.layeredEntry,
      scenarios,
      highestLimit: getHighestLimitPrice(plan.layeredEntry),
      scenarioRR,
      fillStates,
      sizingModeLabel: le.sizingMode ?? "position_percent",
      stopModelLabel: le.stopModel ?? "common",
    };
  }

  return {
    ticker: thesis.ticker,
    strategy,
    source,
    rows,
    plannedRR,
    minRR: thesis.riskRules.minimumRR,
    invalidation: thesis.riskRules.invalidation,
    window,
    layeredEntry,
  };
}
