import { isWarReadyScoutPlan } from "./plan-helpers";
import type { TradePlan } from "./plan-types";
import {
  isActiveStockThesisStatus,
  type StockThesis,
} from "./stock-thesis-types";

/**
 * One selectable Scout Case = one war-ready plan (tactical window).
 * Membership matches Dashboard `active_plans` / `countActivePlans`
 * (`isWarReadyScoutPlan`). Same ticker or Stock File may yield multiple cases.
 */
export type ScoutWarCaseRef = {
  /** Case selector key — always the plan id. */
  key: string;
  plan: TradePlan;
  thesis: StockThesis;
};

/**
 * Canonical Case list for Scout desk Open Scout selector.
 * Does not invent a second universe — filters with `isWarReadyScoutPlan` only,
 * scoped to active Stock Files (inactive theses stay off the war desk).
 */
export function listScoutWarCases(
  plans: TradePlan[],
  stockTheses: StockThesis[]
): ScoutWarCaseRef[] {
  const activeById = new Map(
    stockTheses
      .filter((t) => isActiveStockThesisStatus(t.status))
      .map((t) => [t.id, t] as const)
  );

  const cases: ScoutWarCaseRef[] = [];
  for (const plan of plans) {
    if (!isWarReadyScoutPlan(plan)) continue;
    const thesisId = plan.stockThesisId;
    if (!thesisId) continue;
    const thesis = activeById.get(thesisId);
    if (!thesis) continue;
    cases.push({ key: plan.id, plan, thesis });
  }
  return cases;
}
