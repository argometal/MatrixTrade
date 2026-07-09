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
  params.set("ticker", plan.ticker);
  if (plan.playbookId) params.set("playbook", plan.playbookId);
  if (plan.plannedEntry !== undefined) params.set("entry", String(plan.plannedEntry));
  if (plan.stopPrice !== undefined) params.set("stop", String(plan.stopPrice));
  if (plan.targetPrice !== undefined) params.set("target", String(plan.targetPrice));
  params.set("plan", plan.id);
  return `/trades-preview?${params.toString()}`;
}
