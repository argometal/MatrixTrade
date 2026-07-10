import type { StockThesisRiskRules } from "./stock-thesis-types";

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
