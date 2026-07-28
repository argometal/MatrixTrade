/**
 * Pure Scout allocation simulator (26-55).
 * Deterministic, read-only — does not reserve capital or invent values.
 */

import type { CapitalReservation } from "./capital-types";
import { isActiveReservation } from "./capital-types";
import { finiteAllocationAmount } from "./scout-allocation-candidates";
import type {
  ScoutAllocationCandidate,
  ScoutAllocationFundingDecision,
  ScoutAllocationImpact,
  ScoutAllocationPortfolioStatus,
  ScoutAllocationRelationship,
  ScoutAllocationSimulationInput,
  ScoutAllocationSimulationResult,
} from "./scout-allocation-types";

const EPS = 1e-9;

function activeReservationsFor(
  reservations: CapitalReservation[],
  planId?: string
): CapitalReservation[] {
  return reservations.filter(
    (r) => isActiveReservation(r) && (planId === undefined || r.planId === planId)
  );
}

function hasOwnActiveReservation(
  candidate: ScoutAllocationCandidate,
  reservations: CapitalReservation[]
): boolean {
  if (candidate.existingReservationId) {
    const own = reservations.find((r) => r.id === candidate.existingReservationId);
    if (own && isActiveReservation(own)) return true;
  }
  return activeReservationsFor(reservations, candidate.planId).length > 0;
}

function isIndependentlyBlocked(candidate: ScoutAllocationCandidate): boolean {
  const reasons = candidate.blockingReasons;
  const independent = [
    "missing execution levels",
    "expired Scout",
    "invalid requestedCapital",
    "invalid estimatedRisk",
    "missing capital configuration",
  ];
  if (candidate.scoutStatus === "expired") return true;
  if (reasons.some((r) => independent.includes(r))) return true;
  // Duplicate active reservation conflict (more than one active) is independent
  if (reasons.includes("conflicting reservation") && !candidate.existingReservationId) {
    return true;
  }
  return candidate.fundingDecision === "blocked" &&
    !reasons.some(
      (r) =>
        r.includes("insufficient settled cash") ||
        r.includes("insufficient monthly")
    );
}

function orderSelectedPlanIds(
  selectedPlanIds: string[],
  selectionOrder: string[] | undefined,
  manualPriorities: Record<string, number> | undefined,
  candidates: ScoutAllocationCandidate[]
): string[] {
  const selected = new Set(selectedPlanIds);
  const byId = new Map(candidates.map((c) => [c.planId, c]));

  const explicit = (selectionOrder ?? []).filter((id) => selected.has(id));
  const remaining = selectedPlanIds.filter((id) => !explicit.includes(id));

  remaining.sort((a, b) => {
    const pa =
      manualPriorities?.[a] ??
      byId.get(a)?.manualPriority ??
      Number.POSITIVE_INFINITY;
    const pb =
      manualPriorities?.[b] ??
      byId.get(b)?.manualPriority ??
      Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });

  return [...explicit, ...remaining];
}

function decideAgainstCapacity(input: {
  requestedCapital: number | undefined;
  estimatedRisk: number | undefined;
  availableCapital: number | undefined;
  availableRiskRoom: number | undefined;
  independentlyBlocked: boolean;
}): {
  decision: ScoutAllocationFundingDecision;
  capitalDeficit?: number;
  riskDeficit?: number;
  reason?: string;
} {
  if (input.independentlyBlocked) {
    return { decision: "blocked", reason: "blocked independently" };
  }
  if (
    input.requestedCapital === undefined ||
    input.estimatedRisk === undefined
  ) {
    return { decision: "unassessed", reason: "capital or risk unconfigured" };
  }
  if (
    input.availableCapital === undefined ||
    input.availableRiskRoom === undefined
  ) {
    return { decision: "unassessed", reason: "capacity unconfigured" };
  }

  const capitalOk = input.requestedCapital <= input.availableCapital + EPS;
  const riskOk = input.estimatedRisk <= input.availableRiskRoom + EPS;

  if (capitalOk && riskOk) {
    return { decision: "fully_funded" };
  }

  const capitalDeficit =
    input.requestedCapital > input.availableCapital + EPS
      ? input.requestedCapital - input.availableCapital
      : undefined;
  const riskDeficit =
    input.estimatedRisk > input.availableRiskRoom + EPS
      ? input.estimatedRisk - input.availableRiskRoom
      : undefined;

  if (
    !capitalOk &&
    input.availableCapital > 0 &&
    riskOk
  ) {
    return {
      decision: "partially_funded",
      capitalDeficit,
      riskDeficit,
      reason: "insufficient capital for full funding",
    };
  }

  if (!capitalOk && input.availableCapital > 0 && !riskOk) {
    return {
      decision: "partially_funded",
      capitalDeficit,
      riskDeficit,
      reason: "insufficient capital and risk room",
    };
  }

  return {
    decision: "unfunded",
    capitalDeficit,
    riskDeficit,
    reason: !capitalOk
      ? "insufficient capital"
      : "insufficient risk room",
  };
}

function classifyNonSelectedRelationship(input: {
  before: ScoutAllocationFundingDecision;
  after: ScoutAllocationFundingDecision;
  alreadyReserved: boolean;
  independentlyBlocked: boolean;
  metricsUnassessed: boolean;
}): ScoutAllocationRelationship {
  if (input.independentlyBlocked) return "blocked_independently";
  if (input.alreadyReserved) return "already_reserved";
  if (
    input.metricsUnassessed ||
    input.before === "unassessed" ||
    input.after === "unassessed"
  ) {
    return "unassessed";
  }
  if (input.before === "fully_funded" && input.after === "fully_funded") {
    return "compatible";
  }
  if (input.before === "fully_funded" && input.after === "partially_funded") {
    return "competing";
  }
  if (input.before === "fully_funded" && input.after === "unfunded") {
    return "mutually_exclusive";
  }
  if (
    input.before === "partially_funded" &&
    (input.after === "unfunded" || input.after === "partially_funded")
  ) {
    return input.after === "unfunded" ? "mutually_exclusive" : "competing";
  }
  if (input.after === "blocked") return "blocked_independently";
  return "unassessed";
}

function classifySelectedRelationship(input: {
  alreadyReserved: boolean;
  independentlyBlocked: boolean;
  decision: ScoutAllocationFundingDecision;
  crossedThreshold: boolean;
}): ScoutAllocationRelationship {
  if (input.independentlyBlocked) return "blocked_independently";
  if (input.alreadyReserved) return "already_reserved";
  if (input.decision === "unassessed") return "unassessed";
  if (input.crossedThreshold || input.decision === "unfunded") {
    return "mutually_exclusive";
  }
  if (input.decision === "partially_funded") return "competing";
  if (input.decision === "fully_funded") return "compatible";
  return "unassessed";
}

export function simulateScoutAllocation(
  input: ScoutAllocationSimulationInput
): ScoutAllocationSimulationResult {
  const candidates = input.candidates;
  const byId = new Map(candidates.map((c) => [c.planId, c]));
  const reservations = input.existingReservations ?? [];
  const orderedIds = orderSelectedPlanIds(
    input.selectedPlanIds,
    input.selectionOrder,
    input.manualPriorities,
    candidates
  );

  const startingCapital = input.availableCapital;
  const startingRiskRoom = input.availableRiskRoom;
  const capacityKnown =
    startingCapital !== undefined &&
    Number.isFinite(startingCapital) &&
    startingRiskRoom !== undefined &&
    Number.isFinite(startingRiskRoom);

  let remainingCapital = startingCapital;
  let remainingRiskRoom = startingRiskRoom;
  let selectedCapital = 0;
  let selectedRisk = 0;
  let capitalDeficit: number | undefined;
  let riskDeficit: number | undefined;
  let thresholdCrossingPlanId: string | undefined;
  const blockingReasons: string[] = [];
  const selectedImpacts: ScoutAllocationImpact[] = [];
  const selectedSet = new Set(orderedIds);

  orderedIds.forEach((planId, index) => {
    const candidate = byId.get(planId);
    if (!candidate) {
      blockingReasons.push(`unknown plan ${planId}`);
      return;
    }

    const req = finiteAllocationAmount(candidate.requestedCapital);
    const risk = finiteAllocationAmount(candidate.estimatedRisk);
    const independentlyBlocked = isIndependentlyBlocked(candidate);
    const alreadyReserved = hasOwnActiveReservation(candidate, reservations);
    const capitalBefore = remainingCapital;
    const riskBefore = remainingRiskRoom;

    let afterDecision: ScoutAllocationFundingDecision;
    let relationship: ScoutAllocationRelationship;
    let displacementReason: string | undefined;
    let crossed = false;

    if (independentlyBlocked) {
      afterDecision = "blocked";
      relationship = "blocked_independently";
      displacementReason = candidate.blockingReasons[0] ?? "blocked independently";
      blockingReasons.push(`${planId}: ${displacementReason}`);
    } else if (alreadyReserved) {
      // Own active reservation already consumes capacity in availableCapital —
      // do not charge again.
      afterDecision =
        candidate.fundingDecision === "blocked"
          ? "blocked"
          : "fully_funded";
      relationship = "already_reserved";
    } else {
      const decided = decideAgainstCapacity({
        requestedCapital: req,
        estimatedRisk: risk,
        availableCapital: remainingCapital,
        availableRiskRoom: remainingRiskRoom,
        independentlyBlocked: false,
      });
      afterDecision = decided.decision;
      if (decided.capitalDeficit !== undefined) {
        capitalDeficit = (capitalDeficit ?? 0) + decided.capitalDeficit;
      }
      if (decided.riskDeficit !== undefined) {
        riskDeficit = (riskDeficit ?? 0) + decided.riskDeficit;
      }
      if (
        decided.decision !== "fully_funded" &&
        thresholdCrossingPlanId === undefined &&
        decided.decision !== "unassessed"
      ) {
        thresholdCrossingPlanId = planId;
        crossed = true;
      }
      displacementReason = decided.reason;
      relationship = classifySelectedRelationship({
        alreadyReserved: false,
        independentlyBlocked: false,
        decision: afterDecision,
        crossedThreshold: crossed,
      });

      if (afterDecision === "fully_funded" && req !== undefined && risk !== undefined) {
        selectedCapital += req;
        selectedRisk += risk;
        if (remainingCapital !== undefined) remainingCapital -= req;
        if (remainingRiskRoom !== undefined) remainingRiskRoom -= risk;
      } else if (
        afterDecision === "partially_funded" &&
        req !== undefined &&
        risk !== undefined &&
        remainingCapital !== undefined &&
        remainingCapital > 0
      ) {
        // Conceptual partial consume of remaining capital; risk only if room allows.
        selectedCapital += remainingCapital;
        if (
          remainingRiskRoom !== undefined &&
          risk <= remainingRiskRoom + EPS
        ) {
          selectedRisk += risk;
          remainingRiskRoom -= risk;
        }
        remainingCapital = 0;
      }
    }

    selectedImpacts.push({
      planId,
      ticker: candidate.ticker,
      selected: true,
      order: index + 1,
      requestedCapital: req,
      estimatedRisk: risk,
      beforeDecision: candidate.fundingDecision,
      afterDecision,
      relationship,
      capitalRemainingBefore:
        capitalBefore !== undefined ? capitalBefore : undefined,
      capitalRemainingAfter:
        remainingCapital !== undefined ? remainingCapital : undefined,
      riskRemainingBefore: riskBefore !== undefined ? riskBefore : undefined,
      riskRemainingAfter:
        remainingRiskRoom !== undefined ? remainingRiskRoom : undefined,
      displacementReason,
    });
  });

  const nonSelectedImpacts: ScoutAllocationImpact[] = [];

  for (const candidate of candidates) {
    if (selectedSet.has(candidate.planId)) continue;

    const req = finiteAllocationAmount(candidate.requestedCapital);
    const risk = finiteAllocationAmount(candidate.estimatedRisk);
    const independentlyBlocked = isIndependentlyBlocked(candidate);
    const alreadyReserved = hasOwnActiveReservation(candidate, reservations);
    const metricsUnassessed = req === undefined || risk === undefined;

    const before = candidate.fundingDecision;
    let after: ScoutAllocationFundingDecision;

    if (independentlyBlocked) {
      after = "blocked";
    } else if (alreadyReserved) {
      after = "fully_funded";
    } else {
      after = decideAgainstCapacity({
        requestedCapital: req,
        estimatedRisk: risk,
        availableCapital: remainingCapital,
        availableRiskRoom: remainingRiskRoom,
        independentlyBlocked: false,
      }).decision;
    }

    const relationship = classifyNonSelectedRelationship({
      before,
      after,
      alreadyReserved,
      independentlyBlocked,
      metricsUnassessed: metricsUnassessed || !capacityKnown,
    });

    nonSelectedImpacts.push({
      planId: candidate.planId,
      ticker: candidate.ticker,
      selected: false,
      requestedCapital: req,
      estimatedRisk: risk,
      beforeDecision: before,
      afterDecision: after,
      relationship,
      capitalRemainingBefore: startingCapital,
      capitalRemainingAfter: remainingCapital,
      riskRemainingBefore: startingRiskRoom,
      riskRemainingAfter: remainingRiskRoom,
      displacementReason:
        before !== after
          ? `${before} → ${after}`
          : undefined,
    });
  }

  const affected = nonSelectedImpacts.filter(
    (i) =>
      i.beforeDecision !== i.afterDecision ||
      i.relationship === "competing" ||
      i.relationship === "mutually_exclusive"
  );
  const unaffected = nonSelectedImpacts.filter(
    (i) => !affected.some((a) => a.planId === i.planId)
  );

  let portfolioStatus: ScoutAllocationPortfolioStatus;
  if (!capacityKnown && orderedIds.length > 0) {
    portfolioStatus = "unassessed";
  } else if (orderedIds.length === 0) {
    portfolioStatus = capacityKnown ? "fully_fundable" : "unassessed";
  } else if (selectedImpacts.some((i) => i.afterDecision === "blocked")) {
    portfolioStatus = "blocked";
  } else if (
    selectedImpacts.some(
      (i) =>
        i.afterDecision === "unfunded" || i.afterDecision === "partially_funded"
    )
  ) {
    portfolioStatus =
      selectedImpacts.every(
        (i) =>
          i.afterDecision === "unfunded" || i.afterDecision === "blocked"
      )
        ? "overallocated"
        : "partially_fundable";
  } else if (selectedImpacts.some((i) => i.afterDecision === "unassessed")) {
    portfolioStatus = "unassessed";
  } else {
    portfolioStatus = "fully_fundable";
  }

  if (
    capitalDeficit !== undefined &&
    capitalDeficit > 0 &&
    portfolioStatus === "fully_fundable"
  ) {
    portfolioStatus = "overallocated";
  }

  return {
    startingCapital,
    startingRiskRoom,
    selectedCapital: orderedIds.length > 0 ? selectedCapital : undefined,
    selectedRisk: orderedIds.length > 0 ? selectedRisk : undefined,
    remainingCapital,
    remainingRiskRoom,
    capitalDeficit,
    riskDeficit,
    selected: selectedImpacts,
    affected,
    unaffected,
    portfolioStatus,
    thresholdCrossingPlanId,
    blockingReasons: [...new Set(blockingReasons)],
  };
}

export function impactByPlanId(
  result: ScoutAllocationSimulationResult
): Map<string, ScoutAllocationImpact> {
  const map = new Map<string, ScoutAllocationImpact>();
  for (const row of [
    ...result.selected,
    ...result.affected,
    ...result.unaffected,
  ]) {
    map.set(row.planId, row);
  }
  return map;
}
