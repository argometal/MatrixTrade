/**
 * Scout funding follow-up after decision-update Accept (29-21).
 * Option C + assisted sequence — never auto-reserves capital.
 *
 * Architecture choice:
 * - Prefer Option C (post-Accept proposal assist) over composite Apply (Option B).
 * - Apply engine is not transactional across decision-update + reservation;
 *   do not simulate atomic multi-op behavior.
 */

import type { CapitalAccountSnapshot } from "./capital-account";
import type { CapitalReservation } from "./capital-types";
import { isActiveReservation, capitalFieldValue } from "./capital-types";
import type { TradePlan } from "./plan-types";
import {
  buildScoutFundingSnapshot,
  canonicalShareCount,
  executionLevelsPresentFromResolved,
  resolveEntryStopTarget,
  type ScoutFundingSnapshot,
  type ScoutFundingSnapshotField,
} from "./scout-funding-snapshot";
import {
  buildFillStatesForPlan,
  buildScoutMonetaryRow,
  pickCanonicalFillState,
} from "./scout-monetary-metrics";
import type { TradingInboxPayload } from "./bridge";

/**
 * Deterministic digest for funding fingerprints — browser + Node safe
 * (no Node `crypto`; ScoutExecutePanel is a client component).
 */
function digestHex(input: string, length: number): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c;
    h2 = Math.imul(h2, 0x01000193) ^ Math.imul(h1, 0x85ebca6b);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  const c = ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
  const d = (Math.imul(h1 ^ h2, 0x27d4eb2d) >>> 0)
    .toString(16)
    .padStart(8, "0");
  return (a + b + c + d).slice(0, length);
}

export type ScoutFundingProvenance = {
  planId: string;
  planUpdatedAt?: string;
  fundingFingerprint: string;
  plannedEntry?: number;
  stopPrice?: number;
  targetPrice?: number;
  layeredEntryFingerprint?: string;
  requestedCapital: number;
  estimatedRisk: number;
  shareCount?: number;
  generatedFromDecisionUpdateId?: string;
  generatedAt: string;
};

export type FundingExpirationPolicy =
  | { kind: "scout_valid_until"; expiresAt: string; source: "Scout validUntil" }
  | { kind: "requires_confirmation"; source: "Expiration requires confirmation" };

export type FundingFollowUpReadiness = {
  eligible: boolean;
  reason?: string;
  missingFields: string[];
  planId: string;
  ticker?: string;
  fundingFingerprint: string;
  snapshot: ScoutFundingSnapshot;
  requestedCapital?: number;
  estimatedRisk?: number;
  authorizedRisk?: number;
  actualRoundedRisk?: number;
  unusedRisk?: number;
  capitalNotAllocated?: number;
  shareCount?: number;
  expiration: FundingExpirationPolicy;
  existingReservationId?: string;
  existingReservationStatus?: string;
  reservationStale?: boolean;
  mutatesCapital: false;
};

export type FundingFollowUpResult = {
  eligible: boolean;
  reason?: string;
  planId: string;
  fundingFingerprint?: string;
  readiness?: FundingFollowUpReadiness;
  /** Prebuilt Apply payload — only when eligible and no active reservation. */
  suggestedBlock?: TradingInboxPayload;
};

function finiteOrUndefined(
  v: ScoutFundingSnapshotField<number> | number | undefined
): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** Deterministic layered-entry fingerprint — ignores non-funding narrative fields. */
export function layeredEntryFundingFingerprint(
  plan: TradePlan
): string | undefined {
  const le = plan.layeredEntry;
  if (!le) return undefined;
  const payload = {
    executionMethod: le.executionMethod,
    sizingMode: le.sizingMode,
    stopModel: le.stopModel,
    commonStopPrice: le.commonStopPrice,
    primaryTargetPrice: le.primaryTargetPrice,
    authorizedRiskAmount: le.authorizedRiskAmount,
    limits: (le.limits ?? []).map((lim) => ({
      price: lim.price,
      allocationPercent: lim.allocationPercent,
      role: lim.role,
      stopPrice: lim.stopPrice,
      plannedQuantity: lim.derived?.plannedQuantity,
      plannedRiskAmount: lim.derived?.plannedRiskAmount,
    })),
  };
  return digestHex(stableStringify(payload), 16);
}

/**
 * Deterministic funding fingerprint from authoritative Scout funding fields.
 * Changes when entry/layers/shares/stop/target/risk/capital/expiration/status/model change.
 * Ignores thesis text / notes / challenges narrative.
 */
export function buildFundingFingerprint(plan: TradePlan): string {
  const levels = resolveEntryStopTarget(plan);
  const monetary = buildScoutMonetaryRow(plan);
  const shares = resolveShareCountForFingerprint(plan);
  const payload = {
    planId: plan.id,
    ticker: plan.ticker,
    status: plan.status,
    plannedEntry: finiteOrUndefined(levels.entry),
    stopPrice: finiteOrUndefined(levels.stop),
    targetPrice: finiteOrUndefined(levels.target),
    validUntil: plan.validUntil ?? null,
    authorizedRiskAmount: plan.layeredEntry?.authorizedRiskAmount ?? null,
    capitalRequired: monetary?.capitalRequired ?? null,
    assignedLoss: monetary?.assignedLoss ?? null,
    shareCount: shares,
    layered: layeredEntryFundingFingerprint(plan) ?? null,
    decisionVerdict: plan.decision?.verdict ?? null,
  };
  return digestHex(stableStringify(payload), 24);
}

function resolveShareCountForFingerprint(plan: TradePlan): number | null {
  const states = buildFillStatesForPlan(plan);
  const canonical = pickCanonicalFillState(states);
  if (canonical && Number.isFinite(canonical.totalQuantity) && canonical.totalQuantity > 0) {
    return canonical.totalQuantity;
  }
  const limits = plan.layeredEntry?.limits;
  if (!limits?.length) return null;
  let sum = 0;
  let any = false;
  for (const lim of limits) {
    const q = lim.derived?.plannedQuantity;
    if (q !== undefined && Number.isFinite(q) && q > 0) {
      sum += q;
      any = true;
    }
  }
  return any ? sum : null;
}

/** Funding-relevant fields for stale detection — excludes thesis/notes text. */
export function fundingRelevantPlanSlice(plan: TradePlan): string {
  return buildFundingFingerprint(plan);
}

export function isReservationStaleRelativeToPlan(
  reservation: CapitalReservation,
  plan: TradePlan
): boolean {
  if (!isActiveReservation(reservation)) return false;
  if (reservation.planId !== plan.id) return false;
  const stored = reservation.fundingFingerprint;
  if (!stored) return false; // legacy — do not auto-stale
  return stored !== buildFundingFingerprint(plan);
}

export function resolveFundingExpiration(
  plan: TradePlan
): FundingExpirationPolicy {
  const v = plan.validUntil?.trim();
  if (v) {
    const t = Date.parse(v);
    if (Number.isFinite(t)) {
      return {
        kind: "scout_valid_until",
        expiresAt: new Date(t).toISOString(),
        source: "Scout validUntil",
      };
    }
  }
  return {
    kind: "requires_confirmation",
    source: "Expiration requires confirmation",
  };
}

export type AssessFundingFollowUpInput = {
  plan: TradePlan;
  reservations?: CapitalReservation[];
  account?: CapitalAccountSnapshot | null;
  authorizableLossRoom?: number;
  capitalConfigurationPresent?: boolean;
  /** Optional Accept/inbox id for provenance. */
  decisionUpdateId?: string;
  generatedAt?: string;
};

/**
 * Assess follow-up eligibility from the **accepted persisted** Scout plan.
 * Never invents shares/capital/risk/expiration/Stock File ID.
 */
export function assessFundingFollowUp(
  input: AssessFundingFollowUpInput
): FundingFollowUpResult {
  const { plan } = input;
  const fingerprint = buildFundingFingerprint(plan);
  const snapshot = buildScoutFundingSnapshot({
    plan,
    // stockFileId omitted — never alias from thesis
    reservations: input.reservations,
    account: input.account,
    authorizableLossRoom: input.authorizableLossRoom,
    capitalConfigurationPresent: input.capitalConfigurationPresent,
  });

  const missingFields: string[] = [];
  const levels = resolveEntryStopTarget(plan);
  if (!executionLevelsPresentFromResolved(levels)) {
    missingFields.push("execution levels (entry/stop/target)");
  }
  const requestedCapital = finiteOrUndefined(snapshot.requestedCapital);
  const estimatedRisk = finiteOrUndefined(snapshot.estimatedRisk);
  if (requestedCapital === undefined) missingFields.push("requestedCapital");
  if (estimatedRisk === undefined) missingFields.push("estimatedRisk");

  if (input.capitalConfigurationPresent === false) {
    missingFields.push("capital configuration");
  }
  const available =
    input.account?.availableCapital != null
      ? capitalFieldValue(input.account.availableCapital)
      : undefined;
  if (available === undefined) missingFields.push("available capital");
  if (
    input.authorizableLossRoom === undefined ||
    !Number.isFinite(input.authorizableLossRoom)
  ) {
    missingFields.push("available risk room");
  }

  const shareCount = canonicalShareCount(snapshot.shareCount);
  const monetary = buildScoutMonetaryRow(plan);
  const authorizedRisk =
    plan.layeredEntry?.authorizedRiskAmount ?? monetary?.assignedLoss;
  const actualRoundedRisk = estimatedRisk;
  const unusedRisk =
    authorizedRisk !== undefined &&
    actualRoundedRisk !== undefined &&
    Number.isFinite(authorizedRisk) &&
    Number.isFinite(actualRoundedRisk)
      ? Math.max(0, authorizedRisk - actualRoundedRisk)
      : undefined;
  const capitalNotAllocated =
    available !== undefined && requestedCapital !== undefined
      ? Math.max(0, available - requestedCapital)
      : undefined;

  const expiration = resolveFundingExpiration(plan);
  const active = (input.reservations ?? []).find(
    (r) => r.planId === plan.id && isActiveReservation(r)
  );
  const reservationStale = active
    ? isReservationStaleRelativeToPlan(active, plan)
    : false;

  const readiness: FundingFollowUpReadiness = {
    eligible: false,
    missingFields,
    planId: plan.id,
    ticker: plan.ticker,
    fundingFingerprint: fingerprint,
    snapshot,
    requestedCapital,
    estimatedRisk,
    authorizedRisk:
      authorizedRisk !== undefined && Number.isFinite(authorizedRisk)
        ? authorizedRisk
        : undefined,
    actualRoundedRisk,
    unusedRisk,
    capitalNotAllocated,
    shareCount,
    expiration,
    existingReservationId: active?.id,
    existingReservationStatus: active?.status,
    reservationStale,
    mutatesCapital: false,
  };

  // Never prepare a duplicate while any active reservation exists.
  // Stale requires release first — do not silently replace.
  if (active) {
    return {
      eligible: false,
      reason: reservationStale
        ? "Reservation stale — Scout funding parameters changed"
        : "Reservation already active",
      planId: plan.id,
      fundingFingerprint: fingerprint,
      readiness: {
        ...readiness,
        eligible: false,
        reason: reservationStale
          ? `Reservation stale (${active.id}) — release before replacement`
          : `Reservation already active (${active.id})`,
      },
    };
  }

  if (missingFields.length > 0) {
    return {
      eligible: false,
      reason: `Funding proposal unavailable — missing: ${missingFields.join(", ")}`,
      planId: plan.id,
      fundingFingerprint: fingerprint,
      readiness: {
        ...readiness,
        reason: `Funding proposal unavailable — missing: ${missingFields.join(", ")}`,
      },
    };
  }

  if (shareCount === undefined) {
    // Eligible for panel display, but proposal is not executable until shares exist.
    return {
      eligible: false,
      reason:
        "Funding proposal unavailable — canonical share count unconfigured",
      planId: plan.id,
      fundingFingerprint: fingerprint,
      readiness: {
        ...readiness,
        missingFields: [...missingFields, "canonical share count"],
        reason:
          "Funding proposal unavailable — canonical share count unconfigured",
      },
    };
  }

  if (expiration.kind === "requires_confirmation") {
    return {
      eligible: false,
      reason: "Expiration requires confirmation",
      planId: plan.id,
      fundingFingerprint: fingerprint,
      readiness: {
        ...readiness,
        missingFields: [...missingFields, "expiration"],
        reason: "Expiration requires confirmation",
      },
    };
  }

  const fundingDecision = snapshot.currentFundingDecision;
  if (
    fundingDecision === "blocked" ||
    fundingDecision === "unconfigured" ||
    fundingDecision === "unknown" ||
    fundingDecision === "unassessed"
  ) {
    return {
      eligible: false,
      reason: `Scout not fundable (${String(fundingDecision)})`,
      planId: plan.id,
      fundingFingerprint: fingerprint,
      readiness: {
        ...readiness,
        reason: `Scout not fundable (${String(fundingDecision)})`,
      },
    };
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const provenance: ScoutFundingProvenance = {
    planId: plan.id,
    planUpdatedAt: plan.updatedAt,
    fundingFingerprint: fingerprint,
    plannedEntry: finiteOrUndefined(levels.entry),
    stopPrice: finiteOrUndefined(levels.stop),
    targetPrice: finiteOrUndefined(levels.target),
    layeredEntryFingerprint: layeredEntryFundingFingerprint(plan),
    requestedCapital: requestedCapital!,
    estimatedRisk: estimatedRisk!,
    shareCount,
    generatedFromDecisionUpdateId: input.decisionUpdateId,
    generatedAt,
  };

  const suggestedBlock: TradingInboxPayload = {
    type: "capital-reservation-create",
    source: "funding-follow-up",
    proposal: {
      planId: plan.id,
      ticker: plan.ticker,
      stockThesisId: plan.stockThesisId,
      requestedCapital: requestedCapital!,
      estimatedRisk: estimatedRisk!,
      expiresAt: expiration.expiresAt,
      fundingFingerprint: provenance.fundingFingerprint,
      sourcePlanUpdatedAt: provenance.planUpdatedAt,
      sourceDecisionUpdateId: provenance.generatedFromDecisionUpdateId,
    },
  };

  return {
    eligible: true,
    planId: plan.id,
    fundingFingerprint: fingerprint,
    readiness: {
      ...readiness,
      eligible: true,
    },
    suggestedBlock,
  };
}

/**
 * Build readiness panel view-model after Accept (or on Scout surface).
 * Pure — does not mutate capital.
 */
export function buildFundingReadinessPanelModel(
  followUp: FundingFollowUpResult
): {
  title: string;
  requestedCapital: string;
  authorizedRisk: string;
  actualRoundedRisk: string;
  unusedRisk: string;
  capitalNotAllocated: string;
  canonicalShares: string;
  reviewDate: string;
  reservationStatus: string;
  expirationSource: string;
  canPrepare: boolean;
  alreadyReserved: boolean;
  stale: boolean;
  unavailableReason?: string;
} {
  const r = followUp.readiness;
  const money = (n: number | undefined) =>
    n !== undefined && Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })
      : "Unconfigured";

  if (!r) {
    return {
      title: "Funding proposal unavailable",
      requestedCapital: "Unconfigured",
      authorizedRisk: "Unconfigured",
      actualRoundedRisk: "Unconfigured",
      unusedRisk: "Unconfigured",
      capitalNotAllocated: "Unconfigured",
      canonicalShares: "Unconfigured",
      reviewDate: "Pending confirmation",
      reservationStatus: "Not prepared",
      expirationSource: "Expiration requires confirmation",
      canPrepare: false,
      alreadyReserved: false,
      stale: false,
      unavailableReason: followUp.reason,
    };
  }

  const alreadyReserved = Boolean(
    r.existingReservationId && !r.reservationStale
  );
  const stale = Boolean(r.reservationStale);

  return {
    title: alreadyReserved
      ? "Reservation already active"
      : stale
        ? "Reservation stale — Scout funding parameters changed"
        : followUp.eligible
          ? "Funding readiness"
          : "Funding proposal unavailable",
    requestedCapital: money(r.requestedCapital),
    authorizedRisk: money(r.authorizedRisk),
    actualRoundedRisk: money(r.actualRoundedRisk),
    unusedRisk: money(r.unusedRisk),
    capitalNotAllocated: money(r.capitalNotAllocated),
    canonicalShares:
      r.shareCount !== undefined ? String(r.shareCount) : "Unconfigured",
    reviewDate:
      r.expiration.kind === "scout_valid_until"
        ? r.expiration.expiresAt
        : "Pending confirmation",
    reservationStatus: alreadyReserved
      ? `${r.existingReservationStatus} · ${r.existingReservationId}`
      : stale
        ? `stale · ${r.existingReservationId}`
        : "Not prepared",
    expirationSource: r.expiration.source,
    canPrepare: followUp.eligible === true && !alreadyReserved,
    alreadyReserved,
    stale,
    unavailableReason: followUp.eligible ? undefined : followUp.reason,
  };
}

export function formatCapitalReservationProposalBlock(
  block: TradingInboxPayload
): string {
  return JSON.stringify(block, null, 2);
}
