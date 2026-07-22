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
  if (plan.status === "expired") return "expired";
  if (plan.status === "skipped") return "cancelled";
  if (plan.status === "failed") {
    const reason = plan.outcome?.reason;
    if (reason === "discipline") return "cancelled";
    return "missed_opportunity";
  }
  if (plan.layeredEntry?.status === "missed") return "missed_opportunity";
  return null;
}

function initialLifecycle(kind: LearningOutcomeKind): LearningOutcomeLifecycle {
  if (kind === "executed_loss" || kind === "missed_opportunity") return "observing";
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

  const row: LearningOutcome = {
    id: existing?.id ?? nextLearningOutcomeId(all, plan.ticker),
    kind,
    ticker: plan.ticker.toUpperCase(),
    stockThesisId: plan.stockThesisId ?? existing?.stockThesisId,
    planId: plan.id,
    playbookId: plan.playbookId ?? existing?.playbookId,
    observationId: existing?.observationId,
    mafExperimentId: existing?.mafExperimentId,
    lifecycleStatus:
      existing?.lifecycleStatus === "attributed" || existing?.lifecycleStatus === "concluded"
        ? existing.lifecycleStatus
        : initialLifecycle(kind),
    notes: plan.outcome?.lesson ?? existing?.notes,
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
