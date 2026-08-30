import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";
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
  outcome: string;
  strategyState: string;
  originalR: string;
  executableR: string;
  requiredAction: string;
  href: string;
};

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
      const evaluation = evaluateScoutOperationalState({
        plan,
        linkedTrades: [],
        reservations: [],
        now: new Date().toISOString(),
        minimumRR: 3,
      });
      const state = evaluation.detectedAssessment.operationalState;
      const outcome =
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
      return {
        id: plan.id,
        ticker: plan.ticker,
        planId: plan.id,
        outcome,
        strategyState: formatOperationalStateLabel(state),
        originalR: formatOperationalR(plan.plannedRR),
        executableR: formatOperationalR(
          evaluation.detectedAssessment.currentExecutableRR
        ),
        requiredAction: formatOperationalActionLabel(
          evaluation.detectedAssessment.nextAction
        ),
        href: `/mxt/planning?plan=${plan.id}`,
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
      row.outcome.includes("Expired") ||
      row.strategyState === "missed" ||
      row.strategyState === "needs reanalysis" ||
      row.executableR === "—R"
  );
}
