/**
 * Scout Learning metrics — separate from executed Trade P/L.
 * CURSOR-MTA-PLAN-OUTCOME-UPL-25-29
 */
import type { LearningOutcome } from "./learning-outcome-types";
import { SCOUT_EVALUATED_LO_KINDS } from "./learning-outcome-types";
import type { MafExperiment } from "./maf-types";
import type { TradePlan } from "./plan-types";

export type ScoutLearningAggregates = {
  evaluatedScoutCount: number;
  unexecutedPlanLossCount: number;
  /** LO kind=missed_opportunity — entry never reached; distinct from UPL. */
  missedOpportunityCount: number;
  counterfactualScoutR: number;
  triggeredPlansWithoutTrade: number;
  /** MAF-only — never inferred from unexecuted_plan_loss alone. */
  thesisEvaluationCount: number;
  thesisFailureCount: number;
  thesisFailureRate: number | null;
};

export type ScoutLearningAggregateFilters = {
  ticker?: string;
  playbookId?: string;
  stockFileId?: string;
  from?: string;
  to?: string;
};

function inRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  if (from && t < Date.parse(from)) return false;
  if (to && t > Date.parse(to)) return false;
  return true;
}

function loMatches(lo: LearningOutcome, f: ScoutLearningAggregateFilters): boolean {
  if (f.ticker && lo.ticker.toUpperCase() !== f.ticker.toUpperCase()) return false;
  if (f.playbookId && lo.playbookId !== f.playbookId) return false;
  if (f.stockFileId && lo.stockThesisId !== f.stockFileId) return false;
  if (f.from || f.to) {
    if (!inRange(lo.updatedAt ?? lo.createdAt, f.from, f.to)) return false;
  }
  return true;
}

/**
 * evaluatedScoutCount: Scout LOs excluding excludedFromMetrics.
 * unexecutedPlanLossCount: kind=unexecuted_plan_loss && !excluded.
 * counterfactualScoutR: sum counterfactualR across eligible Scout LOs.
 * triggeredPlansWithoutTrade: entryReached && !tradeId (from LO or plan outcomes).
 */
export function computeScoutLearningAggregates(input: {
  learningOutcomes: LearningOutcome[];
  plans?: TradePlan[];
  mafExperiments?: MafExperiment[];
  filters?: ScoutLearningAggregateFilters;
}): ScoutLearningAggregates {
  const f = input.filters ?? {};
  const los = input.learningOutcomes.filter((lo) => loMatches(lo, f));

  let evaluatedScoutCount = 0;
  let unexecutedPlanLossCount = 0;
  let missedOpportunityCount = 0;
  let counterfactualScoutR = 0;
  let triggeredPlansWithoutTrade = 0;

  for (const lo of los) {
    if (lo.excludedFromMetrics === true) continue;
    if (lo.kind === "duplicate_creation") continue;

    if (SCOUT_EVALUATED_LO_KINDS.has(lo.kind)) {
      evaluatedScoutCount += 1;
    }
    if (lo.kind === "unexecuted_plan_loss") {
      unexecutedPlanLossCount += 1;
    }
    if (lo.kind === "missed_opportunity") {
      missedOpportunityCount += 1;
    }
    if (
      SCOUT_EVALUATED_LO_KINDS.has(lo.kind) &&
      lo.counterfactualR !== undefined &&
      lo.counterfactualR !== null &&
      Number.isFinite(lo.counterfactualR)
    ) {
      counterfactualScoutR += lo.counterfactualR;
    }
    if (lo.entryReached === true && !lo.tradeId) {
      triggeredPlansWithoutTrade += 1;
    }
  }

  // Also count plan outcomes without LO yet (edge), if plans provided.
  if (input.plans) {
    for (const plan of input.plans) {
      const o = plan.outcome;
      if (!o?.recordedAt) continue;
      if (f.ticker && plan.ticker.toUpperCase() !== f.ticker.toUpperCase()) continue;
      if (o.entryReached === true || o.entryTriggered === true) {
        if (!plan.linkedTradeId && o.tradeExecuted === false) {
          const hasLo = los.some(
            (lo) => lo.planId?.toUpperCase() === plan.id.toUpperCase()
          );
          if (!hasLo) triggeredPlansWithoutTrade += 1;
        }
      }
    }
  }

  let thesisEvaluationCount = 0;
  let thesisFailureCount = 0;
  for (const exp of input.mafExperiments ?? []) {
    if (f.ticker && exp.ticker.toUpperCase() !== f.ticker.toUpperCase()) continue;
    if (f.playbookId && exp.playbookId !== f.playbookId) continue;
    const thesis = exp.attributions?.find((a) => a.component === "thesis_quality");
    if (
      thesis &&
      thesis.classification !== "inconclusive" &&
      thesis.classification !== "not_applicable"
    ) {
      thesisEvaluationCount += 1;
      if (thesis.classification === "failure") thesisFailureCount += 1;
    }
  }

  return {
    evaluatedScoutCount,
    unexecutedPlanLossCount,
    missedOpportunityCount,
    counterfactualScoutR: Math.round(counterfactualScoutR * 1000) / 1000,
    triggeredPlansWithoutTrade,
    thesisEvaluationCount,
    thesisFailureCount,
    thesisFailureRate:
      thesisEvaluationCount > 0
        ? Math.round((thesisFailureCount / thesisEvaluationCount) * 1000) / 1000
        : null,
  };
}
