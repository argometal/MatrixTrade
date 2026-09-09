import type { LearningOutcome } from "./learning-outcome-types";
import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";

/**
 * Join LO unambiguously: prefer planId;
 * else tradeId only when exactly one trade maps to this plan.
 */
export function resolveLearningOutcomeForPlan(input: {
  plan: TradePlan;
  learningOutcomes: LearningOutcome[];
  trades: Trade[];
}): LearningOutcome | null {
  const planId = input.plan.id.toUpperCase();
  const byPlan = input.learningOutcomes.filter(
    (lo) =>
      lo.planId?.toUpperCase() === planId &&
      lo.excludedFromMetrics !== true &&
      lo.kind !== "duplicate_creation"
  );
  if (byPlan.length === 1) return byPlan[0]!;
  if (byPlan.length > 1) {
    const scoutOnly = byPlan.filter((lo) => !lo.tradeId);
    if (scoutOnly.length === 1) return scoutOnly[0]!;
    return null;
  }

  const linked =
    input.plan.linkedTradeId?.toUpperCase() ??
    input.trades.find((t) => t.planId?.toUpperCase() === planId)?.id.toUpperCase();
  if (!linked) return null;

  const tradesForPlan = input.trades.filter(
    (t) => t.id.toUpperCase() === linked || t.planId?.toUpperCase() === planId
  );
  if (tradesForPlan.length !== 1) return null;

  const byTrade = input.learningOutcomes.filter(
    (lo) =>
      lo.tradeId?.toUpperCase() === tradesForPlan[0]!.id.toUpperCase() &&
      lo.excludedFromMetrics !== true
  );
  if (byTrade.length === 1) return byTrade[0]!;
  return null;
}
