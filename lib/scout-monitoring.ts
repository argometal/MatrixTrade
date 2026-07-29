import type { CapitalReservation } from "./capital-types";
import type { TradePlan } from "./plan-types";
import {
  evaluateScoutOperationalState,
  formatOperationalActionLabel,
  formatOperationalStateLabel,
  type ScoutMonitoringAlert,
  type ScoutOperationalEvaluation,
} from "./scout-operational-state";
import type { Trade } from "./types";

export type ScoutMonitoringItem = {
  planId: string;
  ticker: string;
  detectedState: string;
  confirmedState: string;
  nextAction: string;
  reason: string;
  lastReviewed: string;
  href: string;
  alerts: ScoutMonitoringAlert[];
};

export type ScoutMonitoringSections = {
  actionNow: ScoutMonitoringItem[];
  needsReview: ScoutMonitoringItem[];
  waiting: ScoutMonitoringItem[];
  lowProbability: ScoutMonitoringItem[];
};

export function buildScoutMonitoringSections(input: {
  plans: TradePlan[];
  trades: Trade[];
  reservations: CapitalReservation[];
  now?: string;
}): ScoutMonitoringSections {
  const now = input.now ?? new Date().toISOString();
  const sections: ScoutMonitoringSections = {
    actionNow: [],
    needsReview: [],
    waiting: [],
    lowProbability: [],
  };

  for (const plan of input.plans) {
    const evaluation: ScoutOperationalEvaluation = evaluateScoutOperationalState({
      plan,
      linkedTrades: input.trades.filter(
        (trade) => trade.planId === plan.id || trade.id === plan.linkedTradeId
      ),
      reservations: input.reservations.filter((r) => r.planId === plan.id),
      now,
      minimumRR: 3,
    });
    const item: ScoutMonitoringItem = {
      planId: plan.id,
      ticker: plan.ticker,
      detectedState: formatOperationalStateLabel(
        evaluation.detectedAssessment.operationalState
      ),
      confirmedState: evaluation.confirmedAssessment
        ? formatOperationalStateLabel(
            evaluation.confirmedAssessment.operationalState
          )
        : "none",
      nextAction: formatOperationalActionLabel(
        evaluation.detectedAssessment.nextAction
      ),
      reason:
        evaluation.detectedAssessment.reasonCodes[0]?.replace(/_/g, " ") ??
        "review",
      lastReviewed:
        evaluation.confirmedAssessment?.confirmedAt?.slice(0, 10) ??
        plan.updatedAt.slice(0, 10),
      href: `/planning?plan=${plan.id}`,
      alerts: evaluation.alerts,
    };

    const state = evaluation.detectedAssessment.operationalState;
    if (
      state === "armed" ||
      state === "in_zone" ||
      state === "approaching"
    ) {
      sections.actionNow.push(item);
    } else if (
      state === "missed" ||
      state === "stale" ||
      state === "expired" ||
      state === "needs_reanalysis" ||
      evaluation.mismatch
    ) {
      sections.needsReview.push(item);
    } else if (state === "distant" || evaluation.detectedAssessment.waitHorizon !== "unknown") {
      sections.waiting.push(item);
    } else if (state === "improbable") {
      sections.lowProbability.push(item);
    }
  }

  return sections;
}
