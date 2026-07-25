/**
 * Canonical Learning Outcome merge + freshness — never clear protected links with undefined.
 */
import type { LearningOutcome } from "../learning-outcome-types";

export type LearningOutcomeFreshness =
  | "incoming_newer"
  | "existing_newer"
  | "equal"
  | "unparseable";

/** Fields that may be intentionally cleared with explicit null. */
const NULL_CLEARABLE = new Set<keyof LearningOutcome>([
  "notes",
  "counterfactualDollarResult",
]);

function parseTs(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function compareLearningOutcomeFreshness(
  existing: LearningOutcome,
  incoming: LearningOutcome
): LearningOutcomeFreshness {
  const a = parseTs(existing.updatedAt);
  const b = parseTs(incoming.updatedAt);
  if (a === null || b === null) return "unparseable";
  if (b > a) return "incoming_newer";
  if (b < a) return "existing_newer";
  return "equal";
}

function pickScalar<T>(
  incoming: T | undefined | null,
  existing: T | undefined | null,
  opts?: { allowNullClear?: boolean }
): T | undefined | null {
  if (incoming === undefined) return existing;
  if (incoming === null) {
    // Only documented clearable fields may wipe existing values with null.
    return opts?.allowNullClear ? null : existing;
  }
  // zero / false are valid incoming values — never treat as absent
  return incoming;
}

/**
 * Merge incoming onto existing canonical LO.
 * - id / createdAt always from existing
 * - undefined never clears existing
 * - null clears only documented clearable fields
 * - 0 and false are kept from incoming
 * - MAF / Observation links never lost unless incoming supplies a non-empty replacement
 */
export function mergeCanonicalLearningOutcome(
  existing: LearningOutcome,
  incoming: LearningOutcome
): LearningOutcome {
  const freshness = compareLearningOutcomeFreshness(existing, incoming);
  const updatedAt =
    freshness === "incoming_newer" || freshness === "unparseable"
      ? incoming.updatedAt || existing.updatedAt
      : existing.updatedAt;

  const observationId =
    incoming.observationId !== undefined && incoming.observationId !== null
      ? String(incoming.observationId).trim() || existing.observationId
      : existing.observationId;

  const mafExperimentId =
    incoming.mafExperimentId !== undefined && incoming.mafExperimentId !== null
      ? String(incoming.mafExperimentId).trim() || existing.mafExperimentId
      : existing.mafExperimentId;

  return {
    ...existing,
    kind: incoming.kind ?? existing.kind,
    ticker: incoming.ticker || existing.ticker,
    stockThesisId: pickScalar(incoming.stockThesisId, existing.stockThesisId) as
      | string
      | undefined,
    planId: pickScalar(incoming.planId, existing.planId) as string | undefined,
    tradeId: pickScalar(incoming.tradeId, existing.tradeId) as string | undefined,
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
    notes:
      incoming.notes === null
        ? undefined
        : ((pickScalar(incoming.notes, existing.notes) as string | undefined) ??
          existing.notes),
    source: incoming.source ?? existing.source,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt,
  };
}

/** Equal-timestamp: only fill missing protected links; never overwrite. */
export function mergeEqualTimestampLinks(
  existing: LearningOutcome,
  incoming: LearningOutcome
): LearningOutcome {
  return {
    ...existing,
    observationId: existing.observationId ?? incoming.observationId,
    mafExperimentId: existing.mafExperimentId ?? incoming.mafExperimentId,
    stockThesisId: existing.stockThesisId ?? incoming.stockThesisId,
    playbookId: existing.playbookId ?? incoming.playbookId,
  };
}
