import {
  OBSERVATION_DATA_SOURCES,
  OBSERVATION_STATUSES,
  OBSERVATION_TERMINAL_EVENTS,
  type ObservationRecord,
  type ObservationUpdateInput,
} from "./observation-types";

/** Canonical Apply keys for observation-update (Prompt 25-10F). */
export const OBSERVATION_UPDATE_ALLOWED_KEYS = [
  "observationId",
  "id",
  "tradeId",
  "planId",
  "targetReached",
  "targetReachedAt",
  "thesisInvalidated",
  "invalidationReachedAt",
  "firstTerminalEvent",
  "maxPrice",
  "minPrice",
  "mfe",
  "mae",
  "mfeMaeUnit",
  "betterEntryAvailable",
  "betterEntryPrice",
  /** Optional capture for future fill learning — do not invent; human/AI supply when observed. */
  "closestApproach",
  "closestApproachAt",
  "entryTouched",
  "notes",
  "status",
  "dataSource",
] as const;

export const OBSERVATION_UPDATE_MEASURABLE_KEYS = [
  "targetReached",
  "targetReachedAt",
  "thesisInvalidated",
  "invalidationReachedAt",
  "firstTerminalEvent",
  "maxPrice",
  "minPrice",
  "mfe",
  "mae",
  "mfeMaeUnit",
  "betterEntryAvailable",
  "betterEntryPrice",
  "closestApproach",
  "closestApproachAt",
  "entryTouched",
  "notes",
  "status",
] as const;

function parseOptionalNumber(
  raw: unknown,
  label: string,
  errors: string[]
): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    errors.push(`${label} must be a finite number`);
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

function isIsoTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

export type ValidatedObservationUpdateProposal = {
  observationId?: string;
  tradeId?: string;
  planId?: string;
  patch: ObservationUpdateInput;
};

export function validateObservationUpdateProposal(
  proposal: Record<string, unknown>,
  existing?: Pick<ObservationRecord, "targetReached" | "thesisInvalidated">
):
  | { ok: true; value: ValidatedObservationUpdateProposal }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const unknown = Object.keys(proposal).filter(
    (k) => !(OBSERVATION_UPDATE_ALLOWED_KEYS as readonly string[]).includes(k)
  );
  if (unknown.length) {
    errors.push(
      `unknown observation-update keys: ${unknown.join(", ")} (allowed: ${OBSERVATION_UPDATE_ALLOWED_KEYS.join(", ")})`
    );
  }

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
  patch.closestApproach = parseOptionalNumber(
    proposal.closestApproach,
    "closestApproach",
    errors
  );
  patch.entryTouched = parseOptionalBoolean(
    proposal.entryTouched,
    "entryTouched",
    errors
  );

  if (proposal.closestApproachAt !== undefined) {
    const raw = String(proposal.closestApproachAt).trim();
    if (!raw) {
      patch.closestApproachAt = undefined;
    } else if (!isIsoTimestamp(raw)) {
      errors.push("closestApproachAt must be ISO-8601 UTC (…Z)");
    } else {
      patch.closestApproachAt = raw;
    }
  }

  if (proposal.targetReachedAt !== undefined) {
    const raw = String(proposal.targetReachedAt).trim();
    if (!raw) {
      patch.targetReachedAt = undefined;
    } else if (!isIsoTimestamp(raw)) {
      errors.push("targetReachedAt must be ISO-8601 UTC (…Z)");
    } else {
      patch.targetReachedAt = raw;
    }
  }
  if (proposal.invalidationReachedAt !== undefined) {
    const raw = String(proposal.invalidationReachedAt).trim();
    if (!raw) {
      patch.invalidationReachedAt = undefined;
    } else if (!isIsoTimestamp(raw)) {
      errors.push("invalidationReachedAt must be ISO-8601 UTC (…Z)");
    } else {
      patch.invalidationReachedAt = raw;
    }
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

  const effectiveTargetReached = patch.targetReached ?? existing?.targetReached;
  const effectiveThesisInvalidated =
    patch.thesisInvalidated ?? existing?.thesisInvalidated;
  if (patch.targetReachedAt !== undefined && effectiveTargetReached !== true) {
    errors.push("targetReachedAt requires targetReached: true");
  }
  if (
    patch.invalidationReachedAt !== undefined &&
    effectiveThesisInvalidated !== true
  ) {
    errors.push("invalidationReachedAt requires thesisInvalidated: true");
  }

  const hasMeasurable = OBSERVATION_UPDATE_MEASURABLE_KEYS.some(
    (k) => patch[k as keyof ObservationUpdateInput] !== undefined
  );
  if (!hasMeasurable) {
    errors.push(
      "At least one measurable observation field required (targetReached, mfe, mae, maxPrice, status, notes, …)"
    );
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { observationId, tradeId, planId, patch } };
}

export function buildObservationUpdateContractText(): string {
  return [
    "=== OBSERVATION-UPDATE ===",
    "Canonical Observation Engine Apply block. Partial observations allowed before the 90-day window ends.",
    "Observation ≠ attribution. Does not auto-change lossClassification or create MAF.",
    "Never invent prices, timestamps, MFE/MAE, or event order.",
    "",
    "Identity (exactly resolve one ObservationRecord):",
    "- observationId — update existing OBS-xxx",
    "- tradeId — create (closed trade, none exists) or idempotent update when exactly one OBS exists",
    "- planId — create/update for missed-scout observation path",
    "Reject ambiguous identity mismatches (observationId vs tradeId/planId disagree).",
    "Never create duplicate ObservationRecords for the same tradeId or planId.",
    "",
    `Allowed proposal keys: ${OBSERVATION_UPDATE_ALLOWED_KEYS.join(", ")}`,
    "",
    "Canonical field map (do NOT invent aliases):",
    "- thesisInvalidated — thesis/invalidation reached (not invalidationReached)",
    "- maxPrice / minPrice — excursion extremes observed",
    "- mfe / mae + mfeMaeUnit (price|r)",
    "- status: observing | concluded  (partial = observing; complete = concluded)",
    "- startedAt/endsAt/durationDays are owned by the ObservationRecord seed (from close / postStopStudy) — not overwritten by this block unless already on the record",
    "",
    "Required:",
    "- one of observationId | tradeId | planId",
    "- at least one measurable field",
    "- targetReachedAt ⇒ targetReached: true",
    "- invalidationReachedAt ⇒ thesisInvalidated: true",
    "- timestamps ISO-8601 UTC (…Z); prices/MFE/MAE finite numbers",
    "",
    "Create example (partial — H001-style):",
    JSON.stringify(
      {
        type: "observation-update",
        source: "ai-block",
        proposal: {
          tradeId: "H001",
          targetReached: false,
          maxPrice: 255,
          mfe: 15,
          mfeMaeUnit: "price",
          status: "observing",
          dataSource: "ai",
          notes:
            "Human-stated latestObservedPrice 232 on 2026-07-25. Study remains active; not inventing target/invalidation times.",
        },
      },
      null,
      2
    ),
    "",
    "Partial update example (by observationId):",
    JSON.stringify(
      {
        type: "observation-update",
        source: "ai-block",
        proposal: {
          observationId: "OBS-AMZN-001",
          mae: 8,
          mfeMaeUnit: "price",
          notes: "Updated MAE from later observation; omitted fields unchanged.",
        },
      },
      null,
      2
    ),
    "",
    "Completed observation example:",
    JSON.stringify(
      {
        type: "observation-update",
        source: "ai-block",
        proposal: {
          tradeId: "H001",
          targetReached: true,
          targetReachedAt: "2026-08-10T15:30:00.000Z",
          thesisInvalidated: false,
          firstTerminalEvent: "target",
          maxPrice: 272,
          mfe: 32,
          mfeMaeUnit: "price",
          status: "concluded",
          dataSource: "ai",
          notes: "Target observed after stop; thesis invalidation never reached.",
        },
      },
      null,
      2
    ),
  ].join("\n");
}
