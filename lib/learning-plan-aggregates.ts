/**
 * Deterministic Learning aggregates — plan outcomes vs realized trades vs MAF.
 * Never mix counterfactual plan R into realizedTradeR.
 */
import type { MafExperiment } from "./maf-types";
import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";
import { computeRMultiple } from "./review";

export type LearningPlanAggregateFilters = {
  ticker?: string;
  playbookId?: string;
  stockFileId?: string;
  /** Inclusive ISO date range on outcome.recordedAt / trade.closedAt */
  from?: string;
  to?: string;
  thesisClassification?: string;
  tradeExecuted?: boolean;
  outcomeStatus?: string;
};

export type LearningPlanAggregates = {
  evaluatedPlanCount: number;
  triggeredPlanCount: number;
  untriggeredPlanCount: number;
  theoreticalPlanWins: number;
  theoreticalPlanLosses: number;
  theoreticalPlanBreakevens: number;
  theoreticalPlanR: number;
  realizedTradeR: number;
  thesisEvaluationCount: number;
  thesisFailureCount: number;
  thesisFailureRate: number | null;
  triggeredPlansWithoutTrade: number;
  executionOmissionCount: number;
};

const EXECUTION_OMISSION_TAGS = new Set([
  "approved-plan-not-staged",
  "approved_plan_not_staged",
  "execution-omission",
  "execution_omission",
]);

function inRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  if (from && t < Date.parse(from)) return false;
  if (to && t > Date.parse(to)) return false;
  return true;
}

function planMatches(plan: TradePlan, f: LearningPlanAggregateFilters): boolean {
  if (f.ticker && plan.ticker.toUpperCase() !== f.ticker.toUpperCase()) return false;
  if (f.playbookId && plan.playbookId !== f.playbookId) return false;
  if (f.stockFileId && plan.stockThesisId !== f.stockFileId) return false;
  if (f.outcomeStatus && plan.outcome?.status !== f.outcomeStatus) return false;
  if (
    f.tradeExecuted !== undefined &&
    Boolean(plan.outcome?.tradeExecuted) !== f.tradeExecuted
  ) {
    return false;
  }
  if (f.from || f.to) {
    if (!inRange(plan.outcome?.recordedAt, f.from, f.to)) return false;
  }
  return true;
}

export function computeLearningPlanAggregates(input: {
  plans: TradePlan[];
  trades: Trade[];
  mafExperiments: MafExperiment[];
  filters?: LearningPlanAggregateFilters;
}): LearningPlanAggregates {
  const f = input.filters ?? {};
  const evaluated = input.plans.filter(
    (p) => p.outcome?.recordedAt && planMatches(p, f)
  );

  let triggeredPlanCount = 0;
  let untriggeredPlanCount = 0;
  let theoreticalPlanWins = 0;
  let theoreticalPlanLosses = 0;
  let theoreticalPlanBreakevens = 0;
  let theoreticalPlanR = 0;
  let triggeredPlansWithoutTrade = 0;

  for (const plan of evaluated) {
    const o = plan.outcome!;
    if (o.entryTriggered === true) triggeredPlanCount += 1;
    if (o.entryTriggered === false || o.status === "entry_not_triggered") {
      untriggeredPlanCount += 1;
    }
    if (o.status === "theoretical_win") theoreticalPlanWins += 1;
    if (o.status === "theoretical_loss") theoreticalPlanLosses += 1;
    if (o.status === "theoretical_breakeven") theoreticalPlanBreakevens += 1;
    if (
      o.theoreticalResultR !== undefined &&
      o.theoreticalResultR !== null &&
      Number.isFinite(o.theoreticalResultR)
    ) {
      theoreticalPlanR += o.theoreticalResultR;
    }
    if (o.entryTriggered === true && o.tradeExecuted === false) {
      triggeredPlansWithoutTrade += 1;
    }
  }

  let realizedTradeR = 0;
  for (const trade of input.trades) {
    if (trade.status !== "closed") continue;
    if (f.ticker && trade.ticker.toUpperCase() !== f.ticker.toUpperCase()) continue;
    if (f.playbookId && trade.playbookId !== f.playbookId) continue;
    if (f.from || f.to) {
      if (!inRange(trade.closedAt, f.from, f.to)) continue;
    }
    const r = computeRMultiple(trade);
    if (r !== null && Number.isFinite(r)) realizedTradeR += r;
  }

  let thesisEvaluationCount = 0;
  let thesisFailureCount = 0;
  let executionOmissionCount = 0;

  for (const exp of input.mafExperiments) {
    if (f.ticker && exp.ticker.toUpperCase() !== f.ticker.toUpperCase()) continue;
    if (f.playbookId && exp.playbookId !== f.playbookId) continue;

    const thesis = exp.attributions?.find((a) => a.component === "thesis_quality");
    if (
      thesis &&
      thesis.classification !== "inconclusive" &&
      thesis.classification !== "not_applicable"
    ) {
      if (
        !f.thesisClassification ||
        thesis.classification === f.thesisClassification
      ) {
        thesisEvaluationCount += 1;
        if (thesis.classification === "failure") thesisFailureCount += 1;
      }
    }

    const exec = exp.attributions?.find((a) => a.component === "execution_quality");
    if (
      exec &&
      (exec.classification === "weak" || exec.classification === "failure")
    ) {
      const tag = String(exec.tag ?? "").trim().toLowerCase();
      if (EXECUTION_OMISSION_TAGS.has(tag)) {
        executionOmissionCount += 1;
      }
    }
  }

  return {
    evaluatedPlanCount: evaluated.length,
    triggeredPlanCount,
    untriggeredPlanCount,
    theoreticalPlanWins,
    theoreticalPlanLosses,
    theoreticalPlanBreakevens,
    theoreticalPlanR: Math.round(theoreticalPlanR * 1000) / 1000,
    realizedTradeR: Math.round(realizedTradeR * 1000) / 1000,
    thesisEvaluationCount,
    thesisFailureCount,
    thesisFailureRate:
      thesisEvaluationCount > 0
        ? Math.round((thesisFailureCount / thesisEvaluationCount) * 1000) / 1000
        : null,
    triggeredPlansWithoutTrade,
    executionOmissionCount,
  };
}
