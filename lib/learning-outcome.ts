import { calculateTradeResult } from "./calculate";
import { computeRMultiple } from "./review";
import type { Trade } from "./types";
import type { TradePlan } from "./plan-types";
import type {
  LearningOutcome,
  LearningOutcomeKind,
  LearningOutcomeLifecycle,
} from "./learning-outcome-types";
import {
  getLearningOutcomeById,
  getLearningOutcomeByPlanId,
  getLearningOutcomeByTradeId,
  getLearningOutcomes,
  nextLearningOutcomeId,
  upsertLearningOutcome,
} from "./learning-outcome-store";

export function deriveLearningOutcomeKindFromTrade(trade: Trade): LearningOutcomeKind | null {
  if (trade.status !== "closed") return null;
  const pnl = calculateTradeResult(trade);
  if (pnl === null) return null;
  return pnl >= 0 ? "executed_win" : "executed_loss";
}

export function deriveLearningOutcomeKindFromPlan(plan: TradePlan): LearningOutcomeKind | null {
  if (plan.linkedTradeId) return null;
  const outcomeStatus = plan.outcome?.status;
  if (outcomeStatus === "theoretical_loss" && plan.outcome?.tradeExecuted === false) {
    return "unexecuted_plan_loss";
  }
  if (plan.outcome?.reason === "discipline" || outcomeStatus === "invalidated_before_entry") {
    // Keep cancelled for discipline / invalidated-before-entry without fill.
    if (outcomeStatus === "invalidated_before_entry") return "cancelled";
  }
  if (plan.status === "expired" && !outcomeStatus) return "expired";
  if (plan.status === "skipped") return "cancelled";
  if (plan.status === "failed") {
    const reason = plan.outcome?.reason;
    if (reason === "discipline") return "cancelled";
    if (outcomeStatus === "entry_not_triggered") return "expired";
    if (outcomeStatus === "theoretical_loss") return "unexecuted_plan_loss";
    return "missed_opportunity";
  }
  if (plan.status === "expired") {
    if (outcomeStatus === "theoretical_loss") return "unexecuted_plan_loss";
    if (outcomeStatus === "entry_not_triggered") return "expired";
    return "expired";
  }
  if (plan.layeredEntry?.status === "missed") return "missed_opportunity";
  return null;
}

function initialLifecycle(kind: LearningOutcomeKind): LearningOutcomeLifecycle {
  if (
    kind === "executed_loss" ||
    kind === "missed_opportunity" ||
    kind === "unexecuted_plan_loss"
  ) {
    // UPL: LO may go ready_for_attribution immediately (counterfactual concluded);
    // observation still seeds for thesis path.
    if (kind === "unexecuted_plan_loss") return "ready_for_attribution";
    return "observing";
  }
  return "ready_for_attribution";
}

/** Upsert Learning Outcome when a trade closes. */
export async function upsertLearningOutcomeFromTradeClose(
  trade: Trade
): Promise<LearningOutcome | undefined> {
  const kind = deriveLearningOutcomeKindFromTrade(trade);
  if (!kind) return undefined;

  const existing = await getLearningOutcomeByTradeId(trade.id);
  const all = await getLearningOutcomes();
  const now = new Date().toISOString();
  const r = computeRMultiple(trade);

  const row: LearningOutcome = {
    id: existing?.id ?? nextLearningOutcomeId(all, trade.ticker),
    kind,
    ticker: trade.ticker.toUpperCase(),
    planId: trade.planId ?? existing?.planId,
    tradeId: trade.id,
    playbookId: trade.playbookId ?? existing?.playbookId,
    observationId: existing?.observationId,
    mafExperimentId: existing?.mafExperimentId,
    rAchieved: r !== null ? Math.round(r * 100) / 100 : existing?.rAchieved,
    lifecycleStatus:
      existing?.lifecycleStatus === "attributed" || existing?.lifecycleStatus === "concluded"
        ? existing.lifecycleStatus
        : initialLifecycle(kind),
    notes: existing?.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    source: "trade_close",
  };

  await upsertLearningOutcome(row);
  return row;
}

/** Upsert Learning Outcome for a terminal plan without a fill. */
export async function upsertLearningOutcomeFromPlan(
  plan: TradePlan
): Promise<LearningOutcome | undefined> {
  const kind = deriveLearningOutcomeKindFromPlan(plan);
  if (!kind) return undefined;

  const existing = await getLearningOutcomeByPlanId(plan.id);
  const all = await getLearningOutcomes();
  const now = new Date().toISOString();

  const o = plan.outcome;
  const row: LearningOutcome = {
    id: existing?.id ?? nextLearningOutcomeId(all, plan.ticker),
    kind,
    ticker: plan.ticker.toUpperCase(),
    stockThesisId: plan.stockThesisId ?? existing?.stockThesisId,
    planId: plan.id,
    playbookId: plan.playbookId ?? existing?.playbookId,
    observationId: existing?.observationId,
    mafExperimentId: existing?.mafExperimentId,
    realizedR: o?.tradeExecuted ? o.realizedResultR : 0,
    counterfactualR:
      o?.theoreticalResultR !== undefined && o?.theoreticalResultR !== null
        ? o.theoreticalResultR
        : existing?.counterfactualR,
    entryReached: o?.entryTriggered ?? existing?.entryReached,
    stopReachedBeforeTarget:
      o?.stopTriggered === true && o?.targetTriggered !== true
        ? true
        : existing?.stopReachedBeforeTarget,
    targetReachedBeforeStop:
      o?.targetTriggered === true && o?.stopTriggered !== true
        ? true
        : existing?.targetReachedBeforeStop,
    excludedFromMetrics: kind === "duplicate_creation" ? true : existing?.excludedFromMetrics,
    lifecycleStatus:
      existing?.lifecycleStatus === "attributed" || existing?.lifecycleStatus === "concluded"
        ? existing.lifecycleStatus
        : initialLifecycle(kind),
    notes: o?.notes ?? o?.lesson ?? existing?.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    source: "plan_outcome",
  };

  await upsertLearningOutcome(row);
  return row;
}

export async function linkObservationToLearningOutcome(
  learningOutcomeId: string,
  observationId: string
): Promise<void> {
  const existing = await getLearningOutcomeById(learningOutcomeId);
  if (!existing) return;
  await upsertLearningOutcome({
    ...existing,
    observationId,
    lifecycleStatus:
      existing.lifecycleStatus === "open" ? "observing" : existing.lifecycleStatus,
    updatedAt: new Date().toISOString(),
  });
}

export async function markLearningOutcomeAttributed(
  learningOutcomeId: string,
  mafExperimentId: string
): Promise<void> {
  const existing = await getLearningOutcomeById(learningOutcomeId);
  if (!existing) return;
  await upsertLearningOutcome({
    ...existing,
    mafExperimentId,
    lifecycleStatus: existing.lifecycleStatus === "concluded" ? "concluded" : "attributed",
    updatedAt: new Date().toISOString(),
  });
}
