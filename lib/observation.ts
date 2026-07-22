import type { Trade } from "./types";
import type { TradePlan } from "./plan-types";
import type { PostStopStudy } from "./asymmetry-types";
import {
  DEFAULT_OBSERVATION_DAYS,
  type ObservationRecord,
  type ObservationTerminalEvent,
  type ObservationUpdateInput,
} from "./observation-types";
import {
  getObservationById,
  getObservationByPlanId,
  getObservationByTradeId,
  getObservations,
  nextObservationId,
  upsertObservation,
} from "./observation-store";
import { linkObservationToLearningOutcome } from "./learning-outcome";

function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();
}

export function resolveFirstTerminalEvent(input: {
  targetReached?: boolean;
  targetReachedAt?: string;
  thesisInvalidated?: boolean;
  invalidationReachedAt?: string;
  windowEnded?: boolean;
}): ObservationTerminalEvent | undefined {
  const { targetReached, targetReachedAt, thesisInvalidated, invalidationReachedAt, windowEnded } =
    input;

  if (targetReached && thesisInvalidated && targetReachedAt && invalidationReachedAt) {
    return Date.parse(targetReachedAt) <= Date.parse(invalidationReachedAt)
      ? "target"
      : "invalidation";
  }
  if (targetReached && !thesisInvalidated) return "target";
  if (thesisInvalidated && !targetReached) return "invalidation";
  if (targetReached && thesisInvalidated) return "inconclusive";
  if (windowEnded) return "window_end";
  if (targetReached === false && thesisInvalidated === false) return "none";
  return undefined;
}

export function observationFromPostStopStudy(
  trade: Trade,
  study: PostStopStudy,
  learningOutcomeId?: string
): Omit<ObservationRecord, "id" | "createdAt" | "lastUpdatedAt"> {
  return {
    learningOutcomeId,
    tradeId: trade.id,
    planId: trade.planId,
    ticker: trade.ticker.toUpperCase(),
    status: "observing",
    startedAt: study.startedAt,
    endsAt: study.endsAt,
    durationDays: study.durationDays,
    referenceEntry: study.originalEntry,
    referenceStop: study.originalStop,
    referenceTargets: study.originalTargets,
    thesisInvalidationNote: study.originalThesisInvalidation,
    targetReached: study.targetReached,
    thesisInvalidated: study.thesisInvalidated,
    maxPrice: study.maxPriceAfterStop,
    minPrice: study.minPriceAfterStop,
    dataSource: "post_stop_study",
    notes: study.notes,
  };
}

/** Start Observation for a losing close (mirrors / extends PostStopStudy). */
export async function startObservationForTradeClose(
  trade: Trade,
  options?: { learningOutcomeId?: string; durationDays?: number }
): Promise<ObservationRecord | undefined> {
  if (trade.status !== "closed" || !trade.closedAt) return undefined;

  const existing = await getObservationByTradeId(trade.id);
  if (existing) return existing;

  const study = trade.postStopStudy;
  const now = new Date().toISOString();
  const durationDays = options?.durationDays ?? study?.durationDays ?? DEFAULT_OBSERVATION_DAYS;
  const startedAt = study?.startedAt ?? trade.closedAt;
  const endsAt = study?.endsAt ?? addDaysIso(startedAt, durationDays);
  const all = await getObservations();

  const base = study
    ? observationFromPostStopStudy(trade, study, options?.learningOutcomeId)
    : {
        learningOutcomeId: options?.learningOutcomeId,
        tradeId: trade.id,
        planId: trade.planId,
        ticker: trade.ticker.toUpperCase(),
        status: "observing" as const,
        startedAt,
        endsAt,
        durationDays,
        referenceEntry: trade.entry,
        referenceStop: trade.stop,
        referenceTargets: trade.target !== undefined ? [trade.target] : undefined,
        dataSource: "manual" as const,
      };

  const row: ObservationRecord = {
    ...base,
    id: nextObservationId(all, trade.ticker),
    createdAt: now,
    lastUpdatedAt: now,
  };

  await upsertObservation(row);
  if (options?.learningOutcomeId) {
    await linkObservationToLearningOutcome(options.learningOutcomeId, row.id);
  }
  return row;
}

/** Start Observation for a missed/expired scout (thesis path without fill). */
export async function startObservationForPlanMiss(
  plan: TradePlan,
  options?: { learningOutcomeId?: string; durationDays?: number }
): Promise<ObservationRecord | undefined> {
  const existing = await getObservationByPlanId(plan.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const durationDays = options?.durationDays ?? DEFAULT_OBSERVATION_DAYS;
  const startedAt = plan.outcome?.recordedAt ?? plan.updatedAt ?? now;
  const all = await getObservations();

  const row: ObservationRecord = {
    id: nextObservationId(all, plan.ticker),
    learningOutcomeId: options?.learningOutcomeId,
    planId: plan.id,
    ticker: plan.ticker.toUpperCase(),
    status: "observing",
    startedAt,
    endsAt: addDaysIso(startedAt, durationDays),
    durationDays,
    referenceEntry: plan.plannedEntry,
    referenceStop: plan.stopPrice,
    referenceTargets: plan.targetPrice !== undefined ? [plan.targetPrice] : undefined,
    dataSource: "manual",
    createdAt: now,
    lastUpdatedAt: now,
  };

  await upsertObservation(row);
  if (options?.learningOutcomeId) {
    await linkObservationToLearningOutcome(options.learningOutcomeId, row.id);
  }
  return row;
}

export function applyObservationUpdate(
  existing: ObservationRecord,
  patch: ObservationUpdateInput
): ObservationRecord {
  const merged: ObservationRecord = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    ),
    lastUpdatedAt: new Date().toISOString(),
  };

  const terminal = resolveFirstTerminalEvent({
    targetReached: merged.targetReached,
    targetReachedAt: merged.targetReachedAt,
    thesisInvalidated: merged.thesisInvalidated,
    invalidationReachedAt: merged.invalidationReachedAt,
    windowEnded: merged.status === "concluded" && !merged.firstTerminalEvent,
  });
  if (terminal && !patch.firstTerminalEvent) {
    merged.firstTerminalEvent = terminal;
  } else if (patch.firstTerminalEvent) {
    merged.firstTerminalEvent = patch.firstTerminalEvent;
  }

  return merged;
}

export async function updateObservationById(
  id: string,
  patch: ObservationUpdateInput
): Promise<{ observation?: ObservationRecord; errors?: string[] }> {
  const existing = await getObservationById(id);
  if (!existing) return { errors: [`Observation ${id} not found.`] };
  const updated = applyObservationUpdate(existing, patch);
  await upsertObservation(updated);
  return { observation: updated };
}
