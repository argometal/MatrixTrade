/**
 * Build ScoutAllocationCandidate from canonical Scout Funding Snapshot (26-55).
 * Never duplicates monetary resolution; never uses manual placeholder shares.
 */

import type { CapitalReservation } from "./capital-types";
import type { TradePlan } from "./plan-types";
import {
  buildScoutFundingSnapshot,
  type BuildScoutFundingSnapshotInput,
  type ScoutFundingSnapshot,
  type ScoutFundingSnapshotField,
} from "./scout-funding-snapshot";
import type {
  ScoutAllocationCandidate,
  ScoutAllocationFundingDecision,
} from "./scout-allocation-types";
import type { FundingDecision } from "./capital-types";
import { FUNDING_DECISIONS } from "./capital-types";

function asFundingDecision(
  value: ScoutFundingSnapshotField<string>
): ScoutAllocationFundingDecision {
  if (value === "unconfigured" || value === "unknown") return "unassessed";
  if ((FUNDING_DECISIONS as readonly string[]).includes(value)) {
    return value as FundingDecision;
  }
  return "unassessed";
}

export function candidateFromFundingSnapshot(
  snap: ScoutFundingSnapshot,
  extras?: {
    plannedRR?: number;
    scoutStatus?: string;
    decisionStatus?: string;
    manualPriority?: number;
  }
): ScoutAllocationCandidate {
  const existingReservationId =
    typeof snap.existingReservationId === "string" &&
    snap.existingReservationId !== "unconfigured" &&
    snap.existingReservationId !== "unknown"
      ? snap.existingReservationId
      : undefined;
  const reservationStatus =
    typeof snap.reservationStatus === "string" &&
    snap.reservationStatus !== "unconfigured" &&
    snap.reservationStatus !== "unknown"
      ? snap.reservationStatus
      : undefined;

  return {
    planId: snap.planId,
    stockThesisId:
      typeof snap.stockThesisId === "string" &&
      snap.stockThesisId !== "unconfigured" &&
      snap.stockThesisId !== "unknown"
        ? snap.stockThesisId
        : undefined,
    ticker:
      typeof snap.ticker === "string" &&
      snap.ticker !== "unconfigured" &&
      snap.ticker !== "unknown"
        ? snap.ticker
        : snap.planId,
    requestedCapital: snap.requestedCapital,
    estimatedRisk: snap.estimatedRisk,
    shareCount: snap.shareCount,
    entry: snap.entry,
    stop: snap.stop,
    target: snap.target,
    plannedRR: extras?.plannedRR,
    scoutStatus: extras?.scoutStatus ?? "watching",
    decisionStatus: extras?.decisionStatus,
    expiresAt:
      typeof snap.expiration === "string" &&
      snap.expiration !== "unconfigured" &&
      snap.expiration !== "unknown"
        ? snap.expiration
        : undefined,
    existingReservationId,
    reservationStatus,
    fundingDecision: asFundingDecision(snap.currentFundingDecision),
    blockingReasons: [...snap.blockingReasons],
    manualPriority: extras?.manualPriority,
  };
}

export type BuildAllocationCandidateInput = BuildScoutFundingSnapshotInput & {
  plannedRR?: number;
  decisionStatus?: string;
  manualPriority?: number;
};

export function buildScoutAllocationCandidate(
  input: BuildAllocationCandidateInput
): ScoutAllocationCandidate {
  const snap = buildScoutFundingSnapshot(input);
  return candidateFromFundingSnapshot(snap, {
    plannedRR: input.plannedRR,
    scoutStatus: input.plan.status,
    decisionStatus: input.decisionStatus,
    manualPriority: input.manualPriority,
  });
}

export function buildScoutAllocationCandidates(input: {
  plans: TradePlan[];
  reservations?: CapitalReservation[];
  account?: BuildScoutFundingSnapshotInput["account"];
  authorizableLossRoom?: number;
  capitalConfigurationPresent?: boolean;
  plannedRRByPlanId?: Record<string, number | undefined>;
  manualPriorities?: Record<string, number>;
}): ScoutAllocationCandidate[] {
  return input.plans.map((plan) =>
    buildScoutAllocationCandidate({
      plan,
      // stockFileId omitted — never infer from thesis / ticker / plan id
      reservations: input.reservations,
      account: input.account,
      authorizableLossRoom: input.authorizableLossRoom,
      capitalConfigurationPresent: input.capitalConfigurationPresent,
      plannedRR: input.plannedRRByPlanId?.[plan.id],
      manualPriority: input.manualPriorities?.[plan.id],
    })
  );
}

export function finiteAllocationAmount(
  value: ScoutFundingSnapshotField<number>
): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}
