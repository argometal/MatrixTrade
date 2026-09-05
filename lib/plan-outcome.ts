/**
 * Persist Plan Outcome, then durable Learning sync (no fictitious Trade).
 * UPL: unexecuted_plan_loss — server-derived realized/counterfactual R (−1).
 * Miss: missed_opportunity — realized 0; counterfactual +planned R.
 */
import type { TradePlan } from "./plan-types";
import type { PlanOutcomeProposalInput } from "./plan-outcome-types";
import { validatePlanOutcomeProposal } from "./plan-outcome-validate";
import {
  deriveMissedOpportunityServerValues,
  deriveUnexecutedPlanLossServerValues,
  planEligibleForOutcomeClosure,
  planHasCounterfactualGeometry,
  validateMissedOpportunityEligibility,
  validateUnexecutedPlanLossEligibility,
} from "./plan-outcome-derive";
import { syncPlanOutcomeLearning } from "./plan-outcome-learning-sync";
import { getPlanById } from "./plans";
import { getPlansStore } from "./plans-store";
import type { ObservationRecord } from "./observation-types";
import { getLearningOutcomeByPlanId } from "./learning-outcome-store";
import { getTrades } from "./storage";
import type { LearningOutcome } from "./learning-outcome-types";
import { appendCorrectionAudit } from "./correction-types";

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

export type PersistPlanOutcomeResult = {
  plan?: TradePlan;
  observation?: ObservationRecord;
  learningOutcome?: LearningOutcome;
  errors?: string[];
  idempotent?: boolean;
  /** Outcome persisted but LO/OBS sync failed — Needs Attention repair. */
  partialFailure?: boolean;
  learningSyncComplete?: boolean;
};

export async function applyPlanOutcomeProposal(
  proposal: Record<string, unknown>
): Promise<PersistPlanOutcomeResult> {
  const parsed = validatePlanOutcomeProposal(proposal);
  if (!parsed.ok) return { errors: parsed.errors };
  return persistPlanOutcome(parsed.value);
}

export async function persistPlanOutcome(
  input: PlanOutcomeProposalInput
): Promise<PersistPlanOutcomeResult> {
  const plan = await getPlanById(input.planId);
  if (!plan) return { errors: [`Plan ${input.planId} not found.`] };

  const linkedTradeIds = await tradesLinkedToPlan(plan.id);

  const sameKindIdempotent =
    !!plan.outcome?.recordedAt &&
    input.repairKind !== "corrected" &&
    (plan.outcome.outcomeKind === input.outcomeKind ||
      (input.outcomeKind === "unexecuted_plan_loss" &&
        plan.outcome.status === "theoretical_loss" &&
        plan.outcome.tradeExecuted === false));

  // Idempotent re-Accept of the same UPL outcome — still sync learning if needed.
  if (sameKindIdempotent) {
    const sync = await syncPlanOutcomeLearning(plan.id);
    if (!sync.ok) {
      return {
        plan: sync.plan ?? plan,
        learningOutcome: sync.learningOutcome,
        observation: sync.observation,
        idempotent: true,
        partialFailure: true,
        learningSyncComplete: false,
        errors: [
          "Plan outcome persisted (partialFailure); Learning sync failed. Open Planning → Retry Learning Sync — do not re-Apply a new outcome or reopen evaluate_expired_plan.",
          ...(sync.errors ?? []),
        ],
      };
    }
    return {
      plan: sync.plan ?? plan,
      learningOutcome: sync.learningOutcome,
      observation: sync.observation,
      idempotent: true,
      learningSyncComplete: true,
    };
  }

  if (plan.outcome?.recordedAt && input.repairKind !== "corrected") {
    return {
      errors: [
        `Plan ${plan.id} already has outcome.recordedAt (${plan.outcome.outcomeKind ?? plan.outcome.status ?? "—"}) — to supersede a wrong outcome, re-Apply plan-outcome with repairKind=corrected + repairNote/note (≥8) + evidence`,
      ],
    };
  }

  if (plan.outcome?.recordedAt && input.repairKind === "corrected") {
    if (!input.repairNote || input.repairNote.trim().length < 8) {
      return {
        errors: [
          "corrected plan-outcome requires repairNote/note (≥8 chars)",
        ],
      };
    }
  }

  if (input.outcomeKind === "unexecuted_plan_loss" || input.uplContract) {
    if (input.outcomeKind === "unexecuted_plan_loss") {
      const elig = validateUnexecutedPlanLossEligibility(
        plan,
        {
          entryReached: input.entryReached === true,
          stopReachedBeforeTarget: input.stopReachedBeforeTarget === true,
          targetReachedBeforeStop: input.targetReachedBeforeStop === true,
          nonExecutionReason: input.nonExecutionReason,
        },
        { linkedTradeIds }
      );
      if (!elig.ok) return { errors: elig.errors };
    }
    if (input.outcomeKind === "missed_opportunity") {
      const elig = validateMissedOpportunityEligibility(
        plan,
        {
          entryReached: input.entryReached === true,
          stopReachedBeforeTarget: input.stopReachedBeforeTarget === true,
          targetReachedBeforeStop: input.targetReachedBeforeStop === true,
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

  const now = new Date().toISOString();
  const nextStatus = resolveTerminalStatus(plan);

  let theoreticalResultR = input.theoreticalResultR;
  let realizedResultR = input.tradeExecuted ? input.realizedResultR : 0;
  let realizedPnL = input.realizedPnL ?? (input.tradeExecuted ? undefined : 0);
  let counterfactualDollarResult = input.counterfactualDollarResult;

  if (
    input.outcomeKind === "unexecuted_plan_loss" ||
    (input.status === "theoretical_loss" && input.tradeExecuted === false)
  ) {
    const server = deriveUnexecutedPlanLossServerValues(plan);
    theoreticalResultR = server.counterfactualR;
    realizedResultR = server.realizedR;
    realizedPnL = server.realizedPnL;
    counterfactualDollarResult = server.counterfactualDollarResult;
  } else if (input.outcomeKind === "missed_opportunity") {
    const server = deriveMissedOpportunityServerValues(plan);
    if ("error" in server) return { errors: [server.error] };
    theoreticalResultR = server.counterfactualR;
    realizedResultR = server.realizedR;
    realizedPnL = server.realizedPnL;
    counterfactualDollarResult = server.counterfactualDollarResult;
  }

  const priorOutcome = plan.outcome?.recordedAt ? plan.outcome : null;
  const correcting = input.repairKind === "corrected" && !!priorOutcome;

  const outcome: NonNullable<TradePlan["outcome"]> = {
    planId: plan.id,
    recordedAt: correcting ? priorOutcome!.recordedAt : now,
    status: input.status,
    outcomeKind: input.outcomeKind,
    recordKind: correcting ? "corrected" : "original",
    correctionAudit: correcting
      ? appendCorrectionAudit(priorOutcome!.correctionAudit, {
          at: now,
          kind: "corrected",
          note: input.repairNote!.trim(),
          evidenceRefs: input.evidenceRefs,
          mechanism: "apply:plan-outcome",
          previous: {
            outcomeKind: priorOutcome!.outcomeKind ?? null,
            status: priorOutcome!.status ?? null,
            tradeExecuted: priorOutcome!.tradeExecuted,
            entryReached: priorOutcome!.entryReached ?? null,
            stopReachedBeforeTarget: priorOutcome!.stopReachedBeforeTarget ?? null,
            targetReachedBeforeStop: priorOutcome!.targetReachedBeforeStop ?? null,
            nonExecutionReason: priorOutcome!.nonExecutionReason ?? null,
            theoreticalResultR: priorOutcome!.theoreticalResultR,
            realizedResultR: priorOutcome!.realizedResultR,
            recordedAt: priorOutcome!.recordedAt,
            recordKind: priorOutcome!.recordKind ?? "original",
          },
        })
      : undefined,
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
    learningSyncStatus: "pending",
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

  const sync = await syncPlanOutcomeLearning(updated.id);
  if (!sync.ok) {
    return {
      plan: sync.plan ?? updated,
      learningOutcome: sync.learningOutcome,
      observation: sync.observation,
      partialFailure: true,
      learningSyncComplete: false,
      errors: [
        "Plan outcome persisted (partialFailure); Learning sync failed. Open Planning → Retry Learning Sync — do not re-Apply a new outcome or reopen evaluate_expired_plan.",
        ...(sync.errors ?? []),
      ],
    };
  }

  return {
    plan: sync.plan ?? updated,
    learningOutcome: sync.learningOutcome,
    observation: sync.observation,
    learningSyncComplete: true,
  };
}

/** @deprecated Prefer syncPlanOutcomeLearning — kept for callers that only need LO lookup after persist. */
export async function getPlanLearningOutcome(planId: string) {
  return getLearningOutcomeByPlanId(planId);
}
