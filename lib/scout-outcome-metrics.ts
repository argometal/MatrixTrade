/**
 * Scout-only outcome metrics — never mix with trade P/L / win rate / monthly loss.
 * Recompute from Learning Outcomes; filter excludedFromMetrics / duplicate_creation.
 */

import type { LearningOutcome } from "./learning-outcome-types";
import { learningOutcomeExcludedFromMetrics } from "./learning-outcome-types";

export type ScoutOutcomeMetrics = {
  evaluatedScoutCount: number;
  unexecutedPlanLossCount: number;
  missedOpportunityCount: number;
  cancelledScoutCount: number;
  expiredScoutCount: number;
  monitoringFailureCount: number;
  counterfactualRTotal: number;
  counterfactualDollarResultTotal: number;
  /** Trade contamination guards — always 0 from this aggregator. */
  tradeCountDelta: number;
  executedLossCountDelta: number;
};

export function aggregateScoutOutcomeMetrics(
  outcomes: LearningOutcome[]
): ScoutOutcomeMetrics {
  const metrics: ScoutOutcomeMetrics = {
    evaluatedScoutCount: 0,
    unexecutedPlanLossCount: 0,
    missedOpportunityCount: 0,
    cancelledScoutCount: 0,
    expiredScoutCount: 0,
    monitoringFailureCount: 0,
    counterfactualRTotal: 0,
    counterfactualDollarResultTotal: 0,
    tradeCountDelta: 0,
    executedLossCountDelta: 0,
  };

  for (const lo of outcomes) {
    if (learningOutcomeExcludedFromMetrics(lo)) continue;
    // Executed trades are not Scout evaluation rows for these counters
    if (lo.kind === "executed_win" || lo.kind === "executed_loss") continue;

    metrics.evaluatedScoutCount += 1;

    if (lo.kind === "unexecuted_plan_loss") metrics.unexecutedPlanLossCount += 1;
    if (lo.kind === "missed_opportunity") metrics.missedOpportunityCount += 1;
    if (lo.kind === "cancelled") metrics.cancelledScoutCount += 1;
    if (lo.kind === "expired") metrics.expiredScoutCount += 1;
    if (lo.nonExecutionReason === "monitoring_failure") {
      metrics.monitoringFailureCount += 1;
    }
    if (lo.counterfactualR !== undefined && Number.isFinite(lo.counterfactualR)) {
      metrics.counterfactualRTotal += lo.counterfactualR;
    }
    if (
      lo.counterfactualDollarResult !== undefined &&
      Number.isFinite(lo.counterfactualDollarResult)
    ) {
      metrics.counterfactualDollarResultTotal += lo.counterfactualDollarResult;
    }
  }

  metrics.counterfactualRTotal =
    Math.round(metrics.counterfactualRTotal * 10000) / 10000;
  metrics.counterfactualDollarResultTotal =
    Math.round(metrics.counterfactualDollarResultTotal * 100) / 100;

  return metrics;
}
