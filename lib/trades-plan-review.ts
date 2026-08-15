import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";
import {
  PLAN_OUTCOME_KIND_LABELS,
  type PlanOutcomeKind,
} from "./plan-outcome-types";
import {
  evaluateScoutOperationalState,
  formatOperationalActionLabel,
  formatOperationalR,
  formatOperationalStateLabel,
} from "./scout-operational-state";

export type TradesPlanReviewGroup = "executed" | "non_executed" | "review";

export type NonExecutedPlanRow = {
  id: string;
  ticker: string;
  planId: string;
  /** Human summary — prefers recorded plan-outcome kind when present. */
  outcome: string;
  strategyState: string;
  originalR: string;
  executableR: string;
  requiredAction: string;
  href: string;
  /** True when plan.outcome.recordedAt is set (learning closed). */
  outcomeRecorded: boolean;
  counterfactualR: string | null;
};

/** Prefer canonical recorded Scout outcome over live operational guess. */
export function summarizeNonExecutedPlanOutcome(plan: TradePlan): string {
  const kind = plan.outcome?.outcomeKind as PlanOutcomeKind | undefined;
  if (kind && kind in PLAN_OUTCOME_KIND_LABELS) {
    return PLAN_OUTCOME_KIND_LABELS[kind];
  }
  const status = plan.outcome?.status;
  if (status === "theoretical_loss" && plan.outcome?.tradeExecuted === false) {
    return PLAN_OUTCOME_KIND_LABELS.unexecuted_plan_loss;
  }
  if (
    status === "entry_not_triggered" &&
    plan.outcome?.entryReached === false &&
    plan.outcome?.targetReachedBeforeStop === true
  ) {
    return PLAN_OUTCOME_KIND_LABELS.missed_opportunity;
  }
  if (plan.outcome?.recordedAt) {
    return status ? `Outcome · ${status}` : "Outcome recorded";
  }
  return "";
}

export function buildNonExecutedPlanRows(
  plans: TradePlan[],
  trades: Trade[]
): NonExecutedPlanRow[] {
  return plans
    .filter(
      (plan) =>
        !plan.linkedTradeId &&
        !trades.some((trade) => trade.planId === plan.id) &&
        (plan.status === "expired" ||
          plan.status === "failed" ||
          plan.status === "skipped" ||
          plan.outcome?.recordedAt === undefined)
    )
    .map((plan) => {
      const recorded = summarizeNonExecutedPlanOutcome(plan);
      const evaluation = evaluateScoutOperationalState({
        plan,
        linkedTrades: [],
        reservations: [],
        now: new Date().toISOString(),
        minimumRR: 3,
      });
      const state = evaluation.detectedAssessment.operationalState;
      const operationalOutcome =
        state === "missed"
          ? "Missed"
          : state === "expired"
            ? plan.outcome?.recordedAt
              ? "Expired — still viable"
              : "Expired — needs reassessment"
            : state === "marginal"
              ? "Marginal"
              : state === "needs_reanalysis"
                ? "Needs replacement"
                : "No trigger";

      const outcome = recorded || operationalOutcome;
      const cf =
        plan.outcome?.theoreticalResultR !== undefined &&
        plan.outcome?.theoreticalResultR !== null &&
        Number.isFinite(plan.outcome.theoreticalResultR)
          ? formatOperationalR(plan.outcome.theoreticalResultR)
          : null;

      return {
        id: plan.id,
        ticker: plan.ticker,
        planId: plan.id,
        outcome,
        strategyState: plan.outcome?.recordedAt
          ? "closed · learning"
          : formatOperationalStateLabel(state),
        originalR: formatOperationalR(plan.plannedRR),
        executableR: formatOperationalR(
          evaluation.detectedAssessment.currentExecutableRR
        ),
        requiredAction: plan.outcome?.recordedAt
          ? "Archive / MAF when ready"
          : formatOperationalActionLabel(
              evaluation.detectedAssessment.nextAction
            ),
        href: `/planning?plan=${plan.id}`,
        outcomeRecorded: Boolean(plan.outcome?.recordedAt),
        counterfactualR: cf,
      };
    })
    .sort((a, b) => a.ticker.localeCompare(b.ticker) || a.planId.localeCompare(b.planId));
}

export function buildReviewPlanRows(
  plans: TradePlan[],
  trades: Trade[]
): NonExecutedPlanRow[] {
  return buildNonExecutedPlanRows(plans, trades).filter(
    (row) =>
      row.outcomeRecorded ||
      row.outcome.includes("Expired") ||
      row.outcome === "Missed opportunity" ||
      row.outcome === "Unexecuted plan loss" ||
      row.strategyState === "missed" ||
      row.strategyState === "needs reanalysis" ||
      row.executableR === "—R"
  );
}
