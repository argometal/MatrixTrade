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
  /** Optional last/reference price for the trade map — never invent. */
  currentPrice?: number;
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

/** Visual trade-map node — derived from PlanLevelsView (no parallel data model). */
export type TradeMapTone =
  | "target"
  | "stretch"
  | "entry"
  | "preferred"
  | "deep"
  | "stop"
  | "current";

export type TradeMapNode = {
  kind: "target" | "entry" | "stop" | "current";
  label: string;
  price: number;
  allocationPercent?: number;
  rr?: number;
  tone: TradeMapTone;
  ariaLabel: string;
};

export type TradeMapIntentStep = {
  label: string;
  tone: TradeMapTone | "intent";
};

function parsePriceFromValue(value: string): number | undefined {
  const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

function toneForEntryLabel(label: string): TradeMapTone {
  const lower = label.toLowerCase();
  if (lower.includes("preferred")) return "preferred";
  if (lower.includes("deep")) return "deep";
  if (lower.includes("starter")) return "entry";
  return "entry";
}

/** Derive proportional ladder nodes from existing PlanLevelsView fields. */
export function deriveTradeMapNodes(view: PlanLevelsView): TradeMapNode[] {
  const nodes: TradeMapNode[] = [];
  const le = view.layeredEntry?.plan;

  const targetRows = view.rows.filter((r) => r.kind === "target");
  if (le?.primaryTargetPrice !== undefined) {
    nodes.push({
      kind: "target",
      label: "Primary Target",
      price: le.primaryTargetPrice,
      tone: "target",
      ariaLabel: `Primary target ${le.primaryTargetPrice}`,
    });
  } else if (targetRows.length) {
    for (const [i, row] of targetRows.entries()) {
      const prices = [...row.value.matchAll(/\$?(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
      if (prices.length > 1) {
        prices.forEach((price, j) => {
          nodes.push({
            kind: "target",
            label: j === 0 ? "Primary Target" : `Stretch Target`,
            price,
            tone: j === 0 ? "target" : "stretch",
            ariaLabel: `${j === 0 ? "Primary" : "Stretch"} target ${price}`,
          });
        });
      } else {
        const price = parsePriceFromValue(row.value);
        if (price !== undefined) {
          nodes.push({
            kind: "target",
            label: i === 0 ? "Primary Target" : row.label,
            price,
            tone: i === 0 ? "target" : "stretch",
            ariaLabel: `${row.label} ${price}`,
          });
        }
      }
    }
  }

  if (le?.limits?.length) {
    for (const limit of le.limits) {
      const roleLabel = limit.role
        ? LAYER_ROLE_LABELS[limit.role]
        : "Entry";
      const tone = toneForEntryLabel(roleLabel);
      nodes.push({
        kind: "entry",
        label: roleLabel,
        price: limit.price,
        allocationPercent: limit.allocationPercent,
        rr: limit.derived?.rr,
        tone,
        ariaLabel: `${roleLabel} entry ${limit.price}`,
      });
    }
  } else {
    const entryRow = view.rows.find((r) => r.kind === "entry" || r.kind === "limit");
    if (entryRow) {
      const price = parsePriceFromValue(entryRow.value);
      if (price !== undefined) {
        nodes.push({
          kind: "entry",
          label: entryRow.label,
          price,
          tone: "entry",
          ariaLabel: `${entryRow.label} ${price}`,
        });
      }
    }
  }

  const stopPrice =
    le?.commonStopPrice ??
    (() => {
      const stopRow = view.rows.find((r) => r.kind === "stop");
      return stopRow ? parsePriceFromValue(stopRow.value) : undefined;
    })();
  if (stopPrice !== undefined) {
    nodes.push({
      kind: "stop",
      label: "Stop",
      price: stopPrice,
      tone: "stop",
      ariaLabel: `Stop ${stopPrice}`,
    });
  }

  if (view.currentPrice !== undefined && Number.isFinite(view.currentPrice)) {
    nodes.push({
      kind: "current",
      label: "Current Price",
      price: view.currentPrice,
      tone: "current",
      ariaLabel: `Current price ${view.currentPrice}`,
    });
  }

  // Deduplicate by kind+price (keep first), then sort high → low
  const seen = new Set<string>();
  const unique = nodes.filter((n) => {
    const key = `${n.kind}:${n.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.sort((a, b) => b.price - a.price);
}

export function deriveTradeMapIntent(view: PlanLevelsView): TradeMapIntentStep[] {
  const steps: TradeMapIntentStep[] = [];
  const le = view.layeredEntry?.plan;
  if (le?.limits?.length) {
    for (const limit of [...le.limits].sort((a, b) => b.price - a.price)) {
      const label = limit.role ? LAYER_ROLE_LABELS[limit.role] : "Entry";
      steps.push({ label, tone: toneForEntryLabel(label) });
    }
  } else if (view.rows.some((r) => r.kind === "entry" || r.kind === "limit")) {
    steps.push({ label: "Entry", tone: "entry" });
  }
  steps.push({ label: "Primary Target", tone: "target" });
  return steps;
}

export function deriveTradeMapWarnings(view: PlanLevelsView): string[] {
  const warnings: string[] = [];
  const nodes = deriveTradeMapNodes(view);
  const hasStop = nodes.some((n) => n.kind === "stop");
  const hasTarget = nodes.some((n) => n.kind === "target");
  const entries = nodes.filter((n) => n.kind === "entry");

  if (!hasStop) warnings.push("Missing stop");
  if (!hasTarget) warnings.push("No target");
  if (view.plannedRR !== undefined && view.minRR !== undefined && view.plannedRR < view.minRR) {
    warnings.push(`Plan below minimum R (${view.plannedRR.toFixed(1)}R < ${view.minRR}R)`);
  }
  const starter = entries.find((e) => e.label.toLowerCase().includes("starter"));
  if (starter?.allocationPercent !== undefined && starter.allocationPercent > 30) {
    warnings.push("Starter exceeds 30% allocation");
  }
  const highestEntry = entries[0]?.price;
  if (
    view.currentPrice !== undefined &&
    highestEntry !== undefined &&
    view.currentPrice > highestEntry
  ) {
    warnings.push("Current price above highest limit");
  }
  if (view.layeredEntry?.plan.noChase) {
    // informational — not a warning
  }
  return warnings;
}

/** Map price → top% within [0,100] for absolute positioning (high price = top). */
export function normalizeTradeMapY(
  price: number,
  high: number,
  low: number
): number {
  if (!(high > low)) return 50;
  const t = (high - price) / (high - low);
  return Math.min(100, Math.max(0, t * 100));
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
