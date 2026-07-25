/**
 * Persist Plan Outcome + seed counterfactual observation / LO (no fictitious Trade).
 */
import type { TradePlan } from "./plan-types";
import type { PlanOutcomeProposalInput } from "./plan-outcome-types";
import {
  PLAN_COUNTERFACTUAL_OBSERVATION_KIND,
  TRIGGERED_UNEXECUTED_PLAN_UNIT,
} from "./plan-outcome-types";
import { validatePlanOutcomeProposal } from "./plan-outcome-validate";
import { getPlanById } from "./plans";
import { getPlansStore } from "./plans-store";
import {
  getObservationByPlanId,
  getObservations,
  nextObservationId,
  upsertObservation,
} from "./observation-store";
import type { ObservationRecord } from "./observation-types";
import { upsertLearningOutcomeFromPlan } from "./learning-outcome";
import { linkObservationToLearningOutcome } from "./learning-outcome";

function resolveTerminalStatus(plan: TradePlan): TradePlan["status"] {
  if (
    plan.status === "failed" ||
    plan.status === "expired" ||
    plan.status === "skipped"
  ) {
    return plan.status;
  }
  if (plan.validUntil && Number.isFinite(Date.parse(plan.validUntil))) {
    if (Date.parse(plan.validUntil) < Date.now()) return "expired";
  }
  return "failed";
}

export async function applyPlanOutcomeProposal(
  proposal: Record<string, unknown>
): Promise<{ plan?: TradePlan; observation?: ObservationRecord; errors?: string[] }> {
  const parsed = validatePlanOutcomeProposal(proposal);
  if (!parsed.ok) return { errors: parsed.errors };
  return persistPlanOutcome(parsed.value);
}

export async function persistPlanOutcome(
  input: PlanOutcomeProposalInput
): Promise<{ plan?: TradePlan; observation?: ObservationRecord; errors?: string[] }> {
  const plan = await getPlanById(input.planId);
  if (!plan) return { errors: [`Plan ${input.planId} not found.`] };

  const now = new Date().toISOString();
  const nextStatus = resolveTerminalStatus(plan);

  const outcome: NonNullable<TradePlan["outcome"]> = {
    planId: plan.id,
    recordedAt: plan.outcome?.recordedAt ?? now,
    status: input.status,
    tradeExecuted: input.tradeExecuted,
    entryTriggered: input.entryTriggered,
    stopTriggered: input.stopTriggered,
    targetTriggered: input.targetTriggered,
    theoreticalResultR: input.theoreticalResultR,
    realizedResultR: input.tradeExecuted ? input.realizedResultR : 0,
    outcomeSource: input.outcomeSource,
    evidenceStatus: input.evidenceStatus,
    notes: input.notes ?? input.lesson,
    evidenceRefs: input.evidenceRefs ?? [],
    createdBy: input.createdBy,
    updatedAt: now,
    strategyStillValid: input.strategyStillValid,
    externalFactors: input.externalFactors,
    lesson: input.lesson ?? input.notes,
  };
  if (input.reason) {
    outcome.reason = input.reason as NonNullable<TradePlan["outcome"]>["reason"];
  }

  const updated: TradePlan = {
    ...plan,
    status: nextStatus,
    outcome,
    updatedAt: now,
  };

  await getPlansStore().upsert(updated);

  let observation: ObservationRecord | undefined;
  try {
    const learning = await upsertLearningOutcomeFromPlan(updated);
    if (!input.tradeExecuted) {
      observation = await ensureCounterfactualObservation(updated, input, learning?.id);
      if (learning && observation) {
        await linkObservationToLearningOutcome(learning.id, observation.id);
      }
    }
  } catch {
    // Learning/OBS path is best-effort after durable plan outcome write.
  }

  return { plan: updated, observation };
}

async function ensureCounterfactualObservation(
  plan: TradePlan,
  input: PlanOutcomeProposalInput,
  learningOutcomeId?: string
): Promise<ObservationRecord> {
  const existing = await getObservationByPlanId(plan.id);
  const now = new Date().toISOString();
  const concluded =
    input.status === "inconclusive"
      ? "inconclusive"
      : input.evidenceStatus === "inconclusive"
        ? "inconclusive"
        : "concluded";

  if (existing) {
    const patched: ObservationRecord = {
      ...existing,
      learningOutcomeId: learningOutcomeId ?? existing.learningOutcomeId,
      observationKind: PLAN_COUNTERFACTUAL_OBSERVATION_KIND,
      learningUnitKind:
        input.entryTriggered === true && input.tradeExecuted === false
          ? TRIGGERED_UNEXECUTED_PLAN_UNIT
          : existing.learningUnitKind,
      entryTriggered: input.entryTriggered ?? existing.entryTriggered,
      stopTriggered: input.stopTriggered ?? existing.stopTriggered,
      targetTriggered: input.targetTriggered ?? existing.targetTriggered,
      theoreticalResultR:
        input.theoreticalResultR ?? existing.theoreticalResultR,
      realizedResultR: 0,
      evidenceRefs: input.evidenceRefs?.length
        ? input.evidenceRefs
        : existing.evidenceRefs,
      conclusionReason: input.notes ?? existing.conclusionReason,
      concludedAt: now,
      status: concluded === "inconclusive" ? "observing" : "concluded",
      firstTerminalEvent:
        input.targetTriggered === true
          ? "target"
          : input.stopTriggered === true
            ? "invalidation"
            : existing.firstTerminalEvent,
      lastUpdatedAt: now,
      notes: input.notes ?? existing.notes,
    };
    await upsertObservation(patched);
    return patched;
  }

  const all = await getObservations();
  const startedAt = plan.outcome?.recordedAt ?? plan.updatedAt ?? now;
  const durationDays = 90;
  const endsAt = new Date(
    Date.parse(startedAt) + durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const row: ObservationRecord = {
    id: nextObservationId(all, plan.ticker),
    learningOutcomeId,
    planId: plan.id,
    ticker: plan.ticker.toUpperCase(),
    status: concluded === "inconclusive" ? "observing" : "concluded",
    startedAt,
    endsAt,
    durationDays,
    referenceEntry: plan.plannedEntry,
    referenceStop: plan.stopPrice,
    referenceTargets:
      plan.targetPrice !== undefined ? [plan.targetPrice] : undefined,
    observationKind: PLAN_COUNTERFACTUAL_OBSERVATION_KIND,
    learningUnitKind:
      input.entryTriggered === true && input.tradeExecuted === false
        ? TRIGGERED_UNEXECUTED_PLAN_UNIT
        : undefined,
    entryTriggered: input.entryTriggered,
    stopTriggered: input.stopTriggered,
    targetTriggered: input.targetTriggered,
    theoreticalResultR: input.theoreticalResultR,
    realizedResultR: 0,
    evidenceRefs: input.evidenceRefs ?? [],
    conclusionReason: input.notes,
    concludedAt: now,
    thesisInvalidated: input.stopTriggered === true ? true : undefined,
    targetReached: input.targetTriggered === true ? true : input.targetTriggered === false ? false : undefined,
    firstTerminalEvent:
      input.targetTriggered === true
        ? "target"
        : input.stopTriggered === true
          ? "invalidation"
          : undefined,
    dataSource: "manual",
    notes: input.notes,
    createdAt: now,
    lastUpdatedAt: now,
  };
  await upsertObservation(row);
  return row;
}
