import type { TradePlan } from "./plan-types";
import { getConfirmedOperationalAssessment } from "./scout-operational-state";

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
 * Scout window has a recorded terminal outcome — keep data; exclude from war menus.
 * Learning / History / Insights own these rows.
 */
export function isClosedScoutLearningUnit(plan: TradePlan): boolean {
  return Boolean(plan.outcome?.recordedAt);
}

/**
 * Canonical Operational War Universe (PROMPT 16-04 / War Menu 15-06 hardened).
 *
 * Membership only — not Action vs Watch (those are derived views on this universe).
 * Does not use geometry, proximity, or readiness to decide belonging.
 *
 * Include: watching|ready and still fightable/watchable.
 * Exclude: outcome recorded, replaced/superseded, OA missed|superseded,
 *          terminal status awaiting outcome close, learning-sync repair-only.
 */
export function isWarReadyScoutPlan(plan: TradePlan): boolean {
  if (plan.status !== "watching" && plan.status !== "ready") return false;
  if (plan.outcome?.recordedAt) return false;
  if (plan.replacedByPlanId) return false;
  // Terminal statuses needing outcome close are never war-ready (status already fails above),
  // but keep the guard explicit for callers that reuse this mental model.
  if (planNeedsStrategyReview(plan)) return false;
  // Sync repair implies outcome.recordedAt — excluded above; explicit for contract clarity.
  if (planNeedsLearningSyncRepair(plan)) return false;

  const oa = getConfirmedOperationalAssessment(plan);
  if (oa?.operationalState === "missed" || oa?.operationalState === "superseded") {
    return false;
  }

  return true;
}

/** Alias — same contract as isWarReadyScoutPlan (16-04 naming). */
export function isOperationalWarPlan(plan: TradePlan): boolean {
  return isWarReadyScoutPlan(plan);
}

export function filterWarReadyScoutPlans(plans: TradePlan[]): TradePlan[] {
  return plans.filter(isWarReadyScoutPlan);
}

/** Open battles count for Dashboard / Control operational surfaces. */
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
