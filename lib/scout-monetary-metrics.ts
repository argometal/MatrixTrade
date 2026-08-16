/**
 * Scout monetary metrics — R potencial, ganancia potencial, pérdida asignada.
 * Conceptual separation: R = efficiency vs risk; USD fields are absolute money.
 */

import type { TradePlan } from "./plan-types";
import { isWarReadyScoutPlan } from "./plan-helpers";
import {
  projectFillStates,
  type LayeredFillStateProjection,
} from "./layered-entry-risk";
import type { LayeredEntryPlan } from "./layered-entry-types";

export type ScoutMonetarySortKey =
  | "potentialR"
  | "potentialProfit"
  | "assignedLoss"
  | "returnOnCapitalPercent"
  | "capitalRequired"
  | "ticker";

export type ScoutMonetaryRow = {
  ticker: string;
  planId: string;
  planLabel: string;
  entry?: number;
  target?: number;
  stop?: number;
  capitalRequired: number;
  assignedLoss: number;
  potentialProfit: number;
  potentialR?: number;
  returnOnCapitalPercent: number;
  profitPerRiskDollar?: number;
  fillScenarioLabel?: string;
};

export function formatUsdMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `USD -${formatted}` : `USD ${formatted}`;
}

export function formatPotentialR(rr?: number): string {
  if (rr === undefined || !Number.isFinite(rr)) return "—";
  const rounded = Math.round(rr * 100) / 100;
  return `${rounded.toFixed(2)}R`;
}

export function formatReturnOnCapitalPercent(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  return `${(Math.round(pct * 100) / 100).toFixed(2)}%`;
}

export function resolvePotentialR(state: LayeredFillStateProjection): number | undefined {
  return state.blendedRR ?? state.combinedRR ?? state.portfolioRR ?? state.profitPerRiskDollar;
}

/** Prefer full-fill projection; fall back to deepest partial with quantity. */
export function pickCanonicalFillState(
  states: LayeredFillStateProjection[]
): LayeredFillStateProjection | undefined {
  const withFill = states.filter((s) => s.limitsFilled > 0);
  if (withFill.length === 0) {
    return states.find((s) => s.limitsFilled === 0);
  }
  return (
    withFill.find((s) => s.label === "All limits fill") ?? withFill[withFill.length - 1]
  );
}

export function buildFillStatesForPlan(plan: TradePlan): LayeredFillStateProjection[] {
  const le = plan.layeredEntry;
  if (!le?.limits?.length) return [];
  const primaryTarget =
    le.primaryTargetPrice ?? plan.targetPrice;
  const stopModel = le.stopModel ?? "common";
  const commonStop =
    le.commonStopPrice ?? (stopModel === "common" ? plan.stopPrice : undefined);
  const authorized = le.authorizedRiskAmount;
  if (
    primaryTarget === undefined ||
    !Number.isFinite(primaryTarget) ||
    authorized === undefined ||
    !(authorized > 0)
  ) {
    return [];
  }
  if (stopModel === "common" && commonStop === undefined) return [];
  if (stopModel === "per_layer" && le.limits.some((l) => l.stopPrice === undefined && commonStop === undefined)) {
    return [];
  }
  return projectFillStates({
    limits: le.limits,
    primaryTargetPrice: primaryTarget,
    authorizedRiskAmount: authorized,
    stopModel,
    commonStopPrice: commonStop,
    sizingMode: le.sizingMode ?? "risk_percent",
    noChase: true,
  });
}

export function scoutMonetaryRowFromFillState(
  plan: TradePlan,
  state: LayeredFillStateProjection
): ScoutMonetaryRow {
  const le = plan.layeredEntry;
  return {
    ticker: plan.ticker,
    planId: plan.id,
    planLabel: plan.id,
    entry: state.limitsFilled > 0 ? state.averageEntry : undefined,
    target: le?.primaryTargetPrice ?? plan.targetPrice,
    stop: state.effectiveStop ?? le?.commonStopPrice ?? plan.stopPrice,
    capitalRequired: state.capitalDeployed,
    assignedLoss: state.assignedLoss,
    potentialProfit: state.potentialProfit,
    potentialR: resolvePotentialR(state),
    returnOnCapitalPercent: state.returnOnCapitalPercent,
    profitPerRiskDollar: state.profitPerRiskDollar,
    fillScenarioLabel: state.label,
  };
}

export function buildScoutMonetaryRow(plan: TradePlan): ScoutMonetaryRow | null {
  const states = buildFillStatesForPlan(plan);
  const canonical = pickCanonicalFillState(states);
  if (!canonical) return null;
  return scoutMonetaryRowFromFillState(plan, canonical);
}

export function buildActiveScoutMonetaryRows(plans: TradePlan[]): ScoutMonetaryRow[] {
  return plans
    .filter(isWarReadyScoutPlan)
    .map((p) => buildScoutMonetaryRow(p))
    .filter((row): row is ScoutMonetaryRow => row !== null);
}

export function compareScoutMonetaryRows(
  a: ScoutMonetaryRow,
  b: ScoutMonetaryRow,
  sortKey: ScoutMonetarySortKey,
  direction: "asc" | "desc" = "desc"
): number {
  const dir = direction === "asc" ? 1 : -1;
  const num = (x?: number) => (x !== undefined && Number.isFinite(x) ? x : null);

  let cmp = 0;
  switch (sortKey) {
    case "potentialR": {
      const av = num(a.potentialR);
      const bv = num(b.potentialR);
      if (av === null && bv === null) cmp = 0;
      else if (av === null) cmp = 1;
      else if (bv === null) cmp = -1;
      else cmp = (av - bv) * dir;
      break;
    }
    case "potentialProfit":
      cmp = (a.potentialProfit - b.potentialProfit) * dir;
      break;
    case "assignedLoss":
      cmp = (a.assignedLoss - b.assignedLoss) * dir;
      break;
    case "returnOnCapitalPercent":
      cmp = (a.returnOnCapitalPercent - b.returnOnCapitalPercent) * dir;
      break;
    case "capitalRequired":
      cmp = (a.capitalRequired - b.capitalRequired) * dir;
      break;
    case "ticker":
      cmp = a.ticker.localeCompare(b.ticker) * (direction === "asc" ? 1 : -1);
      break;
  }
  if (cmp !== 0) return cmp;
  return a.ticker.localeCompare(b.ticker) || a.planId.localeCompare(b.planId);
}

export function sortScoutMonetaryRows(
  rows: ScoutMonetaryRow[],
  sortKey: ScoutMonetarySortKey,
  direction: "asc" | "desc" = "desc"
): ScoutMonetaryRow[] {
  return [...rows].sort((a, b) => compareScoutMonetaryRows(a, b, sortKey, direction));
}

/** Compact Spanish metric block for fill scenarios / Scout panels. */
export function formatMonetaryMetricsBlock(input: {
  potentialR?: number;
  potentialProfit: number;
  assignedLoss: number;
  capitalRequired: number;
  returnOnCapitalPercent: number;
}): string[] {
  return [
    `R potencial: ${formatPotentialR(input.potentialR)}`,
    `Ganancia potencial: ${formatUsdMoney(input.potentialProfit)}`,
    `Pérdida asignada: ${formatUsdMoney(input.assignedLoss)}`,
    `Capital requerido: ${formatUsdMoney(input.capitalRequired)}`,
    `Retorno sobre capital: ${formatReturnOnCapitalPercent(input.returnOnCapitalPercent)}`,
  ];
}

export function layeredPlanHasMonetaryProjection(entry: LayeredEntryPlan | undefined): boolean {
  return Boolean(entry?.limits?.length && entry.authorizedRiskAmount && entry.primaryTargetPrice);
}
