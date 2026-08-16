import type { AttentionItem } from "./dashboard-attention";
import { planNeedsStrategyReview } from "./plan-helpers";
import { PLAN_STATUS_LABELS } from "./plan-types";
import type { TradePlan } from "./plan-types";
import type { LearningOutcome } from "./learning-outcome-types";
import type { ObservationRecord } from "./observation-types";
import {
  planNeedsLearningSyncRepair,
  reconcilePlanOutcomeLearning,
} from "./plan-outcome-learning-sync";

/**
 * Plan-derived Needs Attention (PROMPT 16-01).
 * Keep: terminal plans without outcome; persistent learning-sync failures only.
 * Removed: Enter plan (ready), plan window closing (Scout/Monitoring owns ops nags).
 */
export function buildPlanAttentionItems(
  plans: TradePlan[],
  learningOutcomes: LearningOutcome[] = [],
  observations: ObservationRecord[] = []
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const plan of plans.filter(planNeedsStrategyReview)) {
    const statusLabel = PLAN_STATUS_LABELS[plan.status];
    items.push({
      id: `plan-review-${plan.id}`,
      label: `Evaluate ${statusLabel.toLowerCase()} plan · ${plan.ticker} (${plan.id})`,
      href: `/planning?plan=${plan.id}`,
      priority: 16,
    });
  }

  // Persistent sync repair only — callers should auto-retry pending sync before this.
  // Do not frame first-pass sync as a normal human decision.
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
    // After dashboard auto-retry, only surface failed (or still-broken) sync — not fresh pending.
    if (plan.outcome.learningSyncStatus === "pending") continue;
    items.push({
      id: `plan-outcome-sync-${plan.id}`,
      label: `Learning Sync failed · ${plan.ticker} (${plan.id})`,
      href: `/planning?plan=${plan.id}`,
      priority: 14,
    });
  }

  return items;
}
