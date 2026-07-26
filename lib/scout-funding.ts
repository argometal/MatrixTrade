/**
 * Pure Scout funding evaluation — does not persist or auto-reserve.
 */
import type { CapitalReservation, FundingDecision } from "./capital-types";
import { isActiveReservation } from "./capital-types";

export type ScoutFundingInput = {
  requestedCapital: number;
  estimatedRisk: number;
  availableCapital?: number;
  authorizableLossRoom?: number;
  existingReservations?: CapitalReservation[];
  priority?: number;
  capitalConfigurationPresent?: boolean;
  scoutExpired?: boolean;
  executionLevelsPresent?: boolean;
  planId?: string;
};

export type ScoutFundingResult = {
  fundingDecision: FundingDecision;
  reasons: string[];
  executable: boolean;
};

export function evaluateScoutFunding(
  input: ScoutFundingInput
): ScoutFundingResult {
  const reasons: string[] = [];
  const requested = Number(input.requestedCapital);
  const risk = Number(input.estimatedRisk);

  if (!Number.isFinite(requested) || requested < 0) {
    reasons.push("invalid requestedCapital");
  }
  if (!Number.isFinite(risk) || risk < 0) {
    reasons.push("invalid estimatedRisk");
  }

  if (input.capitalConfigurationPresent === false) {
    reasons.push("missing capital configuration");
  }
  if (input.scoutExpired === true) {
    reasons.push("expired Scout");
  }
  if (input.executionLevelsPresent === false) {
    reasons.push("missing execution levels");
  }

  const reservations = input.existingReservations ?? [];
  if (input.planId) {
    const conflict = reservations.find(
      (r) => r.planId === input.planId && isActiveReservation(r)
    );
    if (conflict) {
      reasons.push("conflicting reservation");
    }
  }

  const cashKnown =
    input.availableCapital !== undefined &&
    Number.isFinite(input.availableCapital);
  const riskKnown =
    input.authorizableLossRoom !== undefined &&
    Number.isFinite(input.authorizableLossRoom);

  if (!cashKnown) {
    reasons.push("insufficient settled cash");
    // more precisely: cash unavailable to evaluate
    if (!reasons.includes("missing capital configuration")) {
      reasons.push("available capital unconfigured");
    }
  } else if (requested > (input.availableCapital as number) + 1e-9) {
    reasons.push("insufficient settled cash");
  }

  if (!riskKnown) {
    reasons.push("insufficient monthly/experiment risk room");
    reasons.push("missing risk model");
  } else if (risk > (input.authorizableLossRoom as number) + 1e-9) {
    reasons.push("insufficient monthly/experiment risk room");
  }

  const blocking = reasons.filter(
    (r) =>
      r === "missing capital configuration" ||
      r === "conflicting reservation" ||
      r === "expired Scout" ||
      r === "missing execution levels" ||
      r === "invalid requestedCapital" ||
      r === "invalid estimatedRisk"
  );

  let fundingDecision: FundingDecision;
  if (blocking.length > 0) {
    fundingDecision = "blocked";
  } else if (!cashKnown || !riskKnown) {
    fundingDecision = "unassessed";
  } else if (
    requested <= (input.availableCapital as number) + 1e-9 &&
    risk <= (input.authorizableLossRoom as number) + 1e-9
  ) {
    fundingDecision = "fully_funded";
  } else if (
    (input.availableCapital as number) > 0 &&
    requested > (input.availableCapital as number)
  ) {
    fundingDecision = "partially_funded";
    if (!reasons.includes("insufficient settled cash")) {
      reasons.push("insufficient settled cash");
    }
  } else {
    fundingDecision = "unfunded";
  }

  const executable =
    fundingDecision === "fully_funded" &&
    riskKnown &&
    risk <= (input.authorizableLossRoom as number) + 1e-9 &&
    input.scoutExpired !== true &&
    input.executionLevelsPresent !== false;

  return {
    fundingDecision,
    reasons: [...new Set(reasons)],
    executable,
  };
}
