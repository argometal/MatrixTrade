import {
  PLAN_OUTCOME_EVIDENCE_STATUSES,
  PLAN_OUTCOME_SOURCES,
  PLAN_OUTCOME_STATUSES,
  type PlanOutcomeProposalInput,
  type PlanOutcomeStatus,
} from "./plan-outcome-types";

function parseOptionalBoolean(
  raw: unknown,
  label: string,
  errors: string[]
): boolean | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  errors.push(`${label} must be boolean or null`);
  return undefined;
}

function parseRequiredBoolean(
  raw: unknown,
  label: string,
  errors: string[]
): boolean | undefined {
  if (raw === undefined || raw === null || raw === "") {
    errors.push(`${label} required`);
    return undefined;
  }
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  errors.push(`${label} must be a boolean`);
  return undefined;
}

function parseOptionalNumber(
  raw: unknown,
  label: string,
  errors: string[]
): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    errors.push(`${label} must be a finite number or null`);
    return undefined;
  }
  return n;
}

export function validatePlanOutcomeProposal(
  proposal: Record<string, unknown>
):
  | { ok: true; value: PlanOutcomeProposalInput }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const planId = String(proposal.planId ?? "").trim().toUpperCase();
  if (!planId) errors.push("proposal.planId required");

  const statusRaw = String(proposal.status ?? "").trim();
  if (!(PLAN_OUTCOME_STATUSES as readonly string[]).includes(statusRaw)) {
    errors.push(
      `proposal.status must be one of: ${PLAN_OUTCOME_STATUSES.join(", ")}`
    );
  }
  const status = statusRaw as PlanOutcomeStatus;

  const tradeExecuted = parseRequiredBoolean(
    proposal.tradeExecuted,
    "tradeExecuted",
    errors
  );
  const entryTriggered = parseOptionalBoolean(
    proposal.entryTriggered,
    "entryTriggered",
    errors
  );
  const stopTriggered = parseOptionalBoolean(
    proposal.stopTriggered,
    "stopTriggered",
    errors
  );
  const targetTriggered = parseOptionalBoolean(
    proposal.targetTriggered,
    "targetTriggered",
    errors
  );

  const theoreticalResultR = parseOptionalNumber(
    proposal.theoreticalResultR,
    "theoreticalResultR",
    errors
  );
  let realizedResultR = parseOptionalNumber(
    proposal.realizedResultR,
    "realizedResultR",
    errors
  );
  if (realizedResultR === undefined) {
    // Default realized 0 when omitted and no trade — still validate when present.
    if (tradeExecuted === false) realizedResultR = 0;
    else errors.push("realizedResultR required when tradeExecuted is true");
  }

  const outcomeSource = String(proposal.outcomeSource ?? "").trim();
  if (!(PLAN_OUTCOME_SOURCES as readonly string[]).includes(outcomeSource)) {
    errors.push(
      `outcomeSource must be one of: ${PLAN_OUTCOME_SOURCES.join(", ")}`
    );
  }

  const evidenceStatus = String(proposal.evidenceStatus ?? "").trim();
  if (
    !(PLAN_OUTCOME_EVIDENCE_STATUSES as readonly string[]).includes(
      evidenceStatus
    )
  ) {
    errors.push(
      `evidenceStatus must be one of: ${PLAN_OUTCOME_EVIDENCE_STATUSES.join(", ")}`
    );
  }

  const evidenceRefs = Array.isArray(proposal.evidenceRefs)
    ? proposal.evidenceRefs.map((r) => String(r).trim()).filter(Boolean)
    : [];

  // Relationship rules (human-confirmed booleans — never invent event order).
  if (status === "theoretical_loss") {
    if (entryTriggered !== true) {
      errors.push("theoretical_loss requires entryTriggered: true");
    }
    if (stopTriggered !== true) {
      errors.push("theoretical_loss requires stopTriggered: true");
    }
  }
  if (status === "theoretical_win") {
    if (entryTriggered !== true) {
      errors.push("theoretical_win requires entryTriggered: true");
    }
    if (targetTriggered !== true) {
      errors.push("theoretical_win requires targetTriggered: true");
    }
  }
  if (status === "invalidated_before_entry") {
    if (entryTriggered !== false) {
      errors.push("invalidated_before_entry requires entryTriggered: false");
    }
  }
  if (status === "entry_not_triggered") {
    if (entryTriggered === true) {
      errors.push("entry_not_triggered cannot have entryTriggered: true");
    }
  }
  if (tradeExecuted === false && realizedResultR !== 0 && realizedResultR !== null) {
    errors.push("tradeExecuted:false requires realizedResultR: 0");
  }
  if (tradeExecuted === false && realizedResultR === null) {
    errors.push("tradeExecuted:false requires realizedResultR: 0 (not null)");
  }
  if (
    theoreticalResultR !== null &&
    theoreticalResultR !== undefined &&
    entryTriggered !== true &&
    status !== "theoretical_breakeven" &&
    status !== "inconclusive" &&
    status !== "theoretical_loss" &&
    status !== "theoretical_win"
  ) {
    errors.push(
      "theoreticalResultR may only be stored when entryTriggered is true (event order supported by evidence)"
    );
  }
  if (
    (status === "theoretical_loss" || status === "theoretical_win") &&
    (theoreticalResultR === null || theoreticalResultR === undefined)
  ) {
    errors.push(`${status} requires theoreticalResultR`);
  }
  if (entryTriggered === true && stopTriggered === true && targetTriggered === true) {
    errors.push(
      "stopTriggered and targetTriggered both true is contradictory without ordering evidence — mark inconclusive or pick first terminal"
    );
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      planId,
      status,
      tradeExecuted: tradeExecuted!,
      entryTriggered: entryTriggered ?? null,
      stopTriggered: stopTriggered ?? null,
      targetTriggered: targetTriggered ?? null,
      theoreticalResultR: theoreticalResultR ?? null,
      realizedResultR: realizedResultR as number,
      outcomeSource: outcomeSource as PlanOutcomeProposalInput["outcomeSource"],
      evidenceStatus:
        evidenceStatus as PlanOutcomeProposalInput["evidenceStatus"],
      notes: proposal.notes !== undefined ? String(proposal.notes).trim() || undefined : undefined,
      evidenceRefs,
      createdBy:
        proposal.createdBy !== undefined
          ? String(proposal.createdBy).trim() || undefined
          : undefined,
      reason:
        proposal.reason !== undefined
          ? String(proposal.reason).trim() || undefined
          : undefined,
      strategyStillValid:
        typeof proposal.strategyStillValid === "boolean"
          ? proposal.strategyStillValid
          : undefined,
      externalFactors: Array.isArray(proposal.externalFactors)
        ? proposal.externalFactors.map((x) => String(x).trim()).filter(Boolean)
        : undefined,
      lesson:
        proposal.lesson !== undefined
          ? String(proposal.lesson).trim() || undefined
          : undefined,
    },
  };
}
