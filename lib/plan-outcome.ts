/**
 * Persist Plan Outcome + Learning Outcome (no fictitious Trade).
 * UPL: unexecuted_plan_loss — server-derived realized/counterfactual R.
 */
import type { TradePlan } from "./plan-types";
import type { PlanOutcomeProposalInput } from "./plan-outcome-types";
import {
  PLAN_COUNTERFACTUAL_OBSERVATION_KIND,
  TRIGGERED_UNEXECUTED_PLAN_UNIT,
} from "./plan-outcome-types";
import { validatePlanOutcomeProposal } from "./plan-outcome-validate";
import {
  deriveUnexecutedPlanLossServerValues,
  planEligibleForOutcomeClosure,
  planHasCounterfactualGeometry,
  validateUnexecutedPlanLossEligibility,
} from "./plan-outcome-derive";
import { getPlanById } from "./plans";
import { getPlansStore } from "./plans-store";
import {
  getObservationByPlanId,
  getObservations,
  nextObservationId,
  upsertObservation,
} from "./observation-store";
import type { ObservationRecord } from "./observation-types";
import {
  upsertLearningOutcomeFromPlan,
  linkObservationToLearningOutcome,
} from "./learning-outcome";
import { getLearningOutcomeByPlanId } from "./learning-outcome-store";
import { getTrades } from "./storage";
import type { LearningOutcome } from "./learning-outcome-types";

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

async function tradesLinkedToPlan(planId: string): Promise<string[]> {
  const needle = planId.toUpperCase();
  const trades = await getTrades();
  return trades
    .filter((t) => t.planId?.toUpperCase() === needle)
    .map((t) => t.id);
}

export async function applyPlanOutcomeProposal(
  proposal: Record<string, unknown>
): Promise<{
  plan?: TradePlan;
  observation?: ObservationRecord;
  learningOutcome?: LearningOutcome;
  errors?: string[];
  idempotent?: boolean;
}> {
  const parsed = validatePlanOutcomeProposal(proposal);
  if (!parsed.ok) return { errors: parsed.errors };
  return persistPlanOutcome(parsed.value);
}

export async function persistPlanOutcome(
  input: PlanOutcomeProposalInput
): Promise<{
  plan?: TradePlan;
  observation?: ObservationRecord;
  learningOutcome?: LearningOutcome;
  errors?: string[];
  idempotent?: boolean;
}> {
  const plan = await getPlanById(input.planId);
  if (!plan) return { errors: [`Plan ${input.planId} not found.`] };

  const linkedTradeIds = await tradesLinkedToPlan(plan.id);

  // Idempotent re-Accept of the same UPL outcome.
  if (
    plan.outcome?.recordedAt &&
    (plan.outcome.outcomeKind === input.outcomeKind ||
      (input.outcomeKind === "unexecuted_plan_loss" &&
        plan.outcome.status === "theoretical_loss" &&
        plan.outcome.tradeExecuted === false))
  ) {
    const existingLo = await getLearningOutcomeByPlanId(plan.id);
    return {
      plan,
      learningOutcome: existingLo,
      idempotent: true,
    };
  }

  if (plan.outcome?.recordedAt) {
    return {
      errors: [
        `Plan ${plan.id} already has outcome.recordedAt — duplicate outcome rejected (idempotent re-submit of same UPL is allowed)`,
      ],
    };
  }

  if (input.outcomeKind === "unexecuted_plan_loss" || input.uplContract) {
    if (input.outcomeKind === "unexecuted_plan_loss") {
      const elig = validateUnexecutedPlanLossEligibility(
        plan,
        {
          entryReached: input.entryReached === true,
          stopReachedBeforeTarget: input.stopReachedBeforeTarget === true,
          targetReachedBeforeStop: input.targetReachedBeforeStop === false,
          nonExecutionReason: input.nonExecutionReason,
        },
        { linkedTradeIds }
      );
      if (!elig.ok) return { errors: elig.errors };
    }
  } else if (input.status === "theoretical_loss" && input.tradeExecuted === false) {
    if (plan.linkedTradeId || linkedTradeIds.length) {
      return {
        errors: [
          `Plan ${plan.id} has a linked Trade/fill — unexecuted path rejected`,
        ],
      };
    }
    if (!planHasCounterfactualGeometry(plan)) {
      return {
        errors: [
          "Plan lacks persisted plannedEntry/stopPrice/targetPrice required to derive counterfactual result",
        ],
      };
    }
    if (!planEligibleForOutcomeClosure(plan)) {
      return {
        errors: [
          `Plan ${plan.id} is not terminal or eligible for outcome closure`,
        ],
      };
    }
  }

  // duplicate_creation: close THIS plan only; never touch other ticker plans.
  if (input.outcomeKind === "duplicate_creation") {
    if (!planEligibleForOutcomeClosure(plan) && plan.status !== "watching" && plan.status !== "ready") {
      // Still allow marking a clone as duplicate even if active.
    }
  }

  const now = new Date().toISOString();
  const nextStatus =
    input.outcomeKind === "duplicate_creation"
      ? resolveTerminalStatus(plan)
      : resolveTerminalStatus(plan);

  const server =
    input.outcomeKind === "unexecuted_plan_loss" ||
    (input.status === "theoretical_loss" && input.tradeExecuted === false)
      ? deriveUnexecutedPlanLossServerValues(plan)
      : null;

  const theoreticalResultR = server
    ? server.counterfactualR
    : input.theoreticalResultR;
  const realizedResultR = server
    ? server.realizedR
    : input.tradeExecuted
      ? input.realizedResultR
      : 0;
  const realizedPnL = server ? server.realizedPnL : input.realizedPnL ?? (input.tradeExecuted ? undefined : 0);
  const counterfactualDollarResult = server
    ? server.counterfactualDollarResult
    : input.counterfactualDollarResult;

  const outcome: NonNullable<TradePlan["outcome"]> = {
    planId: plan.id,
    recordedAt: now,
    status: input.status,
    outcomeKind: input.outcomeKind,
    tradeExecuted: input.tradeExecuted,
    entryTriggered: input.entryTriggered,
    stopTriggered: input.stopTriggered,
    targetTriggered: input.targetTriggered,
    entryReached: input.entryReached ?? input.entryTriggered,
    stopReachedBeforeTarget:
      input.stopReachedBeforeTarget ??
      (input.stopTriggered === true && input.targetTriggered !== true
        ? true
        : null),
    targetReachedBeforeStop:
      input.targetReachedBeforeStop ??
      (input.targetTriggered === true && input.stopTriggered !== true
        ? true
        : null),
    nonExecutionReason: input.nonExecutionReason,
    theoreticalResultR,
    realizedResultR,
    realizedPnL,
    counterfactualDollarResult,
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
  let learningOutcome: LearningOutcome | undefined;
  try {
    learningOutcome = await upsertLearningOutcomeFromPlan(updated);
    if (
      !input.tradeExecuted &&
      input.outcomeKind !== "duplicate_creation"
    ) {
      observation = await ensureCounterfactualObservation(
        updated,
        input,
        learningOutcome?.id
      );
      if (learningOutcome && observation) {
        await linkObservationToLearningOutcome(
          learningOutcome.id,
          observation.id
        );
        // Keep UPL LO concluded even after OBS link.
        if (learningOutcome.kind === "unexecuted_plan_loss") {
          const { upsertLearningOutcome } = await import("./learning-outcome-store");
          learningOutcome = {
            ...learningOutcome,
            observationId: observation.id,
            lifecycleStatus: "concluded",
            updatedAt: new Date().toISOString(),
          };
          await upsertLearningOutcome(learningOutcome);
        }
      }
    }
  } catch {
    // Learning/OBS path is best-effort after durable plan outcome write.
  }

  return { plan: updated, observation, learningOutcome };
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

  // Do not mark Stock File thesis invalidated — observation is Scout-path evidence only.
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
    // Scout path evidence — does not mutate Stock File.
    thesisInvalidated: undefined,
    targetReached:
      input.targetTriggered === true
        ? true
        : input.targetTriggered === false
          ? false
          : undefined,
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
