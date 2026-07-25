/**
 * Scout plan-outcome — close a Scout without inventing a Trade (25-29).
 * Server derives counterfactual R/$ ; AI-supplied counterfactualR is ignored.
 */

import type { TradePlan, PlanStatus, PlanFailReason } from "./plan-types";
import type { ScoutLifecycleStatus } from "./scout-decision-types";
import type { LearningOutcome } from "./learning-outcome-types";
import {
  getLearningOutcomeByPlanId,
  getLearningOutcomes,
  nextLearningOutcomeId,
  upsertLearningOutcome,
} from "./learning-outcome-store";
import { getPlanById } from "./plans";
import { getPlansStore } from "./plans-store";
import { getTrades } from "./storage";
import type { PlanOutcomeKind, PlanNonExecutionReason } from "./plan-outcome-types";
import {
  derivePlanOutcomeMetrics,
  parsePlanOutcomeProposal,
  validatePlanOutcomeProposalFields,
} from "./plan-outcome-validate";

export {
  parsePlanOutcomeProposal,
  validatePlanOutcomeProposalFields,
  deriveCounterfactualR,
  derivePlanOutcomeMetrics,
  resolveAuthorizedRiskAmount,
  type DerivedPlanOutcomeMetrics,
} from "./plan-outcome-validate";

export async function planHasExecutedTrade(plan: TradePlan): Promise<boolean> {
  if (plan.linkedTradeId) return true;
  const trades = await getTrades();
  return trades.some(
    (t) =>
      t.planId?.toUpperCase() === plan.id.toUpperCase() &&
      (t.status === "open" || t.status === "closed" || t.status === "pending")
  );
}

function terminalStatusForOutcome(outcome: PlanOutcomeKind): PlanStatus {
  if (outcome === "expired") return "expired";
  if (outcome === "cancelled" || outcome === "duplicate_creation") return "skipped";
  return "failed";
}

function failReasonForOutcome(
  outcome: PlanOutcomeKind,
  nonExecutionReason?: PlanNonExecutionReason
): PlanFailReason | undefined {
  if (outcome === "unexecuted_plan_loss") return "stopped_early";
  if (outcome === "missed_opportunity") return "no_trigger";
  if (outcome === "cancelled" || outcome === "duplicate_creation") return "discipline";
  if (nonExecutionReason === "monitoring_failure") return "other";
  return "other";
}

function lifecycleForOutcome(outcome: PlanOutcomeKind): ScoutLifecycleStatus {
  if (outcome === "expired") return "expired";
  if (outcome === "cancelled" || outcome === "duplicate_creation") return "cancelled";
  if (outcome === "missed_opportunity") return "missed";
  return "outcome_recorded";
}

export async function validatePlanOutcomeAgainstPlan(
  proposal: import("./plan-outcome-types").PlanOutcomeProposal,
  plan: TradePlan | undefined
): Promise<string[]> {
  const errors: string[] = [];
  if (!plan) {
    errors.push("plan not found");
    return errors;
  }

  if (proposal.outcome === "unexecuted_plan_loss") {
    if (
      plan.plannedEntry === undefined ||
      plan.stopPrice === undefined ||
      plan.targetPrice === undefined
    ) {
      errors.push(
        "unexecuted_plan_loss requires plan plannedEntry, stopPrice, and targetPrice"
      );
    }
    if (await planHasExecutedTrade(plan)) {
      errors.push(
        "cannot record unexecuted_plan_loss when an executed Trade exists"
      );
    }
  }

  if (proposal.outcome === "duplicate_creation") {
    if (proposal.canonicalPlanId === proposal.planId) {
      errors.push("canonicalPlanId cannot equal planId");
    }
  }

  return errors;
}

export async function applyPlanOutcomeFromProposal(
  proposalRaw: Record<string, unknown>
): Promise<{ plan?: TradePlan; learning?: LearningOutcome; errors?: string[] }> {
  const parsed = parsePlanOutcomeProposal(proposalRaw);
  if (!parsed.ok) return { errors: parsed.errors };

  const fieldErrors = validatePlanOutcomeProposalFields(proposalRaw);
  if (fieldErrors.length) return { errors: fieldErrors };

  const proposal = parsed.value;
  const plan = await getPlanById(proposal.planId);
  const against = await validatePlanOutcomeAgainstPlan(proposal, plan);
  if (against.length || !plan) return { errors: against.length ? against : ["plan not found"] };

  const flags = {
    entryReached: proposal.entryReached,
    stopReachedBeforeTarget: proposal.stopReachedBeforeTarget,
    targetReachedBeforeStop: proposal.targetReachedBeforeStop,
  };
  const metrics = derivePlanOutcomeMetrics(plan, proposal.outcome, flags);
  if (proposal.outcome === "duplicate_creation" && !metrics.excludedFromMetrics) {
    return { errors: ["duplicate_creation must be excluded from metrics"] };
  }

  const now = new Date().toISOString();
  const status = terminalStatusForOutcome(proposal.outcome);
  const nonExecutionReason =
    proposal.outcome === "duplicate_creation"
      ? ("duplicate_creation" as const)
      : proposal.nonExecutionReason;

  const updated: TradePlan = {
    ...plan,
    status,
    scoutLifecycle: lifecycleForOutcome(proposal.outcome),
    outcome: {
      recordedAt: plan.outcome?.recordedAt ?? now,
      reason: failReasonForOutcome(proposal.outcome, nonExecutionReason),
      strategyStillValid:
        proposal.strategyStillValid ??
        (proposal.outcome === "unexecuted_plan_loss" ? true : plan.outcome?.strategyStillValid),
      lesson: proposal.notes ?? plan.outcome?.lesson,
      outcomeKind: proposal.outcome,
      entryReached: proposal.entryReached,
      stopReachedBeforeTarget: proposal.stopReachedBeforeTarget,
      targetReachedBeforeStop: proposal.targetReachedBeforeStop,
      nonExecutionReason,
      canonicalPlanId: proposal.canonicalPlanId,
      counterfactualR: metrics.counterfactualR,
      excludedFromMetrics: metrics.excludedFromMetrics,
    },
    updatedAt: now,
  };

  updated.plannedEntry = plan.plannedEntry;
  updated.stopPrice = plan.stopPrice;
  updated.targetPrice = plan.targetPrice;
  updated.decision = plan.decision;
  updated.decisionHistory = plan.decisionHistory;

  await getPlansStore().upsert(updated);

  const existing = await getLearningOutcomeByPlanId(updated.id);
  const all = await getLearningOutcomes();
  const learning: LearningOutcome = {
    id: existing?.id ?? nextLearningOutcomeId(all, updated.ticker),
    kind:
      proposal.outcome === "unexecuted_plan_loss"
        ? "unexecuted_plan_loss"
        : proposal.outcome === "duplicate_creation"
          ? "duplicate_creation"
          : proposal.outcome === "missed_opportunity"
            ? "missed_opportunity"
            : proposal.outcome === "expired"
              ? "expired"
              : "cancelled",
    ticker: updated.ticker.toUpperCase(),
    stockThesisId: updated.stockThesisId ?? existing?.stockThesisId,
    planId: updated.id,
    playbookId: updated.playbookId ?? existing?.playbookId,
    observationId: existing?.observationId,
    mafExperimentId: existing?.mafExperimentId,
    realizedR: 0,
    realizedPnL: 0,
    counterfactualR: metrics.counterfactualR,
    counterfactualDollarResult: metrics.counterfactualDollarResult,
    entryReached: proposal.entryReached,
    stopReachedBeforeTarget: proposal.stopReachedBeforeTarget,
    targetReachedBeforeStop: proposal.targetReachedBeforeStop,
    nonExecutionReason,
    excludedFromMetrics: metrics.excludedFromMetrics,
    canonicalPlanId: proposal.canonicalPlanId,
    lifecycleStatus: "concluded",
    notes: proposal.notes ?? existing?.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    source: "plan_outcome",
  };

  await upsertLearningOutcome(learning);
  return { plan: updated, learning };
}
