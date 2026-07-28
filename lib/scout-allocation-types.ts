/**
 * Scout Allocation Board types (26-55).
 * Advisory / read-only — never invents capital, risk, or shares.
 */

import type { ScoutFundingSnapshotField } from "./scout-funding-snapshot";
import type { FundingDecision } from "./capital-types";

export type ScoutAllocationFundingDecision =
  | FundingDecision
  | "unassessed";

export type ScoutAllocationRelationship =
  | "compatible"
  | "competing"
  | "mutually_exclusive"
  | "already_reserved"
  | "blocked_independently"
  | "unassessed";

export type ScoutAllocationPortfolioStatus =
  | "fully_fundable"
  | "partially_fundable"
  | "overallocated"
  | "blocked"
  | "unassessed";

export type ScoutAllocationCandidate = {
  planId: string;
  stockThesisId?: string;
  ticker: string;
  requestedCapital: ScoutFundingSnapshotField<number>;
  estimatedRisk: ScoutFundingSnapshotField<number>;
  shareCount: ScoutFundingSnapshotField<number>;
  entry: ScoutFundingSnapshotField<number>;
  stop: ScoutFundingSnapshotField<number>;
  target: ScoutFundingSnapshotField<number>;
  plannedRR?: number;
  scoutStatus: string;
  decisionStatus?: string;
  expiresAt?: string;
  existingReservationId?: string;
  reservationStatus?: string;
  fundingDecision: ScoutAllocationFundingDecision;
  blockingReasons: string[];
  manualPriority?: number;
};

export type ScoutAllocationImpact = {
  planId: string;
  ticker: string;
  selected: boolean;
  order?: number;
  requestedCapital?: number;
  estimatedRisk?: number;
  beforeDecision: ScoutAllocationFundingDecision;
  afterDecision: ScoutAllocationFundingDecision;
  relationship: ScoutAllocationRelationship;
  capitalRemainingBefore?: number;
  capitalRemainingAfter?: number;
  riskRemainingBefore?: number;
  riskRemainingAfter?: number;
  displacementReason?: string;
};

export type ScoutAllocationSimulationInput = {
  availableCapital: number | undefined;
  availableRiskRoom: number | undefined;
  candidates: ScoutAllocationCandidate[];
  selectedPlanIds: string[];
  selectionOrder?: string[];
  manualPriorities?: Record<string, number>;
  existingReservations: import("./capital-types").CapitalReservation[];
};

export type ScoutAllocationSimulationResult = {
  startingCapital?: number;
  startingRiskRoom?: number;
  selectedCapital?: number;
  selectedRisk?: number;
  remainingCapital?: number;
  remainingRiskRoom?: number;
  capitalDeficit?: number;
  riskDeficit?: number;
  selected: ScoutAllocationImpact[];
  affected: ScoutAllocationImpact[];
  unaffected: ScoutAllocationImpact[];
  portfolioStatus: ScoutAllocationPortfolioStatus;
  thresholdCrossingPlanId?: string;
  blockingReasons: string[];
};

export const SCOUT_ALLOCATION_RELATIONSHIP_LABELS: Record<
  ScoutAllocationRelationship,
  string
> = {
  compatible: "Compatible",
  competing: "Competing",
  mutually_exclusive: "Mutually exclusive",
  already_reserved: "Already reserved",
  blocked_independently: "Blocked independently",
  unassessed: "Unassessed",
};

export const SCOUT_ALLOCATION_FUNDING_LABELS: Record<
  ScoutAllocationFundingDecision,
  string
> = {
  fully_funded: "Fully funded",
  partially_funded: "Partially funded",
  unfunded: "Unfunded",
  blocked: "Blocked",
  unassessed: "Unassessed",
};

export const SCOUT_ALLOCATION_PORTFOLIO_LABELS: Record<
  ScoutAllocationPortfolioStatus,
  string
> = {
  fully_fundable: "Fully fundable",
  partially_fundable: "Partially fundable",
  overallocated: "Overallocated",
  blocked: "Blocked",
  unassessed: "Unassessed",
};
