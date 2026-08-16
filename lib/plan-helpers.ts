import type { TradePlan } from "./plan-types";

export function planNeedsStrategyReview(plan: TradePlan): boolean {
  return (
    (plan.status === "failed" ||
      plan.status === "expired" ||
      plan.status === "skipped") &&
    !plan.outcome?.recordedAt
  );
}

/** Outcome persisted but LO/OBS sync incomplete — repair only; do not reopen evaluate_expired_plan. */
export function planNeedsLearningSyncRepair(plan: TradePlan): boolean {
  return (
    Boolean(plan.outcome?.recordedAt) &&
    (plan.outcome?.learningSyncStatus === "pending" ||
      plan.outcome?.learningSyncStatus === "failed")
  );
}

/**
 * War-ready Scout: live tactical window for the Case / allocation “go to war” menus.
 * Canonical War Menu predicate (PROMPT 15-06): watching|ready AND no outcome.recordedAt.
 * Closed outcomes (missed_opportunity, UPL, etc.) are learning archive — not war ammo.
 * Stock File stays active; a new Scout Plan can open a future battle on the same ticker.
 */
export function isWarReadyScoutPlan(plan: TradePlan): boolean {
  return (
    (plan.status === "watching" || plan.status === "ready") &&
    !plan.outcome?.recordedAt
  );
}

/** Scout window has a recorded terminal outcome — keep data; exclude from war menus. */
export function isClosedScoutLearningUnit(plan: TradePlan): boolean {
  return Boolean(plan.outcome?.recordedAt);
}

export function countActivePlans(plans: TradePlan[]): number {
  return plans.filter(isWarReadyScoutPlan).length;
}

export function countPlansNeedingReview(plans: TradePlan[]): number {
  return plans.filter(planNeedsStrategyReview).length;
}

export function buildPlanEnterHref(plan: TradePlan): string {
  const params = new URLSearchParams();
  params.set("plan", plan.id);
  if (plan.stockThesisId) params.set("thesis", plan.stockThesisId);
  return `/planning?${params.toString()}`;
}
