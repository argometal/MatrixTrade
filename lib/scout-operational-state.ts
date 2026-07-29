import type { CapitalReservation } from "./capital-types";
import { isActiveReservation } from "./capital-types";
import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";
import { canonicalShareCount } from "./scout-funding-snapshot";
import { buildScoutFundingSnapshot } from "./scout-funding-snapshot";

export const SCOUT_THESIS_STATES = [
  "valid",
  "weakened",
  "invalid",
  "unknown",
] as const;
export type ScoutThesisState = (typeof SCOUT_THESIS_STATES)[number];

export const SCOUT_OPERATIONAL_STATES = [
  "armed",
  "in_zone",
  "approaching",
  "distant",
  "missed",
  "stale",
  "needs_reanalysis",
  "marginal",
  "superseded",
  "expired",
  "improbable",
  "unassessed",
] as const;
export type ScoutOperationalState = (typeof SCOUT_OPERATIONAL_STATES)[number];

export const SCOUT_WAIT_HORIZONS = [
  "now",
  "days",
  "weeks",
  "month",
  "quarter",
  "improbable",
  "unknown",
] as const;
export type ScoutWaitHorizon = (typeof SCOUT_WAIT_HORIZONS)[number];

export const SCOUT_NEXT_ACTIONS = [
  "act",
  "prepare",
  "monitor",
  "reassess",
  "replace_plan",
  "close",
  "archive",
  "none",
] as const;
export type ScoutNextAction = (typeof SCOUT_NEXT_ACTIONS)[number];

export const SCOUT_FRESHNESS_VALUES = [
  "current",
  "aging",
  "stale",
  "expired",
  "unknown",
] as const;
export type ScoutFreshness = (typeof SCOUT_FRESHNESS_VALUES)[number];

export const SCOUT_OPERATIONAL_REASON_CODES = [
  "missing_market_data",
  "missing_recent_prices",
  "missing_atr",
  "execution_geometry_missing",
  "minimum_rr_unavailable",
  "rr_below_minimum",
  "rr_marginal",
  "review_due",
  "plan_expired",
  "plan_superseded",
  "entry_reached_no_fill_history",
  "entry_passed_without_execution",
  "active_trade_exists",
  "active_reservation_exists",
  "execution_readiness_not_armed",
  "execution_readiness_armed",
  "canonical_shares_missing",
  "price_inside_entry_zone",
  "distance_days_band",
  "distance_weeks_band",
  "distance_month_band",
  "distance_quarter_band",
  "distance_improbable",
  "confirmed_detected_mismatch",
  "legacy_unassessed",
  "manual_override",
  "next_review_confirmed",
] as const;
export type ScoutOperationalReasonCode =
  (typeof SCOUT_OPERATIONAL_REASON_CODES)[number];

export type ScoutOperationalAssessment = {
  thesisState: ScoutThesisState;
  operationalState: ScoutOperationalState;
  waitHorizon: ScoutWaitHorizon;
  nextAction: ScoutNextAction;
  freshness: ScoutFreshness;
  plannedRR?: number;
  currentExecutableRR?: number | null;
  reviewRequired: boolean;
  reasonCodes: ScoutOperationalReasonCode[];
  explanation?: string;
  detectedAt?: string;
  confirmedAt?: string;
  confirmedBy?: "human" | "ai" | "system";
  nextReviewAt?: string;
  currentPrice?: number;
  distanceToEntryPct?: number;
  distanceToEntryAtr?: number;
  source:
    | "system_detected"
    | "human_confirmed"
    | "manual_override"
    | "legacy";
};

export type ScoutMonitoringAlert = {
  id: string;
  planId: string;
  type:
    | "state_mismatch"
    | "entry_reached"
    | "entry_passed"
    | "plan_expired"
    | "plan_stale"
    | "rr_degraded"
    | "volatility_mismatch"
    | "review_due"
    | "improbable_distance";
  severity: "info" | "attention" | "urgent";
  detectedAt: string;
  reasonCodes: ScoutOperationalReasonCode[];
  dismissedUntil?: string;
};

export type ScoutOperationalEvaluationInput = {
  plan: TradePlan;
  currentPrice?: number;
  atr?: number;
  recentPrices?: Array<{
    at: string;
    high: number;
    low: number;
    close: number;
  }>;
  linkedTrades: Trade[];
  reservations: CapitalReservation[];
  now: string;
  minimumRR: number;
  confirmedAssessment?: ScoutOperationalAssessment;
};

export type ScoutOperationalEvaluation = {
  detectedAssessment: ScoutOperationalAssessment;
  confirmedAssessment?: ScoutOperationalAssessment;
  mismatch: boolean;
  alerts: ScoutMonitoringAlert[];
};

export const SCOUT_OPERATIONAL_POLICY = {
  reviewStaleDays: 21,
  reviewAgingDays: 7,
  approachingAtrMax: 1.5,
  approachingPctMax: 3,
  daysAtrMax: 0.5,
  distantAtrMax: 6,
  marginalBand: 0.5,
} as const;

export function getConfirmedOperationalAssessment(
  plan: TradePlan
): ScoutOperationalAssessment | undefined {
  return plan.decision?.operationalAssessment;
}

export function effectiveOperationalAssessment(
  plan: TradePlan
): ScoutOperationalAssessment | undefined {
  return getConfirmedOperationalAssessment(plan);
}

function isoDaysAgo(nowIso: string, thenIso?: string): number | undefined {
  if (!thenIso) return undefined;
  const now = Date.parse(nowIso);
  const then = Date.parse(thenIso);
  if (!Number.isFinite(now) || !Number.isFinite(then)) return undefined;
  return (now - then) / (1000 * 60 * 60 * 24);
}

function resolveEntryPrice(plan: TradePlan): number | undefined {
  if (plan.layeredEntry?.limits?.length) {
    const prices = plan.layeredEntry.limits
      .map((l) => l.price)
      .filter((n): n is number => Number.isFinite(n));
    if (prices.length > 0) return Math.min(...prices);
  }
  return plan.plannedEntry;
}

function resolveUpperEntryPrice(plan: TradePlan): number | undefined {
  if (plan.layeredEntry?.limits?.length) {
    const prices = plan.layeredEntry.limits
      .map((l) => l.price)
      .filter((n): n is number => Number.isFinite(n));
    if (prices.length > 0) return Math.max(...prices);
  }
  return plan.plannedEntry;
}

function hasLinkedExecutedTrade(trades: Trade[]): boolean {
  return trades.some(
    (trade) =>
      trade.status === "open" ||
      trade.status === "closed" ||
      trade.status === "pending"
  );
}

function computeFreshness(
  plan: TradePlan,
  now: string,
  confirmed?: ScoutOperationalAssessment
): ScoutFreshness {
  if (plan.status === "expired") return "expired";
  if (plan.validUntil) {
    const until = Date.parse(plan.validUntil);
    const nowMs = Date.parse(now);
    if (Number.isFinite(until) && Number.isFinite(nowMs) && until < nowMs) {
      return "expired";
    }
  }
  const ageDays =
    isoDaysAgo(now, confirmed?.confirmedAt) ?? isoDaysAgo(now, plan.updatedAt);
  if (ageDays === undefined) return "unknown";
  if (ageDays >= SCOUT_OPERATIONAL_POLICY.reviewStaleDays) return "stale";
  if (ageDays >= SCOUT_OPERATIONAL_POLICY.reviewAgingDays) return "aging";
  return "current";
}

function planHasExecutableGeometry(plan: TradePlan): boolean {
  return Boolean(
    resolveEntryPrice(plan) !== undefined &&
      plan.stopPrice !== undefined &&
      plan.targetPrice !== undefined
  );
}

function computeCurrentExecutableRR(
  plan: TradePlan,
  operationalState?: ScoutOperationalState
): number | null | undefined {
  if (
    operationalState === "missed" ||
    operationalState === "expired" ||
    operationalState === "superseded" ||
    operationalState === "needs_reanalysis"
  ) {
    return null;
  }
  if (!planHasExecutableGeometry(plan)) return undefined;
  return plan.plannedRR ?? null;
}

function buildAlert(
  planId: string,
  type: ScoutMonitoringAlert["type"],
  severity: ScoutMonitoringAlert["severity"],
  detectedAt: string,
  reasonCodes: ScoutOperationalReasonCode[],
  dismissedUntil?: string
): ScoutMonitoringAlert {
  return {
    id: `${planId}:${type}:${reasonCodes.join(",")}`,
    planId,
    type,
    severity,
    detectedAt,
    reasonCodes,
    dismissedUntil,
  };
}

export function compareOperationalAssessments(
  a?: ScoutOperationalAssessment,
  b?: ScoutOperationalAssessment
): boolean {
  if (!a || !b) return false;
  return (
    a.operationalState === b.operationalState &&
    a.waitHorizon === b.waitHorizon &&
    a.nextAction === b.nextAction &&
    a.freshness === b.freshness &&
    (a.currentExecutableRR ?? null) === (b.currentExecutableRR ?? null) &&
    a.reviewRequired === b.reviewRequired
  );
}

function classifyPriceDistance(
  entry: number,
  currentPrice: number,
  atr?: number
): {
  state: ScoutOperationalState;
  waitHorizon: ScoutWaitHorizon;
  reasonCodes: ScoutOperationalReasonCode[];
  distanceToEntryPct: number;
  distanceToEntryAtr?: number;
} {
  const distance = Math.abs(currentPrice - entry);
  const distanceToEntryPct = entry > 0 ? (distance / entry) * 100 : 0;
  if (atr !== undefined && Number.isFinite(atr) && atr > 0) {
    const multiple = distance / atr;
    if (multiple <= SCOUT_OPERATIONAL_POLICY.approachingAtrMax) {
      return {
        state: "approaching",
        waitHorizon:
          multiple <= SCOUT_OPERATIONAL_POLICY.daysAtrMax ? "days" : "weeks",
        reasonCodes: [
          multiple <= SCOUT_OPERATIONAL_POLICY.daysAtrMax
            ? "distance_days_band"
            : "distance_weeks_band",
        ],
        distanceToEntryPct,
        distanceToEntryAtr: multiple,
      };
    }
    if (multiple <= 3) {
      return {
        state: "distant",
        waitHorizon: "month",
        reasonCodes: ["distance_month_band"],
        distanceToEntryPct,
        distanceToEntryAtr: multiple,
      };
    }
    if (multiple <= SCOUT_OPERATIONAL_POLICY.distantAtrMax) {
      return {
        state: "distant",
        waitHorizon: "quarter",
        reasonCodes: ["distance_quarter_band"],
        distanceToEntryPct,
        distanceToEntryAtr: multiple,
      };
    }
    return {
      state: "improbable",
      waitHorizon: "improbable",
      reasonCodes: ["distance_improbable"],
      distanceToEntryPct,
      distanceToEntryAtr: multiple,
    };
  }

  if (distanceToEntryPct <= SCOUT_OPERATIONAL_POLICY.approachingPctMax) {
    return {
      state: "approaching",
      waitHorizon: "weeks",
      reasonCodes: ["distance_weeks_band", "missing_atr"],
      distanceToEntryPct,
    };
  }
  return {
    state: "unassessed",
    waitHorizon: "unknown",
    reasonCodes: ["missing_market_data", "missing_atr"],
    distanceToEntryPct,
  };
}

function detectMissedWithHistory(
  plan: TradePlan,
  linkedTrades: Trade[],
  recentPrices?: ScoutOperationalEvaluationInput["recentPrices"]
): boolean {
  const entry = resolveEntryPrice(plan);
  const upper = resolveUpperEntryPrice(plan);
  if (
    entry === undefined ||
    upper === undefined ||
    !recentPrices?.length ||
    hasLinkedExecutedTrade(linkedTrades)
  ) {
    return false;
  }
  let enteredZone = false;
  let leftZone = false;
  for (const row of recentPrices) {
    const touched = row.low <= upper && row.high >= entry;
    if (touched) enteredZone = true;
    if (enteredZone && (row.close < entry || row.close > upper)) leftZone = true;
  }
  return enteredZone && leftZone;
}

export function evaluateScoutOperationalState(
  input: ScoutOperationalEvaluationInput
): ScoutOperationalEvaluation {
  const {
    plan,
    linkedTrades,
    reservations,
    now,
    currentPrice,
    atr,
    recentPrices,
    minimumRR,
  } = input;
  const confirmed = input.confirmedAssessment ?? getConfirmedOperationalAssessment(plan);
  const reasonCodes: ScoutOperationalReasonCode[] = [];
  const alerts: ScoutMonitoringAlert[] = [];
  const freshness = computeFreshness(plan, now, confirmed);
  const activeReservation = reservations.find(
    (r) => r.planId === plan.id && isActiveReservation(r)
  );
  const fundingSnapshot = buildScoutFundingSnapshot({
    plan,
    reservations,
  });
  const shares = canonicalShareCount(fundingSnapshot.shareCount);

  let operationalState: ScoutOperationalState = "unassessed";
  let waitHorizon: ScoutWaitHorizon = "unknown";
  let nextAction: ScoutNextAction = "monitor";
  let thesisState: ScoutThesisState = "unknown";
  let reviewRequired = false;
  let distanceToEntryPct: number | undefined;
  let distanceToEntryAtr: number | undefined;

  if (plan.status === "expired" || freshness === "expired") {
    operationalState = "expired";
    nextAction = "reassess";
    reviewRequired = true;
    reasonCodes.push("plan_expired");
    alerts.push(buildAlert(plan.id, "plan_expired", "urgent", now, ["plan_expired"]));
  } else if (plan.replacedByPlanId) {
    operationalState = "superseded";
    nextAction = "archive";
    reviewRequired = false;
    reasonCodes.push("plan_superseded");
  } else if (
    plan.executionReadiness === "armed" &&
    (shares === undefined || !planHasExecutableGeometry(plan))
  ) {
    operationalState = "needs_reanalysis";
    nextAction = "reassess";
    reviewRequired = true;
    reasonCodes.push("execution_readiness_not_armed");
    if (shares === undefined) reasonCodes.push("canonical_shares_missing");
  } else if (detectMissedWithHistory(plan, linkedTrades, recentPrices)) {
    operationalState = "missed";
    nextAction = "replace_plan";
    reviewRequired = true;
    reasonCodes.push("entry_passed_without_execution");
    alerts.push(
      buildAlert(plan.id, "entry_passed", "urgent", now, [
        "entry_passed_without_execution",
      ])
    );
  } else if (
    plan.executionReadiness === "armed" &&
    shares !== undefined &&
    planHasExecutableGeometry(plan)
  ) {
    operationalState = "armed";
    waitHorizon = "now";
    nextAction = "act";
    thesisState = "valid";
    reasonCodes.push("execution_readiness_armed");
    if (activeReservation) reasonCodes.push("active_reservation_exists");
  } else if (!planHasExecutableGeometry(plan)) {
    operationalState = "needs_reanalysis";
    nextAction = "reassess";
    reviewRequired = true;
    reasonCodes.push("execution_geometry_missing");
  } else {
    thesisState =
      plan.decision?.verdict === "no"
        ? "invalid"
        : plan.decision?.verdict === "go" || plan.decision?.verdict === "wait"
          ? "valid"
          : "unknown";

    const currentExecutableRR = computeCurrentExecutableRR(plan);
    if (currentExecutableRR === undefined) {
      reasonCodes.push("minimum_rr_unavailable");
    } else if (currentExecutableRR !== null && currentExecutableRR < minimumRR) {
      if (currentExecutableRR < minimumRR) {
        operationalState = "needs_reanalysis";
        nextAction = "reassess";
        reviewRequired = true;
        reasonCodes.push("rr_below_minimum");
        alerts.push(buildAlert(plan.id, "rr_degraded", "attention", now, ["rr_below_minimum"]));
      }
    } else if (
      currentExecutableRR !== null &&
      currentExecutableRR < minimumRR + SCOUT_OPERATIONAL_POLICY.marginalBand
    ) {
      operationalState = "marginal";
      nextAction = "reassess";
      reviewRequired = false;
      reasonCodes.push("rr_marginal");
    }

    if (operationalState === "unassessed") {
      const entry = resolveEntryPrice(plan);
      const upper = resolveUpperEntryPrice(plan);
      if (
        entry !== undefined &&
        upper !== undefined &&
        currentPrice !== undefined &&
        Number.isFinite(currentPrice)
      ) {
        if (currentPrice >= entry && currentPrice <= upper) {
          operationalState = "in_zone";
          waitHorizon = "now";
          nextAction = "prepare";
          thesisState = "valid";
          reasonCodes.push("price_inside_entry_zone");
          distanceToEntryPct = 0;
          distanceToEntryAtr = 0;
        } else {
          const classified = classifyPriceDistance(entry, currentPrice, atr);
          operationalState = classified.state;
          waitHorizon = classified.waitHorizon;
          nextAction =
            classified.state === "approaching" ? "monitor" : "none";
          distanceToEntryPct = classified.distanceToEntryPct;
          distanceToEntryAtr = classified.distanceToEntryAtr;
          reasonCodes.push(...classified.reasonCodes);
          if (classified.state === "improbable") {
            alerts.push(
              buildAlert(plan.id, "improbable_distance", "info", now, [
                "distance_improbable",
              ])
            );
          }
        }
      } else {
        reasonCodes.push("missing_market_data");
      }
    }
  }

  if (freshness === "stale" && operationalState !== "expired") {
    if (operationalState === "unassessed") {
      operationalState = "stale";
      nextAction = "reassess";
    }
    reviewRequired = true;
    reasonCodes.push("review_due");
    alerts.push(buildAlert(plan.id, "plan_stale", "attention", now, ["review_due"]));
  } else if (freshness === "aging") {
    reasonCodes.push("review_due");
  }

  const detected: ScoutOperationalAssessment = {
    thesisState,
    operationalState,
    waitHorizon,
    nextAction,
    freshness,
    plannedRR: plan.plannedRR,
    currentExecutableRR: computeCurrentExecutableRR(plan, operationalState),
    reviewRequired,
    reasonCodes: Array.from(new Set(reasonCodes)),
    detectedAt: now,
    currentPrice,
    distanceToEntryPct,
    distanceToEntryAtr,
    source: "system_detected",
  };

  const mismatch =
    confirmed !== undefined && !compareOperationalAssessments(detected, confirmed);
  if (mismatch) {
    detected.reasonCodes = Array.from(
      new Set([...detected.reasonCodes, "confirmed_detected_mismatch"])
    );
    alerts.push(
      buildAlert(plan.id, "state_mismatch", "attention", now, [
        "confirmed_detected_mismatch",
      ])
    );
  }

  return {
    detectedAssessment: detected,
    confirmedAssessment: confirmed,
    mismatch,
    alerts,
  };
}

const STATE_PRIORITY: Record<ScoutOperationalState, number> = {
  armed: 0,
  in_zone: 1,
  approaching: 2,
  needs_reanalysis: 3,
  missed: 4,
  marginal: 5,
  distant: 6,
  improbable: 7,
  expired: 8,
  superseded: 8,
  stale: 8,
  unassessed: 9,
};

export function compareScoutOperationalEvaluations(
  a: ScoutOperationalEvaluation,
  b: ScoutOperationalEvaluation
): number {
  const ap = STATE_PRIORITY[a.detectedAssessment.operationalState];
  const bp = STATE_PRIORITY[b.detectedAssessment.operationalState];
  if (ap !== bp) return ap - bp;

  const aExec = a.detectedAssessment.currentExecutableRR;
  const bExec = b.detectedAssessment.currentExecutableRR;
  const aHasExec = aExec !== undefined && aExec !== null && Number.isFinite(aExec);
  const bHasExec = bExec !== undefined && bExec !== null && Number.isFinite(bExec);
  if (aHasExec !== bHasExec) return aHasExec ? -1 : 1;
  if (aHasExec && bHasExec && aExec !== bExec) return (bExec as number) - (aExec as number);

  const aReview = a.confirmedAssessment?.confirmedAt ?? a.detectedAssessment.detectedAt ?? "";
  const bReview = b.confirmedAssessment?.confirmedAt ?? b.detectedAssessment.detectedAt ?? "";
  if (aReview !== bReview) return bReview.localeCompare(aReview);

  const aNext = a.confirmedAssessment?.nextReviewAt ?? "";
  const bNext = b.confirmedAssessment?.nextReviewAt ?? "";
  if (aNext !== bNext) return aNext.localeCompare(bNext);

  const aPlanned = a.detectedAssessment.plannedRR;
  const bPlanned = b.detectedAssessment.plannedRR;
  const aHasPlanned = aPlanned !== undefined && Number.isFinite(aPlanned);
  const bHasPlanned = bPlanned !== undefined && Number.isFinite(bPlanned);
  if (aHasPlanned && bHasPlanned && aPlanned !== bPlanned) {
    return (bPlanned as number) - (aPlanned as number);
  }
  if (aHasPlanned !== bHasPlanned) return aHasPlanned ? -1 : 1;

  return a.detectedAssessment.source.localeCompare(b.detectedAssessment.source);
}

export function formatOperationalR(
  value: number | null | undefined
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—R";
  return `${value.toFixed(1)}R`;
}

export function formatOperationalStateLabel(
  value: ScoutOperationalState
): string {
  return value.replace(/_/g, " ");
}

export function formatOperationalActionLabel(
  value: ScoutNextAction
): string {
  return value.replace(/_/g, " ");
}

export function buildOperationalDecisionUpdateProposal(input: {
  plan: TradePlan;
  assessment: Partial<ScoutOperationalAssessment> &
    Pick<
      ScoutOperationalAssessment,
      "operationalState" | "nextAction"
    >;
  decidedBy?: "human" | "ai" | "system";
  reviewTomorrow?: boolean;
  now?: string;
}): string {
  const now = input.now ?? new Date().toISOString();
  const nextReviewAt = input.reviewTomorrow
    ? new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString()
    : input.assessment.nextReviewAt;
  return JSON.stringify(
    {
      type: "decision-update",
      source: "operational-quick-update",
      proposal: {
        planId: input.plan.id,
        operationalAssessment: {
          thesisState: input.assessment.thesisState ?? "unknown",
          operationalState: input.assessment.operationalState,
          waitHorizon: input.assessment.waitHorizon ?? "unknown",
          nextAction: input.assessment.nextAction,
          freshness: input.assessment.freshness ?? "unknown",
          currentExecutableRR:
            input.assessment.currentExecutableRR ?? input.plan.plannedRR ?? null,
          reviewRequired: input.assessment.reviewRequired ?? false,
          reasonCodes: input.assessment.reasonCodes ?? ["manual_override"],
          confirmedAt: now,
          confirmedBy: input.decidedBy ?? "human",
          nextReviewAt,
          source: "manual_override",
        },
      },
    },
    null,
    2
  );
}

export function parseOperationalPhraseToProposal(
  plan: TradePlan,
  phrase: string,
  now?: string
): { ok: true; json: string } | { ok: false; error: string } {
  const normalized = phrase.trim().toLowerCase();
  if (!normalized) return { ok: false, error: "Phrase required." };
  if (/(ya paso|ya pasó|already passed)/i.test(normalized)) {
    return {
      ok: true,
      json: buildOperationalDecisionUpdateProposal({
        plan,
        now,
        assessment: {
          operationalState: "missed",
          waitHorizon: "unknown",
          nextAction: "replace_plan",
          freshness: "stale",
          reviewRequired: true,
          reasonCodes: ["entry_passed_without_execution", "manual_override"],
        },
      }),
    };
  }
  if (/(otra semana|next week|la otra semana)/i.test(normalized)) {
    return {
      ok: true,
      json: buildOperationalDecisionUpdateProposal({
        plan,
        now,
        assessment: {
          operationalState: "approaching",
          waitHorizon: "weeks",
          nextAction: "monitor",
          freshness: "current",
          reviewRequired: false,
          reasonCodes: ["manual_override"],
        },
      }),
    };
  }
  if (/(revisar manana|revisar mañana|review tomorrow)/i.test(normalized)) {
    return {
      ok: true,
      json: buildOperationalDecisionUpdateProposal({
        plan,
        now,
        reviewTomorrow: true,
        assessment: {
          operationalState: "unassessed",
          waitHorizon: "unknown",
          nextAction: "monitor",
          freshness: "current",
          reviewRequired: false,
          reasonCodes: ["next_review_confirmed", "manual_override"],
        },
      }),
    };
  }
  if (/(entrada automatica activa|entrada automática activa|automatic entry active)/i.test(normalized)) {
    if (plan.executionReadiness !== "armed") {
      return {
        ok: false,
        error: "Automatic entry active requires authoritative executionReadiness=armed.",
      };
    }
    return {
      ok: true,
      json: buildOperationalDecisionUpdateProposal({
        plan,
        now,
        assessment: {
          operationalState: "armed",
          waitHorizon: "now",
          nextAction: "act",
          freshness: "current",
          reviewRequired: false,
          reasonCodes: ["execution_readiness_armed", "manual_override"],
        },
      }),
    };
  }
  if (/(no parece probable|improbable)/i.test(normalized)) {
    return {
      ok: true,
      json: buildOperationalDecisionUpdateProposal({
        plan,
        now,
        assessment: {
          operationalState: "improbable",
          waitHorizon: "improbable",
          nextAction: "monitor",
          freshness: "current",
          reviewRequired: false,
          reasonCodes: ["distance_improbable", "manual_override"],
        },
      }),
    };
  }
  if (/(reanalizar|reanalyse|reanalyze)/i.test(normalized)) {
    return {
      ok: true,
      json: buildOperationalDecisionUpdateProposal({
        plan,
        now,
        assessment: {
          operationalState: "needs_reanalysis",
          waitHorizon: "unknown",
          nextAction: "reassess",
          freshness: "stale",
          reviewRequired: true,
          reasonCodes: ["manual_override"],
        },
      }),
    };
  }
  return {
    ok: false,
    error: "Phrase not recognized. Try Already passed, Puede ser la otra semana, Revisar mañana, Entrada automática activa, No parece probable, or Reanalizar.",
  };
}
