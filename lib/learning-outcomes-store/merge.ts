/**
 * Canonical Learning Outcome merge + freshness — never clear protected links with undefined.
 * Immutable identity: planId / tradeId never change once persisted.
 */
import type { LearningOutcome } from "../learning-outcome-types";

export type LearningOutcomeFreshness =
  | "incoming_newer"
  | "existing_newer"
  | "equal";

export type TimestampValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Fields that may be intentionally cleared with explicit null. */
const NULL_CLEARABLE = new Set<keyof LearningOutcome>([
  "notes",
  "counterfactualDollarResult",
]);

export function isValidLearningOutcomeTimestamp(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

export function validateLearningOutcomeTimestamps(
  row: Pick<LearningOutcome, "createdAt" | "updatedAt"> & { id?: string }
): TimestampValidationResult {
  const errors: string[] = [];
  if (!isValidLearningOutcomeTimestamp(row.createdAt)) {
    errors.push("createdAt is invalid");
  }
  if (!isValidLearningOutcomeTimestamp(row.updatedAt)) {
    errors.push("updatedAt is invalid");
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidLearningOutcomeTimestamps(
  row: Pick<LearningOutcome, "createdAt" | "updatedAt">,
  label = "Learning Outcome"
): void {
  const result = validateLearningOutcomeTimestamps(row);
  if (result.valid) return;
  const detail = result.errors.join("; ");
  throw new Error(`${label} timestamp validation failed: ${detail}`);
}

function parseTs(iso: string): number {
  return Date.parse(iso);
}

/**
 * Compare freshness only after both rows have valid timestamps.
 * Throws if either updatedAt/createdAt is invalid — never treats invalid as newer.
 */
export function compareLearningOutcomeFreshness(
  existing: LearningOutcome,
  incoming: LearningOutcome
): LearningOutcomeFreshness {
  const existingTs = validateLearningOutcomeTimestamps(existing);
  if (!existingTs.valid) {
    throw new Error(
      `Learning Outcome timestamp validation failed: existing canonical timestamps are invalid (${existingTs.errors.join("; ")}). Explicit repair required.`
    );
  }
  const incomingTs = validateLearningOutcomeTimestamps(incoming);
  if (!incomingTs.valid) {
    throw new Error(
      `Learning Outcome timestamp validation failed: ${incomingTs.errors.join("; ")}`
    );
  }
  const a = parseTs(existing.updatedAt);
  const b = parseTs(incoming.updatedAt);
  if (b > a) return "incoming_newer";
  if (b < a) return "existing_newer";
  return "equal";
}

function normId(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s ? s.toUpperCase() : undefined;
}

export type IdentityCheckResult =
  | { ok: true }
  | {
      ok: false;
      code: "canonical_identity_mismatch";
      message: string;
      existingId: string;
      existingPlanId?: string;
      existingTradeId?: string;
      incomingPlanId?: string;
      incomingTradeId?: string;
    };

/**
 * Canonical business identity is immutable once a row exists.
 * A: Scout-only (planId, no tradeId) stays Scout-only on the same plan.
 * B: Trade LO keeps the same tradeId; cannot become Scout-only.
 * C: Rows with neither planId nor tradeId cannot attach identity by default.
 */
export function checkLearningOutcomeIdentity(
  existing: LearningOutcome,
  incoming: LearningOutcome
): IdentityCheckResult {
  const existingPlanId = normId(existing.planId);
  const existingTradeId = normId(existing.tradeId);
  const incomingPlanId = normId(incoming.planId);
  const incomingTradeId = normId(incoming.tradeId);

  const mismatch = (): IdentityCheckResult => ({
    ok: false,
    code: "canonical_identity_mismatch",
    message: [
      "canonical_identity_mismatch",
      `existingId=${existing.id}`,
      `existingPlanId=${existingPlanId ?? "none"}`,
      `existingTradeId=${existingTradeId ?? "none"}`,
      `incomingPlanId=${incomingPlanId ?? "none"}`,
      `incomingTradeId=${incomingTradeId ?? "none"}`,
    ].join(" "),
    existingId: existing.id,
    existingPlanId,
    existingTradeId,
    incomingPlanId,
    incomingTradeId,
  });

  // A. Scout-only
  if (existingPlanId && !existingTradeId) {
    if (incomingTradeId) return mismatch();
    if (incomingPlanId !== existingPlanId) return mismatch();
    return { ok: true };
  }

  // B. Trade LO
  if (existingTradeId) {
    if (!incomingTradeId) return mismatch();
    if (incomingTradeId !== existingTradeId) return mismatch();
    if (existingPlanId) {
      if (incomingPlanId !== undefined && incomingPlanId !== existingPlanId) {
        return mismatch();
      }
    } else if (incomingPlanId !== undefined) {
      return mismatch();
    }
    return { ok: true };
  }

  // C. No plan/trade identity — reject attaching either
  if (incomingPlanId !== undefined || incomingTradeId !== undefined) {
    return mismatch();
  }
  return { ok: true };
}

export function assertSameLearningOutcomeIdentity(
  existing: LearningOutcome,
  incoming: LearningOutcome
): void {
  const result = checkLearningOutcomeIdentity(existing, incoming);
  if (!result.ok) throw new Error(result.message);
}

function pickScalar<T>(
  incoming: T | undefined | null,
  existing: T | undefined | null,
  opts?: { allowNullClear?: boolean }
): T | undefined | null {
  if (incoming === undefined) return existing;
  if (incoming === null) {
    return opts?.allowNullClear ? null : existing;
  }
  return incoming;
}

/**
 * Merge incoming onto existing canonical LO.
 * - id / createdAt / planId / tradeId always from existing
 * - undefined never clears existing
 * - null clears only documented clearable fields (notes stays null for DB mapping)
 * - 0 and false are kept from incoming
 */
export function mergeCanonicalLearningOutcome(
  existing: LearningOutcome,
  incoming: LearningOutcome
): LearningOutcome {
  assertValidLearningOutcomeTimestamps(existing, "Existing Learning Outcome");
  assertValidLearningOutcomeTimestamps(incoming);
  assertSameLearningOutcomeIdentity(existing, incoming);

  const freshness = compareLearningOutcomeFreshness(existing, incoming);
  const updatedAt =
    freshness === "incoming_newer" ? incoming.updatedAt : existing.updatedAt;

  const observationId =
    incoming.observationId !== undefined && incoming.observationId !== null
      ? String(incoming.observationId).trim() || existing.observationId
      : existing.observationId;

  const mafExperimentId =
    incoming.mafExperimentId !== undefined && incoming.mafExperimentId !== null
      ? String(incoming.mafExperimentId).trim() || existing.mafExperimentId
      : existing.mafExperimentId;

  const notes =
    incoming.notes === undefined
      ? existing.notes
      : incoming.notes === null
        ? null
        : incoming.notes;

  return {
    ...existing,
    kind: incoming.kind ?? existing.kind,
    ticker: incoming.ticker || existing.ticker,
    stockThesisId: pickScalar(incoming.stockThesisId, existing.stockThesisId) as
      | string
      | undefined,
    // Immutable canonical identity
    planId: existing.planId,
    tradeId: existing.tradeId,
    playbookId: pickScalar(incoming.playbookId, existing.playbookId) as
      | string
      | undefined,
    observationId,
    mafExperimentId,
    rAchieved: pickScalar(incoming.rAchieved, existing.rAchieved) as
      | number
      | undefined,
    realizedR: pickScalar(incoming.realizedR, existing.realizedR) as
      | number
      | undefined,
    counterfactualR: pickScalar(
      incoming.counterfactualR,
      existing.counterfactualR
    ) as number | undefined,
    realizedPnL: pickScalar(incoming.realizedPnL, existing.realizedPnL) as
      | number
      | undefined,
    counterfactualDollarResult: pickScalar(
      incoming.counterfactualDollarResult,
      existing.counterfactualDollarResult,
      { allowNullClear: NULL_CLEARABLE.has("counterfactualDollarResult") }
    ) as number | null | undefined,
    entryReached: pickScalar(incoming.entryReached, existing.entryReached) as
      | boolean
      | undefined,
    stopReachedBeforeTarget: pickScalar(
      incoming.stopReachedBeforeTarget,
      existing.stopReachedBeforeTarget
    ) as boolean | undefined,
    targetReachedBeforeStop: pickScalar(
      incoming.targetReachedBeforeStop,
      existing.targetReachedBeforeStop
    ) as boolean | undefined,
    nonExecutionReason: pickScalar(
      incoming.nonExecutionReason,
      existing.nonExecutionReason
    ) as string | undefined,
    excludedFromMetrics: pickScalar(
      incoming.excludedFromMetrics,
      existing.excludedFromMetrics
    ) as boolean | undefined,
    lifecycleStatus: incoming.lifecycleStatus ?? existing.lifecycleStatus,
    notes: notes as string | null | undefined,
    source: incoming.source ?? existing.source,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt,
  };
}

/** Equal-timestamp: only fill missing protected links; never overwrite identity. */
export function mergeEqualTimestampLinks(
  existing: LearningOutcome,
  incoming: LearningOutcome
): LearningOutcome {
  assertSameLearningOutcomeIdentity(existing, incoming);
  return {
    ...existing,
    planId: existing.planId,
    tradeId: existing.tradeId,
    observationId: existing.observationId ?? incoming.observationId,
    mafExperimentId: existing.mafExperimentId ?? incoming.mafExperimentId,
    stockThesisId: existing.stockThesisId ?? incoming.stockThesisId,
    playbookId: existing.playbookId ?? incoming.playbookId,
  };
}

/**
 * Shared upsert resolution for memory / JSON / Supabase.
 * Validates timestamps, enforces immutable identity, applies freshness.
 */
export function resolveLearningOutcomeUpsert(
  existing: LearningOutcome | undefined,
  incoming: LearningOutcome
): { action: "insert" | "skip" | "write"; row: LearningOutcome } {
  assertValidLearningOutcomeTimestamps(incoming);

  if (!existing) {
    return { action: "insert", row: incoming };
  }

  const existingTs = validateLearningOutcomeTimestamps(existing);
  if (!existingTs.valid) {
    throw new Error(
      `Learning Outcome timestamp validation failed: existing canonical timestamps are invalid (${existingTs.errors.join("; ")}). Explicit repair required.`
    );
  }

  assertSameLearningOutcomeIdentity(existing, incoming);

  const freshness = compareLearningOutcomeFreshness(existing, incoming);
  if (freshness === "existing_newer") {
    return { action: "skip", row: existing };
  }
  if (freshness === "equal") {
    const merged = mergeEqualTimestampLinks(existing, incoming);
    const changed =
      merged.observationId !== existing.observationId ||
      merged.mafExperimentId !== existing.mafExperimentId ||
      merged.stockThesisId !== existing.stockThesisId ||
      merged.playbookId !== existing.playbookId;
    return { action: changed ? "write" : "skip", row: merged };
  }
  return {
    action: "write",
    row: mergeCanonicalLearningOutcome(existing, incoming),
  };
}
