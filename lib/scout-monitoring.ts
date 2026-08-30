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
  /** Human primary line for Dashboard cards (PROMPT 16-03). */
  headline: string;
  /** Secondary human line — reason / horizon, not raw code dump. */
  detail: string;
  /** Traceability: Detected · Confirmed (title / a11y, not card chrome). */
  traceLine: string;
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
  /**
   * Concrete act-now Scouts only (PROMPT 16-03):
   * armed readiness / armed OA / price in entry zone.
   * Not approaching (that is vigilance → Waiting).
   */
  actionNow: ScoutMonitoringItem[];
  /**
   * Human decision surface only (PROMPT 15-0C).
   * Geometry missing · significant mismatch · explicit human reviewRequired —
   * not market-data telemetry, calendar stale, superseded, or strategy-outcome backlog.
   */
  needsReview: ScoutMonitoringItem[];
  /**
   * Near-term vigilance only (PROMPT 16-03): approaching without a human review gate.
   * Distant / month+ / generic wait-horizon leftovers stay off Dashboard (Scout Desk owns them).
   */
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

function authoritativeState(
  evaluation: ScoutOperationalEvaluation
): ScoutOperationalState {
  return (
    evaluation.confirmedAssessment?.operationalState ??
    evaluation.detectedAssessment.operationalState
  );
}

/**
 * Concrete reason to act on Dashboard Action now (16-03).
 * Does not change OA detection — bucket gate only.
 */
export function scoutHasActionNowReason(
  plan: TradePlan,
  evaluation: ScoutOperationalEvaluation
): boolean {
  if (plan.executionReadiness === "armed") return true;
  const state = authoritativeState(evaluation);
  if (state === "armed" || state === "in_zone") return true;
  const auth = evaluation.confirmedAssessment ?? evaluation.detectedAssessment;
  // Confirmed prepare/act with waitHorizon now (without being a review gate).
  if (
    (auth.nextAction === "act" || auth.nextAction === "prepare") &&
    auth.waitHorizon === "now" &&
    auth.reviewRequired !== true
  ) {
    return true;
  }
  return false;
}

/**
 * Near-term vigilance for Dashboard Waiting (16-03).
 * Approaching only — not every distant / wait-horizon plan.
 * Confirmed approaching (without reviewRequired) counts even when Dashboard
 * lacks live prices (avoids dumping those into Needs review via mismatch noise).
 */
export function scoutIsNearTermWaiting(
  plan: TradePlan,
  evaluation: ScoutOperationalEvaluation
): boolean {
  if (scoutHasActionNowReason(plan, evaluation)) return false;
  const confirmed = evaluation.confirmedAssessment;
  if (confirmed?.operationalState === "approaching" && confirmed.reviewRequired !== true) {
    return true;
  }
  if (scoutNeedsHumanReview(plan, evaluation)) return false;
  const state = authoritativeState(evaluation);
  return state === "approaching";
}

/**
 * Authoritative filter state for monitoring buckets.
 * Prefers confirmed manual/human operationalAssessment when present;
 * Armed is driven by plan.executionReadiness.
 *
 * PROMPT 16-03 — Action now / Waiting are Dashboard signals, not full Scout Desk mirrors.
 */
export function resolveScoutMonitoringBucket(
  plan: TradePlan,
  evaluation: ScoutOperationalEvaluation
): keyof ScoutMonitoringSections | null {
  const confirmed = evaluation.confirmedAssessment;
  const state = authoritativeState(evaluation);

  // Passed — confirmed missed / entry_passed (authoritative OA), not detection alone when
  // a conflicting confirmed state exists.
  if (state === "missed") {
    return "passed";
  }

  // Armed readiness is authoritative Action now — before Needs review (31-3C / prior contract).
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

  // Concrete act/prepare now before Needs review (confirmed in_zone must not become review via price-less mismatch).
  if (scoutHasActionNowReason(plan, evaluation)) {
    return "actionNow";
  }

  // Confirmed approaching without review gate → Waiting (vigilance), not Action now.
  // Runs before Needs review so missing live price on Dashboard does not reclassify as review.
  if (
    confirmed?.operationalState === "approaching" &&
    confirmed.reviewRequired !== true
  ) {
    return "waiting";
  }

  // Confirmed distant / long horizon — Scout Desk owns; do not surface as Needs review via price-less mismatch.
  if (
    confirmed &&
    confirmed.reviewRequired !== true &&
    (confirmed.operationalState === "distant" ||
      confirmed.waitHorizon === "month" ||
      confirmed.waitHorizon === "quarter")
  ) {
    return null;
  }

  if (scoutNeedsHumanReview(plan, evaluation)) {
    return "needsReview";
  }

  // Waiting — detected approaching (when live distance is available).
  if (scoutIsNearTermWaiting(plan, evaluation)) {
    return "waiting";
  }

  // Distant / unknown / unassessed / stale leftovers → Scout Desk, not Dashboard.
  return null;
}

function pickHumanFacingReason(
  evaluation: ScoutOperationalEvaluation,
  opts?: { preferConfirmed?: boolean }
): string {
  const confirmed = evaluation.confirmedAssessment?.reasonCodes ?? [];
  const detected = evaluation.detectedAssessment.reasonCodes;
  const codes = opts?.preferConfirmed
    ? [...confirmed, ...detected]
    : [...detected, ...confirmed];
  const preferred =
    codes.find(
      (code) =>
        !NEEDS_REVIEW_NOISE_REASON_CODES.has(code) &&
        code !== "confirmed_detected_mismatch"
    ) ??
    codes.find((code) => !NEEDS_REVIEW_NOISE_REASON_CODES.has(code)) ??
    codes[0];
  return preferred?.replace(/_/g, " ") ?? "review";
}

function humanizeReasonPhrase(reason: string): string {
  return reason
    .replace(/\bentry reached no fill history\b/i, "entry touched without a fill")
    .replace(/\bentry passed without execution\b/i, "entry already gone")
    .replace(/\bprice inside entry zone\b/i, "price inside entry zone")
    .replace(/\bexecution readiness armed\b/i, "execution armed")
    .replace(/\bexecution geometry missing\b/i, "entry/stop/target incomplete")
    .replace(/\brr below minimum\b/i, "R:R below minimum")
    .replace(/\bdistance days band\b/i, "days away")
    .replace(/\bdistance weeks band\b/i, "weeks away")
    .replace(/\bdistance month band\b/i, "about a month away")
    .replace(/\bdistance quarter band\b/i, "quarter away")
    .replace(/\bdistance improbable\b/i, "too far for this plan")
    .replace(/\bconfirmed detected mismatch\b/i, "confirmed vs detected mismatch")
    .replace(/\bcanonical shares missing\b/i, "share count missing");
}

/**
 * Presentation-only headline for Dashboard Scout cards (16-03).
 * Derived from existing fields — never persisted.
 */
export function formatScoutMonitoringHeadline(
  bucket: keyof ScoutMonitoringSections,
  evaluation: ScoutOperationalEvaluation,
  plan: TradePlan
): string {
  const auth = evaluation.confirmedAssessment ?? evaluation.detectedAssessment;
  const state = auth.operationalState;
  const action = formatOperationalActionLabel(auth.nextAction);

  if (bucket === "passed") return "Entry already gone";
  if (bucket === "lowProbability") return "Unlikely from here";
  if (bucket === "needsReview") {
    if (auth.reviewRequired) return "Needs your review";
    if (state === "needs_reanalysis") return "Needs reanalysis";
    if (evaluation.mismatch) return "Confirmed vs detected disagree";
    return "Needs your review";
  }
  if (bucket === "actionNow") {
    if (plan.executionReadiness === "armed" || state === "armed") {
      return "Armed — act now";
    }
    if (state === "in_zone") return "In zone — prepare entry";
    if (auth.nextAction === "act") return "Act now";
    if (auth.nextAction === "prepare") return "Prepare entry";
    return `Ready — ${action}`;
  }
  if (bucket === "waiting") {
    const horizon = auth.waitHorizon;
    if (horizon === "days") return "Approaching — days away";
    if (horizon === "weeks") return "Approaching — weeks away";
    return "Approaching — watch";
  }
  return formatOperationalStateLabel(state);
}

export function formatScoutMonitoringDetail(
  evaluation: ScoutOperationalEvaluation,
  lastReviewed: string,
  opts?: { preferConfirmed?: boolean }
): string {
  const reason = humanizeReasonPhrase(
    pickHumanFacingReason(evaluation, opts)
  );
  return `${reason} · reviewed ${lastReviewed}`;
}

export function formatScoutMonitoringTraceLine(
  evaluation: ScoutOperationalEvaluation
): string {
  const detected = formatOperationalStateLabel(
    evaluation.detectedAssessment.operationalState
  );
  const confirmed = evaluation.confirmedAssessment
    ? formatOperationalStateLabel(evaluation.confirmedAssessment.operationalState)
    : "none";
  const auth = evaluation.confirmedAssessment ?? evaluation.detectedAssessment;
  const action = formatOperationalActionLabel(auth.nextAction);
  return `Detected ${detected} · Confirmed ${confirmed} · ${action}`;
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
    const lastReviewed =
      evaluation.confirmedAssessment?.confirmedAt?.slice(0, 10) ??
      plan.updatedAt.slice(0, 10);
    const bucket = resolveScoutMonitoringBucket(plan, evaluation);
    if (!bucket) continue;

    const item: ScoutMonitoringItem = {
      planId: plan.id,
      ticker: plan.ticker,
      headline: formatScoutMonitoringHeadline(bucket, evaluation, plan),
      detail: formatScoutMonitoringDetail(evaluation, lastReviewed, {
        preferConfirmed: Boolean(evaluation.confirmedAssessment),
      }),
      traceLine: formatScoutMonitoringTraceLine(evaluation),
      detectedState: formatOperationalStateLabel(
        evaluation.detectedAssessment.operationalState
      ),
      confirmedState: evaluation.confirmedAssessment
        ? formatOperationalStateLabel(
            evaluation.confirmedAssessment.operationalState
          )
        : "none",
      nextAction: formatOperationalActionLabel(auth.nextAction),
      reason: pickHumanFacingReason(evaluation, {
        preferConfirmed: Boolean(evaluation.confirmedAssessment),
      }),
      lastReviewed,
      href: `/mxt/planning?plan=${plan.id}`,
      alerts: evaluation.alerts,
    };

    sections[bucket].push(item);
  }

  return sections;
}
