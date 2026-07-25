import type { AttentionItem } from "./dashboard-attention";
import { buildPlanEnterHref, planNeedsStrategyReview } from "./plan-helpers";
import { PLAN_STATUS_LABELS } from "./plan-types";
import type { TradePlan } from "./plan-types";
import type { LearningOutcome } from "./learning-outcome-types";
import type { ObservationRecord } from "./observation-types";
import {
  planNeedsLearningSyncRepair,
  reconcilePlanOutcomeLearning,
} from "./plan-outcome-learning-sync";

export function buildPlanAttentionItems(
  plans: TradePlan[],
  learningOutcomes: LearningOutcome[] = [],
  observations: ObservationRecord[] = []
): AttentionItem[] {
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

  // Repair LO/OBS sync — never reopens evaluate_expired_plan once recordedAt exists.
  const reconcile = reconcilePlanOutcomeLearning({
    plans,
    learningOutcomes,
    observations,
  });
  for (const row of reconcile.filter((r) => r.needsRepair)) {
    const plan = plans.find((p) => p.id.toUpperCase() === row.planId.toUpperCase());
    if (!plan?.outcome?.recordedAt) continue;
    const lo = learningOutcomes.find(
      (l) => l.planId?.toUpperCase() === plan.id.toUpperCase() && !l.tradeId
    );
    const obs = observations.find(
      (o) => o.planId?.toUpperCase() === plan.id.toUpperCase()
    );
    if (!planNeedsLearningSyncRepair(plan, lo, obs) && !row.needsRepair) continue;
    items.push({
      id: `plan-outcome-sync-${plan.id}`,
      label: `Retry Learning Sync · ${plan.ticker} (${plan.id})`,
      href: `/planning?plan=${plan.id}`,
      priority: 14,
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
