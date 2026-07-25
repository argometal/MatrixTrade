/**
 * Read-only Learning Outcome / Plan Outcome durability diagnostics.
 * Does not mutate. Repair plan outcomes via Retry Learning Sync only.
 */
import type { LearningOutcome } from "./learning-outcome-types";
import type { TradePlan } from "./plan-types";
import type { ObservationRecord } from "./observation-types";
import type { Trade } from "./types";

export type LearningOutcomeDiagnosticIssue = {
  code: string;
  message: string;
  planId?: string;
  tradeId?: string;
  learningOutcomeId?: string;
  observationId?: string;
};

function isUplPlan(plan: TradePlan): boolean {
  const o = plan.outcome;
  if (!o) return false;
  if (o.outcomeKind === "unexecuted_plan_loss") return true;
  return o.status === "theoretical_loss" && o.tradeExecuted === false;
}

export function diagnoseLearningOutcomeDurability(input: {
  plans: TradePlan[];
  trades: Trade[];
  learningOutcomes: LearningOutcome[];
  observations: ObservationRecord[];
}): LearningOutcomeDiagnosticIssue[] {
  const issues: LearningOutcomeDiagnosticIssue[] = [];
  const loById = new Map(
    input.learningOutcomes.map((lo) => [lo.id.toUpperCase(), lo])
  );
  const planById = new Map(
    input.plans.map((p) => [p.id.toUpperCase(), p])
  );
  const tradeById = new Map(
    input.trades.map((t) => [t.id.toUpperCase(), t])
  );
  const obsByPlan = new Map<string, ObservationRecord>();
  for (const obs of input.observations) {
    if (obs.planId && !obs.tradeId) {
      obsByPlan.set(obs.planId.toUpperCase(), obs);
    }
  }

  const byPlan = new Map<string, LearningOutcome[]>();
  const byTrade = new Map<string, LearningOutcome[]>();
  for (const lo of input.learningOutcomes) {
    if (lo.planId && !lo.tradeId) {
      const k = lo.planId.toUpperCase();
      const list = byPlan.get(k) ?? [];
      list.push(lo);
      byPlan.set(k, list);
    }
    if (lo.tradeId) {
      const k = lo.tradeId.toUpperCase();
      const list = byTrade.get(k) ?? [];
      list.push(lo);
      byTrade.set(k, list);
    }
  }

  for (const [planId, list] of byPlan) {
    if (list.length > 1) {
      issues.push({
        code: "duplicate_lo_plan",
        message: `Duplicate Scout LO rows for planId ${planId}: ${list.map((l) => l.id).join(", ")}`,
        planId,
      });
    }
  }
  for (const [tradeId, list] of byTrade) {
    if (list.length > 1) {
      issues.push({
        code: "duplicate_lo_trade",
        message: `Duplicate Trade LO rows for tradeId ${tradeId}: ${list.map((l) => l.id).join(", ")}`,
        tradeId,
      });
    }
  }

  for (const plan of input.plans) {
    if (!plan.outcome?.recordedAt) continue;
    const lo = byPlan.get(plan.id.toUpperCase())?.[0];
    if (!lo) {
      issues.push({
        code: "plan_outcome_missing_lo",
        message: `Plan ${plan.id} has outcome.recordedAt but no Scout Learning Outcome`,
        planId: plan.id,
      });
    }
    if (plan.outcome.learningSyncStatus === "complete" && !lo) {
      issues.push({
        code: "sync_complete_missing_lo",
        message: `Plan ${plan.id} learningSyncStatus=complete but durable LO missing`,
        planId: plan.id,
      });
    }
    if (
      plan.outcome.learningOutcomeId &&
      !loById.has(plan.outcome.learningOutcomeId.toUpperCase())
    ) {
      issues.push({
        code: "stale_learning_outcome_id",
        message: `Plan ${plan.id} learningOutcomeId ${plan.outcome.learningOutcomeId} does not exist`,
        planId: plan.id,
        learningOutcomeId: plan.outcome.learningOutcomeId,
      });
    }
    if (isUplPlan(plan) || lo?.kind === "unexecuted_plan_loss") {
      const obs = obsByPlan.get(plan.id.toUpperCase());
      if (lo && !obs) {
        issues.push({
          code: "missing_obs_link",
          message: `UPL LO ${lo.id} missing Observation for plan ${plan.id}`,
          planId: plan.id,
          learningOutcomeId: lo.id,
        });
      }
    }
  }

  for (const lo of input.learningOutcomes) {
    if (lo.planId && !planById.has(lo.planId.toUpperCase())) {
      issues.push({
        code: "lo_orphaned_plan",
        message: `LO ${lo.id} planId ${lo.planId} points to no plan`,
        learningOutcomeId: lo.id,
        planId: lo.planId,
      });
    }
    if (lo.tradeId && !tradeById.has(lo.tradeId.toUpperCase())) {
      issues.push({
        code: "lo_orphaned_trade",
        message: `LO ${lo.id} tradeId ${lo.tradeId} points to no trade`,
        learningOutcomeId: lo.id,
        tradeId: lo.tradeId,
      });
    }
  }

  return issues;
}
