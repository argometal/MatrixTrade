import type { AttentionItem } from "./dashboard-attention";
import { buildPlanEnterHref, planNeedsStrategyReview } from "./plan-helpers";
import { PLAN_STATUS_LABELS } from "./plan-types";
import type { TradePlan } from "./plan-types";

export function buildPlanAttentionItems(plans: TradePlan[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const plan of plans.filter((p) => p.status === "ready")) {
    items.push({
      id: `plan-ready-${plan.id}`,
      label: `Enter plan · ${plan.ticker} (${plan.id})`,
      href: buildPlanEnterHref(plan),
      priority: 15,
    });
  }

  for (const plan of plans.filter(planNeedsStrategyReview)) {
    const statusLabel = PLAN_STATUS_LABELS[plan.status];
    items.push({
      id: `plan-review-${plan.id}`,
      label: `Evaluate ${statusLabel.toLowerCase()} plan · ${plan.ticker} (${plan.id})`,
      href: `/planning?plan=${plan.id}`,
      priority: 16,
    });
  }

  for (const plan of plans.filter((p) => p.status === "watching" && p.validUntil)) {
    const until = Date.parse(plan.validUntil!);
    if (!Number.isFinite(until)) continue;
    const hoursLeft = (until - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft > 0 && hoursLeft <= 48) {
      items.push({
        id: `plan-window-${plan.id}`,
        label: `Plan window closing · ${plan.ticker} (${plan.id})`,
        href: `/planning?plan=${plan.id}`,
        priority: 17,
      });
    }
  }

  return items;
}
