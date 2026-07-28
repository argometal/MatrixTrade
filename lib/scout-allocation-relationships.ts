/**
 * Pairwise Scout relationship analysis (26-55).
 * Considers both capital and risk via the shared simulator.
 */

import type { CapitalReservation } from "./capital-types";
import { simulateScoutAllocation } from "./scout-allocation-simulate";
import type {
  ScoutAllocationCandidate,
  ScoutAllocationFundingDecision,
  ScoutAllocationRelationship,
} from "./scout-allocation-types";

export type ScoutPairRelationship = {
  focusPlanId: string;
  otherPlanId: string;
  otherTicker: string;
  relationship: ScoutAllocationRelationship;
  focusAlone: ScoutAllocationFundingDecision;
  otherBaseline: ScoutAllocationFundingDecision;
  otherAfterFocus: ScoutAllocationFundingDecision;
  bothTogetherFocus: ScoutAllocationFundingDecision;
  bothTogetherOther: ScoutAllocationFundingDecision;
};

export type DeriveScoutRelationshipsInput = {
  focusPlanId: string;
  candidates: ScoutAllocationCandidate[];
  availableCapital: number | undefined;
  availableRiskRoom: number | undefined;
  existingReservations: CapitalReservation[];
};

function classifyPair(input: {
  otherBaseline: ScoutAllocationFundingDecision;
  otherAfterFocus: ScoutAllocationFundingDecision;
  bothTogetherFocus: ScoutAllocationFundingDecision;
  bothTogetherOther: ScoutAllocationFundingDecision;
  otherRelationshipHint?: ScoutAllocationRelationship;
}): ScoutAllocationRelationship {
  if (input.otherRelationshipHint === "blocked_independently") {
    return "blocked_independently";
  }
  if (input.otherRelationshipHint === "already_reserved") {
    return "already_reserved";
  }
  if (
    input.otherBaseline === "unassessed" ||
    input.otherAfterFocus === "unassessed" ||
    input.bothTogetherFocus === "unassessed" ||
    input.bothTogetherOther === "unassessed"
  ) {
    return "unassessed";
  }
  if (input.otherBaseline === "blocked") {
    return "blocked_independently";
  }

  const bothFully =
    input.bothTogetherFocus === "fully_funded" &&
    input.bothTogetherOther === "fully_funded";
  if (bothFully) return "compatible";

  if (
    input.otherBaseline === "fully_funded" &&
    input.otherAfterFocus === "partially_funded"
  ) {
    return "competing";
  }

  if (
    input.otherBaseline === "fully_funded" &&
    input.otherAfterFocus === "unfunded"
  ) {
    return "mutually_exclusive";
  }

  if (
    input.bothTogetherOther === "unfunded" ||
    input.bothTogetherFocus === "unfunded" ||
    input.bothTogetherOther === "partially_funded" ||
    input.bothTogetherFocus === "partially_funded"
  ) {
    return input.bothTogetherOther === "partially_funded" ||
      input.bothTogetherFocus === "partially_funded"
      ? "competing"
      : "mutually_exclusive";
  }

  return "unassessed";
}

/**
 * Relationship of every other candidate relative to the focused Scout.
 */
export function deriveScoutRelationships(
  input: DeriveScoutRelationshipsInput
): ScoutPairRelationship[] {
  const { focusPlanId, candidates } = input;
  const focus = candidates.find((c) => c.planId === focusPlanId);
  if (!focus) return [];

  const baseInput = {
    availableCapital: input.availableCapital,
    availableRiskRoom: input.availableRiskRoom,
    candidates,
    existingReservations: input.existingReservations,
  };

  const baseline = simulateScoutAllocation({
    ...baseInput,
    selectedPlanIds: [],
    selectionOrder: [],
  });
  const focusOnly = simulateScoutAllocation({
    ...baseInput,
    selectedPlanIds: [focusPlanId],
    selectionOrder: [focusPlanId],
  });

  const results: ScoutPairRelationship[] = [];

  for (const other of candidates) {
    if (other.planId === focusPlanId) continue;

    const both = simulateScoutAllocation({
      ...baseInput,
      selectedPlanIds: [focusPlanId, other.planId],
      selectionOrder: [focusPlanId, other.planId],
    });

    const otherBaseline =
      baseline.unaffected.find((i) => i.planId === other.planId)
        ?.beforeDecision ??
      baseline.affected.find((i) => i.planId === other.planId)?.beforeDecision ??
      other.fundingDecision;

    const afterFocusImpact =
      focusOnly.affected.find((i) => i.planId === other.planId) ??
      focusOnly.unaffected.find((i) => i.planId === other.planId);

    const otherAfterFocus =
      afterFocusImpact?.afterDecision ?? other.fundingDecision;

    const bothFocus =
      both.selected.find((i) => i.planId === focusPlanId)?.afterDecision ??
      "unassessed";
    const bothOther =
      both.selected.find((i) => i.planId === other.planId)?.afterDecision ??
      "unassessed";

    const focusAlone =
      focusOnly.selected.find((i) => i.planId === focusPlanId)?.afterDecision ??
      focus.fundingDecision;

    results.push({
      focusPlanId,
      otherPlanId: other.planId,
      otherTicker: other.ticker,
      relationship: classifyPair({
        otherBaseline,
        otherAfterFocus,
        bothTogetherFocus: bothFocus,
        bothTogetherOther: bothOther,
        otherRelationshipHint: afterFocusImpact?.relationship,
      }),
      focusAlone,
      otherBaseline,
      otherAfterFocus,
      bothTogetherFocus: bothFocus,
      bothTogetherOther: bothOther,
    });
  }

  return results;
}

export function summarizeRelationshipCounts(
  pairs: ScoutPairRelationship[]
): Record<ScoutAllocationRelationship, number> {
  const counts: Record<ScoutAllocationRelationship, number> = {
    compatible: 0,
    competing: 0,
    mutually_exclusive: 0,
    already_reserved: 0,
    blocked_independently: 0,
    unassessed: 0,
  };
  for (const p of pairs) {
    counts[p.relationship] += 1;
  }
  return counts;
}
