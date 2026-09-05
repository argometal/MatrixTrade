import {
  MISS_NON_EXECUTION_REASONS,
  PLAN_OUTCOME_EVIDENCE_STATUSES,
  PLAN_OUTCOME_KINDS,
  PLAN_OUTCOME_SOURCES,
  PLAN_OUTCOME_STATUSES,
  UPL_NON_EXECUTION_REASONS,
  type NonExecutionReason,
  type PlanOutcomeKind,
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

function rejectNonzeroWithoutTrade(
  proposal: Record<string, unknown>,
  tradeExecuted: boolean | undefined,
  errors: string[],
  opts?: { outcomeKind?: PlanOutcomeKind }
): void {
  if (tradeExecuted !== false) return;
  for (const key of ["realizedR", "realizedResultR", "realizedPnL"] as const) {
    if (proposal[key] === undefined || proposal[key] === null || proposal[key] === "") {
      continue;
    }
    const n = Number(proposal[key]);
    if (Number.isFinite(n) && n !== 0) {
      errors.push(`${key} must be 0 when no Trade/fill exists (server-derived)`);
    }
  }
  // AI-supplied counterfactualR is ignored as source of truth for UPL; reject wrong values.
  if (
    opts?.outcomeKind === "unexecuted_plan_loss" &&
    proposal.counterfactualR !== undefined &&
    proposal.counterfactualR !== null
  ) {
    const n = Number(proposal.counterfactualR);
    if (Number.isFinite(n) && n !== -1) {
      errors.push(
        "counterfactualR is server-derived for unexecuted_plan_loss (−1); do not supply a different value"
      );
    }
  }
  if (
    opts?.outcomeKind === "missed_opportunity" &&
    proposal.counterfactualR !== undefined &&
    proposal.counterfactualR !== null
  ) {
    errors.push(
      "counterfactualR is server-derived for missed_opportunity (+planned R); do not supply it"
    );
  }
}

/** UPL Apply shape (preferred): outcomeKind + event-order booleans. */
function validateUplProposal(
  proposal: Record<string, unknown>,
  planId: string,
  outcomeKind: PlanOutcomeKind
):
  | { ok: true; value: PlanOutcomeProposalInput }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (outcomeKind === "duplicate_creation") {
    const notes =
      proposal.notes !== undefined
        ? String(proposal.notes).trim() || undefined
        : undefined;
    if (errors.length) return { ok: false, errors };
    return {
      ok: true,
      value: {
        planId,
        status: "inconclusive",
        outcomeKind: "duplicate_creation",
        tradeExecuted: false,
        entryTriggered: null,
        stopTriggered: null,
        targetTriggered: null,
        theoreticalResultR: null,
        realizedResultR: 0,
        realizedPnL: 0,
        outcomeSource: "manual_review",
        evidenceStatus: "partial",
        notes,
        evidenceRefs: Array.isArray(proposal.evidenceRefs)
          ? proposal.evidenceRefs.map((r) => String(r).trim()).filter(Boolean)
          : [],
        uplContract: true,
      },
    };
  }

  if (outcomeKind === "missed_opportunity") {
    const entryReached = parseRequiredBoolean(
      proposal.entryReached ?? proposal.entryTriggered,
      "entryReached",
      errors
    );
    const stopReachedBeforeTarget = parseRequiredBoolean(
      proposal.stopReachedBeforeTarget ?? proposal.stopTriggered,
      "stopReachedBeforeTarget",
      errors
    );
    const targetReachedBeforeStop = parseRequiredBoolean(
      proposal.targetReachedBeforeStop ??
        (proposal.targetTriggered !== undefined
          ? proposal.targetTriggered
          : undefined),
      "targetReachedBeforeStop",
      errors
    );

    const reasonRaw = String(proposal.nonExecutionReason ?? "").trim();
    if (!(MISS_NON_EXECUTION_REASONS as readonly string[]).includes(reasonRaw)) {
      errors.push(
        `missed_opportunity requires nonExecutionReason: ${MISS_NON_EXECUTION_REASONS.join(", ")} (not an execution-failure reason)`
      );
    }

    rejectNonzeroWithoutTrade(proposal, false, errors, {
      outcomeKind: "missed_opportunity",
    });

    if (entryReached === true) {
      errors.push("missed_opportunity requires entryReached: false");
    }
    if (targetReachedBeforeStop === false) {
      errors.push("missed_opportunity requires targetReachedBeforeStop: true");
    }
    if (stopReachedBeforeTarget === true) {
      errors.push("missed_opportunity requires stopReachedBeforeTarget: false");
    }
    if (
      stopReachedBeforeTarget === true &&
      targetReachedBeforeStop === true
    ) {
      errors.push(
        "stopReachedBeforeTarget and targetReachedBeforeStop cannot both be true"
      );
    }

    if (errors.length) return { ok: false, errors };

    const evidenceRefs = Array.isArray(proposal.evidenceRefs)
      ? proposal.evidenceRefs.map((r) => String(r).trim()).filter(Boolean)
      : [];

    return {
      ok: true,
      value: {
        planId,
        status: "entry_not_triggered",
        outcomeKind: "missed_opportunity",
        tradeExecuted: false,
        entryTriggered: false,
        stopTriggered: false,
        targetTriggered: true,
        entryReached: false,
        stopReachedBeforeTarget: false,
        targetReachedBeforeStop: true,
        nonExecutionReason: reasonRaw as NonExecutionReason,
        // Server overwrites theoreticalResultR at persist from plan geometry.
        theoreticalResultR: null,
        realizedResultR: 0,
        realizedPnL: 0,
        outcomeSource: "counterfactual_observation",
        evidenceStatus: "verified",
        notes:
          proposal.notes !== undefined
            ? String(proposal.notes).trim() || undefined
            : undefined,
        evidenceRefs,
        createdBy:
          proposal.createdBy !== undefined
            ? String(proposal.createdBy).trim() || undefined
            : undefined,
        uplContract: true,
      },
    };
  }

  // unexecuted_plan_loss
  const entryReached = parseRequiredBoolean(
    proposal.entryReached ?? proposal.entryTriggered,
    "entryReached",
    errors
  );
  const stopReachedBeforeTarget = parseRequiredBoolean(
    proposal.stopReachedBeforeTarget ?? proposal.stopTriggered,
    "stopReachedBeforeTarget",
    errors
  );
  const targetReachedBeforeStop = parseRequiredBoolean(
    proposal.targetReachedBeforeStop ??
      (proposal.targetTriggered !== undefined
        ? proposal.targetTriggered
        : undefined),
    "targetReachedBeforeStop",
    errors
  );

  const reasonRaw = String(proposal.nonExecutionReason ?? "").trim();
  if (!(UPL_NON_EXECUTION_REASONS as readonly string[]).includes(reasonRaw)) {
    errors.push(
      `unexecuted_plan_loss nonExecutionReason must be one of: ${UPL_NON_EXECUTION_REASONS.join(", ")} (not entry_not_reached)`
    );
  }

  rejectNonzeroWithoutTrade(proposal, false, errors, {
    outcomeKind: "unexecuted_plan_loss",
  });

  if (entryReached === false) {
    errors.push("unexecuted_plan_loss requires entryReached: true");
  }
  if (stopReachedBeforeTarget === false) {
    errors.push("unexecuted_plan_loss requires stopReachedBeforeTarget: true");
  }
  if (targetReachedBeforeStop === true) {
    errors.push("unexecuted_plan_loss requires targetReachedBeforeStop: false");
  }
  if (
    stopReachedBeforeTarget === true &&
    targetReachedBeforeStop === true
  ) {
    errors.push(
      "stopReachedBeforeTarget and targetReachedBeforeStop cannot both be true"
    );
  }

  if (errors.length) return { ok: false, errors };

  const evidenceRefs = Array.isArray(proposal.evidenceRefs)
    ? proposal.evidenceRefs.map((r) => String(r).trim()).filter(Boolean)
    : [];

  return {
    ok: true,
    value: {
      planId,
      status: "theoretical_loss",
      outcomeKind: "unexecuted_plan_loss",
      tradeExecuted: false,
      entryTriggered: true,
      stopTriggered: true,
      targetTriggered: false,
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      nonExecutionReason: reasonRaw as NonExecutionReason,
      // Server-derived — ignore AI-supplied calculated result fields.
      theoreticalResultR: -1,
      realizedResultR: 0,
      realizedPnL: 0,
      outcomeSource: "counterfactual_observation",
      evidenceStatus: "verified",
      notes:
        proposal.notes !== undefined
          ? String(proposal.notes).trim() || undefined
          : undefined,
      evidenceRefs,
      createdBy:
        proposal.createdBy !== undefined
          ? String(proposal.createdBy).trim() || undefined
          : undefined,
      uplContract: true,
    },
  };
}

/** Legacy LEARNING-001 shape (status + trigger flags). */
function validateLegacyProposal(
  proposal: Record<string, unknown>,
  planId: string
):
  | { ok: true; value: PlanOutcomeProposalInput }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];

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

  let theoreticalResultR = parseOptionalNumber(
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

  if (status === "theoretical_loss") {
    if (entryTriggered !== true) {
      errors.push("theoretical_loss requires entryTriggered: true");
    }
    if (stopTriggered !== true) {
      errors.push("theoretical_loss requires stopTriggered: true");
    }
    // Align with UPL: server-derive counterfactual R when no trade.
    if (tradeExecuted === false) {
      theoreticalResultR = -1;
      realizedResultR = 0;
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
    (status === "theoretical_loss" || status === "theoretical_win") &&
    (theoreticalResultR === null || theoreticalResultR === undefined) &&
    tradeExecuted !== false
  ) {
    errors.push(`${status} requires theoreticalResultR`);
  }
  if (entryTriggered === true && stopTriggered === true && targetTriggered === true) {
    errors.push(
      "stopTriggered and targetTriggered both true is contradictory without ordering evidence — mark inconclusive or pick first terminal"
    );
  }

  rejectNonzeroWithoutTrade(proposal, tradeExecuted, errors);

  if (errors.length) return { ok: false, errors };

  const outcomeKind: PlanOutcomeKind | undefined =
    status === "theoretical_loss" && tradeExecuted === false
      ? "unexecuted_plan_loss"
      : undefined;

  return {
    ok: true,
    value: {
      planId,
      status,
      outcomeKind,
      tradeExecuted: tradeExecuted!,
      entryTriggered: entryTriggered ?? null,
      stopTriggered: stopTriggered ?? null,
      targetTriggered: targetTriggered ?? null,
      entryReached: entryTriggered ?? null,
      stopReachedBeforeTarget:
        stopTriggered === true && targetTriggered !== true ? true : stopTriggered === false ? false : null,
      targetReachedBeforeStop:
        targetTriggered === true && stopTriggered !== true ? true : targetTriggered === false ? false : null,
      theoreticalResultR: theoreticalResultR ?? null,
      realizedResultR: realizedResultR as number,
      realizedPnL: tradeExecuted ? undefined : 0,
      outcomeSource: outcomeSource as PlanOutcomeProposalInput["outcomeSource"],
      evidenceStatus:
        evidenceStatus as PlanOutcomeProposalInput["evidenceStatus"],
      notes:
        proposal.notes !== undefined
          ? String(proposal.notes).trim() || undefined
          : undefined,
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
      uplContract: false,
    },
  };
}

function attachPlanOutcomeRepair(
  value: PlanOutcomeProposalInput,
  proposal: Record<string, unknown>
):
  | { ok: true; value: PlanOutcomeProposalInput }
  | { ok: false; errors: string[] } {
  const raw = proposal.repairKind;
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value };
  }
  if (raw !== "corrected") {
    return {
      ok: false,
      errors: [
        "plan-outcome repairKind must be corrected when set (use thesis-t0-repair for Missing T0)",
      ],
    };
  }
  const note = String(proposal.repairNote ?? proposal.note ?? "").trim();
  if (note.length < 8) {
    return {
      ok: false,
      errors: [
        "corrected plan-outcome requires repairNote or note (≥8 chars) — why the prior outcome was wrong",
      ],
    };
  }
  return {
    ok: true,
    value: { ...value, repairKind: "corrected", repairNote: note },
  };
}

export function validatePlanOutcomeProposal(
  proposal: Record<string, unknown>
):
  | { ok: true; value: PlanOutcomeProposalInput }
  | { ok: false; errors: string[] } {
  const planId = String(proposal.planId ?? "").trim().toUpperCase();
  if (!planId) return { ok: false, errors: ["proposal.planId required"] };

  const kindRaw = String(proposal.outcomeKind ?? "").trim();
  let base:
    | { ok: true; value: PlanOutcomeProposalInput }
    | { ok: false; errors: string[] };
  if (kindRaw) {
    if (!(PLAN_OUTCOME_KINDS as readonly string[]).includes(kindRaw)) {
      return {
        ok: false,
        errors: [
          `outcomeKind must be one of: ${PLAN_OUTCOME_KINDS.join(", ")}`,
        ],
      };
    }
    base = validateUplProposal(proposal, planId, kindRaw as PlanOutcomeKind);
  } else if (
    proposal.status !== undefined &&
    proposal.status !== null &&
    proposal.status !== ""
  ) {
    base = validateLegacyProposal(proposal, planId);
  } else {
    return {
      ok: false,
      errors: [
        "proposal.outcomeKind or proposal.status required (prefer outcomeKind=unexecuted_plan_loss|missed_opportunity)",
      ],
    };
  }
  if (!base.ok) return base;
  return attachPlanOutcomeRepair(base.value, proposal);
}
