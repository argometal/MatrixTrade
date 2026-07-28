/**
 * Canonical Scout Funding Snapshot (26-34 / 26-36).
 * Read-only package for evaluating / preparing capital-reservation-create.
 * Never invents missing values; never mutates or reserves capital.
 *
 * Ontology (26-36):
 * - stockThesisId may come from plan.stockThesisId
 * - stockFileId only from an authoritative Stock File source passed in
 * - never alias the two; never infer Stock File ID from ticker
 */

import type { CapitalAccountSnapshot } from "./capital-account";
import type { CapitalReservation } from "./capital-types";
import { isActiveReservation } from "./capital-types";
import type { TradePlan } from "./plan-types";
import { evaluateScoutFunding } from "./scout-funding";
import {
  buildFillStatesForPlan,
  buildScoutMonetaryRow,
  pickCanonicalFillState,
} from "./scout-monetary-metrics";
import type { SnapshotMenuItem } from "./snapshot-types";
import { wrapSnapshotText } from "./snapshot-verification";

export const SCOUT_FUNDING_SNAPSHOT_ID = "scout-funding";
export const SCOUT_FUNDING_SNAPSHOT_LABEL = "Scout Funding Snapshot";

/** Sentinel strings — never invent numeric/id values. */
export type ScoutFundingSentinel = "unconfigured" | "unknown";

export type ScoutFundingSnapshotField<T> = T | ScoutFundingSentinel;

/**
 * Canonical share count for Prepare trade / Allocation Board.
 * Sentinels, non-finite, and non-positive values are never authoritative.
 */
export function canonicalShareCount(
  value: ScoutFundingSnapshotField<number>
): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : undefined;
}

export type ScoutFundingSnapshot = {
  planId: string;
  stockFileId: ScoutFundingSnapshotField<string>;
  stockThesisId: ScoutFundingSnapshotField<string>;
  ticker: ScoutFundingSnapshotField<string>;
  requestedCapital: ScoutFundingSnapshotField<number>;
  estimatedRisk: ScoutFundingSnapshotField<number>;
  expiration: ScoutFundingSnapshotField<string>;
  entry: ScoutFundingSnapshotField<number>;
  stop: ScoutFundingSnapshotField<number>;
  target: ScoutFundingSnapshotField<number>;
  shareCount: ScoutFundingSnapshotField<number>;
  currentFundingDecision: ScoutFundingSnapshotField<string>;
  reservationStatus: ScoutFundingSnapshotField<string>;
  blockingReasons: string[];
  existingReservationId: ScoutFundingSnapshotField<string>;
  /** Explicit: this package does not create or mutate reservations. */
  mutatesCapital: false;
  readOnly: true;
};

export type BuildScoutFundingSnapshotInput = {
  plan: TradePlan;
  /**
   * Authoritative Stock File ID only.
   * Never derived from plan.stockThesisId, ticker, plan id, or case key.
   * Omit until a real Stock File relationship exists (26-40).
   */
  stockFileId?: string | null;
  /** Active or any reservation for this plan, when known. */
  reservation?: CapitalReservation | null;
  /** All reservations — used to find plan match when reservation not passed. */
  reservations?: CapitalReservation[];
  account?: CapitalAccountSnapshot | null;
  /** Monthly / experiment loss room when known for live evaluation. */
  authorizableLossRoom?: number;
  capitalConfigurationPresent?: boolean;
};

function findReservationForPlan(
  planId: string,
  reservation: CapitalReservation | null | undefined,
  reservations: CapitalReservation[] | undefined
): CapitalReservation | undefined {
  if (reservation) return reservation;
  const list = reservations ?? [];
  const active = list.find(
    (r) => r.planId === planId && isActiveReservation(r)
  );
  if (active) return active;
  return list.find((r) => r.planId === planId);
}

function numOrUnconfigured(
  n: number | undefined | null
): ScoutFundingSnapshotField<number> {
  if (n === undefined || n === null) return "unconfigured";
  if (!Number.isFinite(n)) return "unknown";
  return n;
}

function textOrUnconfigured(
  v: string | undefined | null
): ScoutFundingSnapshotField<string> {
  if (v === undefined || v === null) return "unconfigured";
  const t = v.trim();
  if (!t) return "unconfigured";
  return t;
}

function isFiniteLevel(
  v: ScoutFundingSnapshotField<number>
): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function resolveShareCount(plan: TradePlan): ScoutFundingSnapshotField<number> {
  const states = buildFillStatesForPlan(plan);
  const canonical = pickCanonicalFillState(states);
  if (canonical && Number.isFinite(canonical.totalQuantity)) {
    return canonical.totalQuantity;
  }
  const limits = plan.layeredEntry?.limits;
  if (!limits?.length) return "unconfigured";
  let sum = 0;
  let any = false;
  for (const lim of limits) {
    const q = lim.derived?.plannedQuantity;
    if (q !== undefined && Number.isFinite(q)) {
      sum += q;
      any = true;
    }
  }
  if (!any) return "unconfigured";
  return sum;
}

/**
 * Resolve entry / stop / target from canonical supported sources
 * (monetary projection, plan levels, then layered-entry).
 * Do not treat plan.plannedEntry/stopPrice/targetPrice alone as the
 * completeness gate — layered-entry may supply valid levels.
 */
export function resolveEntryStopTarget(plan: TradePlan): {
  entry: ScoutFundingSnapshotField<number>;
  stop: ScoutFundingSnapshotField<number>;
  target: ScoutFundingSnapshotField<number>;
} {
  const monetary = buildScoutMonetaryRow(plan);
  const le = plan.layeredEntry;
  return {
    entry: numOrUnconfigured(
      monetary?.entry ?? plan.plannedEntry ?? le?.limits?.[0]?.price
    ),
    stop: numOrUnconfigured(
      monetary?.stop ?? plan.stopPrice ?? le?.commonStopPrice
    ),
    target: numOrUnconfigured(
      monetary?.target ?? plan.targetPrice ?? le?.primaryTargetPrice
    ),
  };
}

export function executionLevelsPresentFromResolved(levels: {
  entry: ScoutFundingSnapshotField<number>;
  stop: ScoutFundingSnapshotField<number>;
  target: ScoutFundingSnapshotField<number>;
}): boolean {
  return (
    isFiniteLevel(levels.entry) &&
    isFiniteLevel(levels.stop) &&
    isFiniteLevel(levels.target)
  );
}

/**
 * Build the canonical Scout Funding Snapshot for one plan.
 * Pure — does not call Create/Update reservation APIs.
 */
export function buildScoutFundingSnapshot(
  input: BuildScoutFundingSnapshotInput
): ScoutFundingSnapshot {
  const plan = input.plan;
  const planId = plan.id;
  const reservation = findReservationForPlan(
    planId,
    input.reservation,
    input.reservations
  );

  const monetary = buildScoutMonetaryRow(plan);
  const levels = resolveEntryStopTarget(plan);
  const executionLevelsPresent = executionLevelsPresentFromResolved(levels);

  const requestedFromReservation = reservation?.requestedCapital;
  const riskFromReservation = reservation?.estimatedRisk;
  const requestedCapital = numOrUnconfigured(
    requestedFromReservation ?? monetary?.capitalRequired
  );
  const estimatedRisk = numOrUnconfigured(
    riskFromReservation ??
      monetary?.assignedLoss ??
      plan.layeredEntry?.authorizedRiskAmount
  );

  // 26-36 ontology: thesis from plan; file only from authoritative input.
  const stockThesisId = textOrUnconfigured(plan.stockThesisId);
  const stockFileId = textOrUnconfigured(input.stockFileId);

  let currentFundingDecision: ScoutFundingSnapshotField<string>;
  let blockingReasons: string[] = [];
  let reservationStatus: ScoutFundingSnapshotField<string>;
  let existingReservationId: ScoutFundingSnapshotField<string>;

  if (reservation) {
    currentFundingDecision = reservation.fundingDecision;
    blockingReasons = [...reservation.blockingReasons];
    reservationStatus = reservation.status;
    existingReservationId = reservation.id;
  } else {
    existingReservationId = "unconfigured";
    reservationStatus = "unconfigured";

    const requestedOk =
      typeof requestedCapital === "number" && Number.isFinite(requestedCapital);
    const riskOk =
      typeof estimatedRisk === "number" && Number.isFinite(estimatedRisk);

    if (!requestedOk || !riskOk) {
      if (!requestedOk) blockingReasons.push("requested capital unconfigured");
      if (!riskOk) blockingReasons.push("estimated risk unconfigured");
      if (!executionLevelsPresent) {
        blockingReasons.push("missing execution levels");
        currentFundingDecision = "blocked";
      } else {
        currentFundingDecision = "unconfigured";
      }
    } else {
      const available =
        input.account?.availableCapital.status === "configured"
          ? input.account.availableCapital.value
          : undefined;
      const funding = evaluateScoutFunding({
        requestedCapital,
        estimatedRisk,
        availableCapital: available,
        authorizableLossRoom: input.authorizableLossRoom,
        existingReservations: input.reservations,
        capitalConfigurationPresent: input.capitalConfigurationPresent,
        scoutExpired: plan.status === "expired",
        executionLevelsPresent,
        planId,
      });
      currentFundingDecision = funding.fundingDecision;
      blockingReasons = [...funding.reasons];
    }
  }

  return {
    planId,
    stockFileId,
    stockThesisId,
    ticker: textOrUnconfigured(plan.ticker),
    requestedCapital,
    estimatedRisk,
    expiration: textOrUnconfigured(plan.validUntil),
    entry: levels.entry,
    stop: levels.stop,
    target: levels.target,
    shareCount: resolveShareCount(plan),
    currentFundingDecision,
    reservationStatus,
    blockingReasons,
    existingReservationId,
    mutatesCapital: false,
    readOnly: true,
  };
}

function formatField(v: ScoutFundingSnapshotField<string | number>): string {
  if (v === "unconfigured" || v === "unknown") return v;
  return String(v);
}

export function formatScoutFundingSnapshotText(
  snap: ScoutFundingSnapshot
): string {
  const lines = [
    "=== SCOUT FUNDING SNAPSHOT ===",
    "Read-only. Does not reserve capital. Use to prepare capital-reservation-create.",
    "",
    `planId: ${snap.planId}`,
    `stockFileId: ${formatField(snap.stockFileId)}`,
    `stockThesisId: ${formatField(snap.stockThesisId)}`,
    `ticker: ${formatField(snap.ticker)}`,
    `requestedCapital: ${formatField(snap.requestedCapital)}`,
    `estimatedRisk: ${formatField(snap.estimatedRisk)}`,
    `expiration: ${formatField(snap.expiration)}`,
    `entry: ${formatField(snap.entry)}`,
    `stop: ${formatField(snap.stop)}`,
    `target: ${formatField(snap.target)}`,
    `shareCount: ${formatField(snap.shareCount)}`,
    `currentFundingDecision: ${formatField(snap.currentFundingDecision)}`,
    `reservationStatus: ${formatField(snap.reservationStatus)}`,
    `blockingReasons: ${
      snap.blockingReasons.length > 0
        ? snap.blockingReasons.join("; ")
        : "none"
    }`,
    `existingReservationId: ${formatField(snap.existingReservationId)}`,
    "",
    "Allocation flow:",
    CAPITAL_ALLOCATION_FLOW_LINE,
    "",
    "mutatesCapital: false",
  ];
  return lines.join("\n");
}

const CAPITAL_ALLOCATION_FLOW_LINE =
  "Scout Plan → Scout Funding Snapshot → evaluation → capital-reservation-create → Control → Apply → Validate → Accept";

export function scoutFundingSnapshotItem(
  input: BuildScoutFundingSnapshotInput
): SnapshotMenuItem {
  const snap = buildScoutFundingSnapshot(input);
  return {
    id: SCOUT_FUNDING_SNAPSHOT_ID,
    label: SCOUT_FUNDING_SNAPSHOT_LABEL,
    description:
      "Canonical funding package for capital-reservation-create — read-only, no auto-reserve",
    text: wrapSnapshotText(
      SCOUT_FUNDING_SNAPSHOT_LABEL,
      formatScoutFundingSnapshotText(snap)
    ),
  };
}

/** Required field keys for validation tests. */
export const SCOUT_FUNDING_SNAPSHOT_REQUIRED_KEYS = [
  "planId",
  "stockFileId",
  "stockThesisId",
  "ticker",
  "requestedCapital",
  "estimatedRisk",
  "expiration",
  "entry",
  "stop",
  "target",
  "shareCount",
  "currentFundingDecision",
  "reservationStatus",
  "blockingReasons",
  "existingReservationId",
] as const;
