import type { StockThesisRiskRules } from "./stock-thesis-types";
import type { TradePlan } from "./plan-types";

export interface PlannedRRResult {
  risk: number;
  reward: number;
  rr: number;
}

export interface PlanThesisValidation {
  plannedRR?: number;
  warning?: string;
}

export function computePlannedRR(
  entry: number,
  stop: number,
  target: number
): PlannedRRResult | null {
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(target)) {
    return null;
  }
  const risk = entry - stop;
  const reward = target - entry;
  if (risk <= 0 || reward <= 0) return null;
  return { risk, reward, rr: reward / risk };
}

/** Entry price used for planned R:R — strategy levels only, never structural zones. */
export function resolvePlanEntryForRR(plan: TradePlan): number | undefined {
  if (plan.layeredEntry?.averageEntry !== undefined) {
    return plan.layeredEntry.averageEntry;
  }
  if (plan.plannedEntry !== undefined) return plan.plannedEntry;
  const limits = plan.layeredEntry?.limits;
  if (limits?.length) return limits[0].price;
  return undefined;
}

/**
 * Planned R:R from scout/trade strategy only: plan entry + plan.stopPrice + plan.targetPrice.
 * Never uses Stock File structural invalidation or zone lows as stop.
 */
export function resolvePlannedRRFromPlan(plan: TradePlan): number | undefined {
  const entry = resolvePlanEntryForRR(plan);
  const stop = plan.stopPrice;
  const target = plan.targetPrice;
  if (entry === undefined || stop === undefined || target === undefined) return undefined;
  return computePlannedRR(entry, stop, target)?.rr;
}

export function validatePlanAgainstThesis(
  levels: { entry?: number; stop?: number; target?: number },
  riskRules: StockThesisRiskRules
): PlanThesisValidation {
  const { entry, stop, target } = levels;
  if (entry === undefined || stop === undefined || target === undefined) {
    return {};
  }

  const computed = computePlannedRR(entry, stop, target);
  if (!computed) return {};

  const result: PlanThesisValidation = { plannedRR: computed.rr };
  if (computed.rr < riskRules.minimumRR) {
    result.warning = `Planned R:R ${computed.rr.toFixed(1)} is below thesis minimum ${riskRules.minimumRR}R.`;
  }
  return result;
}
