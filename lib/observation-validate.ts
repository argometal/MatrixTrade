import {
  OBSERVATION_DATA_SOURCES,
  OBSERVATION_STATUSES,
  OBSERVATION_TERMINAL_EVENTS,
  type ObservationUpdateInput,
} from "./observation-types";

function parseOptionalNumber(
  raw: unknown,
  label: string,
  errors: string[]
): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    errors.push(`${label} must be a number`);
    return undefined;
  }
  return n;
}

function parseOptionalBoolean(
  raw: unknown,
  label: string,
  errors: string[]
): boolean | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  errors.push(`${label} must be a boolean`);
  return undefined;
}

export type ValidatedObservationUpdateProposal = {
  observationId?: string;
  tradeId?: string;
  planId?: string;
  patch: ObservationUpdateInput;
};

export function validateObservationUpdateProposal(
  proposal: Record<string, unknown>
):
  | { ok: true; value: ValidatedObservationUpdateProposal }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const observationId = proposal.observationId
    ? String(proposal.observationId).trim().toUpperCase()
    : proposal.id
      ? String(proposal.id).trim().toUpperCase()
      : undefined;
  const tradeId = proposal.tradeId
    ? String(proposal.tradeId).trim().toUpperCase()
    : undefined;
  const planId = proposal.planId
    ? String(proposal.planId).trim().toUpperCase()
    : undefined;

  if (!observationId && !tradeId && !planId) {
    errors.push("proposal requires observationId, tradeId, or planId");
  }

  const patch: ObservationUpdateInput = {};
  patch.targetReached = parseOptionalBoolean(
    proposal.targetReached,
    "targetReached",
    errors
  );
  patch.thesisInvalidated = parseOptionalBoolean(
    proposal.thesisInvalidated,
    "thesisInvalidated",
    errors
  );
  patch.betterEntryAvailable = parseOptionalBoolean(
    proposal.betterEntryAvailable,
    "betterEntryAvailable",
    errors
  );
  patch.maxPrice = parseOptionalNumber(proposal.maxPrice, "maxPrice", errors);
  patch.minPrice = parseOptionalNumber(proposal.minPrice, "minPrice", errors);
  patch.mfe = parseOptionalNumber(proposal.mfe, "mfe", errors);
  patch.mae = parseOptionalNumber(proposal.mae, "mae", errors);
  patch.betterEntryPrice = parseOptionalNumber(
    proposal.betterEntryPrice,
    "betterEntryPrice",
    errors
  );

  if (proposal.targetReachedAt !== undefined) {
    patch.targetReachedAt = String(proposal.targetReachedAt).trim() || undefined;
  }
  if (proposal.invalidationReachedAt !== undefined) {
    patch.invalidationReachedAt =
      String(proposal.invalidationReachedAt).trim() || undefined;
  }
  if (proposal.notes !== undefined) {
    patch.notes = String(proposal.notes).trim() || undefined;
  }

  if (proposal.mfeMaeUnit !== undefined) {
    const unit = String(proposal.mfeMaeUnit);
    if (unit !== "price" && unit !== "r") {
      errors.push("mfeMaeUnit must be price|r");
    } else {
      patch.mfeMaeUnit = unit;
    }
  }

  if (proposal.firstTerminalEvent !== undefined) {
    const ev = String(proposal.firstTerminalEvent);
    if (!(OBSERVATION_TERMINAL_EVENTS as readonly string[]).includes(ev)) {
      errors.push(
        `firstTerminalEvent must be one of: ${OBSERVATION_TERMINAL_EVENTS.join(", ")}`
      );
    } else {
      patch.firstTerminalEvent = ev as ObservationUpdateInput["firstTerminalEvent"];
    }
  }

  if (proposal.status !== undefined) {
    const st = String(proposal.status);
    if (!(OBSERVATION_STATUSES as readonly string[]).includes(st)) {
      errors.push(`status must be one of: ${OBSERVATION_STATUSES.join(", ")}`);
    } else {
      patch.status = st as ObservationUpdateInput["status"];
    }
  }

  if (proposal.dataSource !== undefined) {
    const ds = String(proposal.dataSource);
    if (!(OBSERVATION_DATA_SOURCES as readonly string[]).includes(ds)) {
      errors.push(`dataSource must be one of: ${OBSERVATION_DATA_SOURCES.join(", ")}`);
    } else {
      patch.dataSource = ds as ObservationUpdateInput["dataSource"];
    }
  }

  const hasField = Object.values(patch).some((v) => v !== undefined);
  if (!hasField) {
    errors.push(
      "At least one observation field required (targetReached, mfe, mae, maxPrice, …)"
    );
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { observationId, tradeId, planId, patch } };
}
