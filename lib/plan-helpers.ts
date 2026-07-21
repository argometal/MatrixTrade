import type { TradePlan } from "./plan-types";

export function planNeedsStrategyReview(plan: TradePlan): boolean {
  return (
    (plan.status === "failed" ||
      plan.status === "expired" ||
      plan.status === "skipped") &&
    !plan.outcome?.recordedAt
  );
}

export function countActivePlans(plans: TradePlan[]): number {
  return plans.filter((p) => p.status === "watching" || p.status === "ready").length;
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
