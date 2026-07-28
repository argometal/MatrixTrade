/**
 * Read-only Scout Allocation Snapshot package (26-55).
 * Never invents zeros for missing values; never mutates capital.
 */

import type { ScoutAllocationSimulationResult } from "./scout-allocation-types";
import type { ScoutPairRelationship } from "./scout-allocation-relationships";

export type ScoutAllocationSnapshotPackage = {
  type: "scout-allocation-simulation";
  readOnly: true;
  mutatesCapital: false;
  selectedPlanIds: string[];
  selectionOrder: string[];
  startingCapital: number | null;
  startingRiskRoom: number | null;
  selectedCapital: number | null;
  selectedRisk: number | null;
  remainingCapital: number | null;
  remainingRiskRoom: number | null;
  capitalDeficit: number | null;
  riskDeficit: number | null;
  portfolioStatus: ScoutAllocationSimulationResult["portfolioStatus"];
  thresholdCrossingPlanId: string | null;
  affectedScouts: Array<{
    planId: string;
    ticker: string;
    beforeDecision: string;
    afterDecision: string;
    relationship: string;
  }>;
  relationships: Array<{
    focusPlanId: string;
    otherPlanId: string;
    relationship: string;
  }>;
  existingReservationIds: string[];
  blockingReasons: string[];
  generatedAt: string;
};

function numOrNull(v: number | undefined): number | null {
  return v !== undefined && Number.isFinite(v) ? v : null;
}

export function buildScoutAllocationSnapshotPackage(input: {
  result: ScoutAllocationSimulationResult;
  selectedPlanIds: string[];
  selectionOrder: string[];
  existingReservationIds: string[];
  relationships?: ScoutPairRelationship[];
  generatedAt?: string;
}): ScoutAllocationSnapshotPackage {
  const { result } = input;
  return {
    type: "scout-allocation-simulation",
    readOnly: true,
    mutatesCapital: false,
    selectedPlanIds: [...input.selectedPlanIds],
    selectionOrder: [...input.selectionOrder],
    startingCapital: numOrNull(result.startingCapital),
    startingRiskRoom: numOrNull(result.startingRiskRoom),
    selectedCapital: numOrNull(result.selectedCapital),
    selectedRisk: numOrNull(result.selectedRisk),
    remainingCapital: numOrNull(result.remainingCapital),
    remainingRiskRoom: numOrNull(result.remainingRiskRoom),
    capitalDeficit: numOrNull(result.capitalDeficit),
    riskDeficit: numOrNull(result.riskDeficit),
    portfolioStatus: result.portfolioStatus,
    thresholdCrossingPlanId: result.thresholdCrossingPlanId ?? null,
    affectedScouts: result.affected.map((a) => ({
      planId: a.planId,
      ticker: a.ticker,
      beforeDecision: a.beforeDecision,
      afterDecision: a.afterDecision,
      relationship: a.relationship,
    })),
    relationships: (input.relationships ?? []).map((r) => ({
      focusPlanId: r.focusPlanId,
      otherPlanId: r.otherPlanId,
      relationship: r.relationship,
    })),
    existingReservationIds: [...input.existingReservationIds],
    blockingReasons: [...result.blockingReasons],
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

export function formatScoutAllocationSnapshotText(
  pkg: ScoutAllocationSnapshotPackage
): string {
  return JSON.stringify(pkg, null, 2);
}
