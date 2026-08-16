import type { CapitalReservation } from "./capital-types";
import { planNeedsStrategyReview } from "./plan-helpers";
import type { TradePlan } from "./plan-types";
import {
  evaluateScoutOperationalState,
  formatOperationalActionLabel,
  formatOperationalStateLabel,
  type ScoutMonitoringAlert,
  type ScoutOperationalEvaluation,
  type ScoutOperationalReasonCode,
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
  /**
   * Human decision surface only (PROMPT 15-0C).
   * Geometry missing · significant mismatch · explicit human reviewRequired —
   * not market-data telemetry, calendar stale, superseded, or strategy-outcome backlog.
   */
  needsReview: ScoutMonitoringItem[];
  waiting: ScoutMonitoringItem[];
  /** Distinct low execution probability (improbable) — not cancelled/expired/passed. */
  lowProbability: ScoutMonitoringItem[];
};

/** Detection noise — alone must never create a Needs review card. */
const NEEDS_REVIEW_NOISE_REASON_CODES: ReadonlySet<ScoutOperationalReasonCode> = new Set([
  "missing_market_data",
  "missing_atr",
  "review_due",
  "plan_expired",
  "plan_superseded",
]);

function reasonCodesOf(evaluation: ScoutOperationalEvaluation): ScoutOperationalReasonCode[] {
  const confirmed = evaluation.confirmedAssessment?.reasonCodes ?? [];
  return [...evaluation.detectedAssessment.reasonCodes, ...confirmed];
}

function isNoiseOnlyReasons(codes: ScoutOperationalReasonCode[]): boolean {
  return codes.length > 0 && codes.every((code) => NEEDS_REVIEW_NOISE_REASON_CODES.has(code));
}

/**
 * True when Scout monitoring Needs review should surface a human decision.
 * Does not mutate detection — only gates the Dashboard bucket (15-0C).
 */
export function scoutNeedsHumanReview(
  plan: TradePlan,
  evaluation: ScoutOperationalEvaluation
): boolean {
  // Strategy-outcome backlog lives in Plans to evaluate / Needs attention — not here.
  if (planNeedsStrategyReview(plan)) return false;

  const confirmed = evaluation.confirmedAssessment;
  const detected = evaluation.detectedAssessment;
  const authState: ScoutOperationalState =
    confirmed?.operationalState ?? detected.operationalState;

  // Superseded → archive/history path; never reassess via Needs review.
  if (authState === "superseded" || Boolean(plan.replacedByPlanId)) return false;

  // Explicit human OA: Review 1D/1W, Reanalyze, etc.
  if (confirmed?.reviewRequired === true) return true;
  if (confirmed?.operationalState === "needs_reanalysis") return true;

  // Significant confirmed vs detected drift.
  if (evaluation.mismatch) return true;

  // Geometry / RR reanalysis that is not market-data telemetry.
  if (detected.operationalState === "needs_reanalysis") {
    const codes = reasonCodesOf(evaluation);
    if (
      codes.includes("execution_geometry_missing") ||
      codes.includes("rr_below_minimum") ||
      codes.includes("canonical_shares_missing") ||
      codes.includes("execution_readiness_not_armed")
    ) {
      return true;
    }
    if (!isNoiseOnlyReasons(codes)) return true;
  }

  // Stale / expired / missing_market_data alone (or combined as noise) → no card.
  if (authState === "stale" || authState === "expired") {
    return false;
  }

  // Detected reviewRequired without confirmed OA is often stale/expired noise.
  if (detected.reviewRequired === true && !confirmed) {
    const codes = reasonCodesOf(evaluation);
    if (isNoiseOnlyReasons(codes)) return false;
    if (
      codes.includes("execution_geometry_missing") ||
      codes.includes("rr_below_minimum")
    ) {
      return true;
    }
    return false;
  }

  return false;
}

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

  // Passed — confirmed missed / entry_passed (authoritative OA), not detection alone when
  // a conflicting confirmed state exists.
  if (state === "missed") {
    return "passed";
  }

  // Armed — authoritative executionReadiness (not an OA verdict substitute).
  if (plan.executionReadiness === "armed") {
    return "actionNow";
  }

  // Superseded is not Needs review (archive/history).
  if (state === "superseded" || Boolean(plan.replacedByPlanId)) {
    return null;
  }

  // Confirmed Unlikely is authoritative — before mismatch-driven Needs review.
  if (state === "improbable") {
    return "lowProbability";
  }

  if (scoutNeedsHumanReview(plan, evaluation)) {
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

function pickHumanFacingReason(evaluation: ScoutOperationalEvaluation): string {
  const codes = reasonCodesOf(evaluation);
  const preferred =
    codes.find((code) => !NEEDS_REVIEW_NOISE_REASON_CODES.has(code)) ?? codes[0];
  return preferred?.replace(/_/g, " ") ?? "review";
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
      reason: pickHumanFacingReason(evaluation),
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
