import type { CapitalReservation } from "./capital-types";
import type { TradePlan } from "./plan-types";
import {
  evaluateScoutOperationalState,
  formatOperationalActionLabel,
  formatOperationalStateLabel,
  type ScoutMonitoringAlert,
  type ScoutOperationalEvaluation,
  type ScoutOperationalState,
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
  /** Entry opportunity already passed (confirmed missed / entry_passed). */
  passed: ScoutMonitoringItem[];
  actionNow: ScoutMonitoringItem[];
  /** Active review intervals + reanalysis + mismatch. */
  needsReview: ScoutMonitoringItem[];
  waiting: ScoutMonitoringItem[];
  /** Distinct low execution probability (improbable) — not cancelled/expired/passed. */
  lowProbability: ScoutMonitoringItem[];
};

/**
 * Authoritative filter state for monitoring buckets.
 * Prefers confirmed manual/human operationalAssessment when present;
 * Armed is driven by plan.executionReadiness.
 */
export function resolveScoutMonitoringBucket(
  plan: TradePlan,
  evaluation: ScoutOperationalEvaluation
): keyof ScoutMonitoringSections | null {
  const confirmed = evaluation.confirmedAssessment;
  const detected = evaluation.detectedAssessment;
  const state: ScoutOperationalState =
    confirmed?.operationalState ?? detected.operationalState;
  const authWaitHorizon = confirmed?.waitHorizon ?? detected.waitHorizon;
  const reviewRequired =
    confirmed?.reviewRequired === true || detected.reviewRequired === true;
  // Passed — confirmed missed / entry_passed (authoritative OA), not detection alone when
  // a conflicting confirmed state exists.
  if (state === "missed") {
    return "passed";
  }

  // Armed — authoritative executionReadiness (not an OA verdict substitute).
  if (plan.executionReadiness === "armed") {
    return "actionNow";
  }

  if (
    state === "needs_reanalysis" ||
    state === "stale" ||
    state === "expired" ||
    reviewRequired
  ) {
    return "needsReview";
  }

  // Distinct low-probability bucket before mismatch routing — confirmed Unlikely
  // must not be swallowed by detected/confirmed drift into needsReview.
  if (state === "improbable") {
    return "lowProbability";
  }

  if (evaluation.mismatch) {
    return "needsReview";
  }
  if (
    state === "armed" ||
    state === "in_zone" ||
    (state === "approaching" && confirmed?.reviewRequired !== true)
  ) {
    return "actionNow";
  }
  if (state === "distant" || authWaitHorizon !== "unknown") {
    return "waiting";
  }
  return null;
}

export function buildScoutMonitoringSections(input: {
  plans: TradePlan[];
  trades: Trade[];
  reservations: CapitalReservation[];
  now?: string;
}): ScoutMonitoringSections {
  const now = input.now ?? new Date().toISOString();
  const sections: ScoutMonitoringSections = {
    passed: [],
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
    const auth = evaluation.confirmedAssessment ?? evaluation.detectedAssessment;
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
      nextAction: formatOperationalActionLabel(auth.nextAction),
      reason: auth.reasonCodes[0]?.replace(/_/g, " ") ?? "review",
      lastReviewed:
        evaluation.confirmedAssessment?.confirmedAt?.slice(0, 10) ??
        plan.updatedAt.slice(0, 10),
      href: `/planning?plan=${plan.id}`,
      alerts: evaluation.alerts,
    };

    const bucket = resolveScoutMonitoringBucket(plan, evaluation);
    if (bucket) sections[bucket].push(item);
  }

  return sections;
}
