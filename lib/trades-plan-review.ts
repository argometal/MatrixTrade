import type { TradePlan } from "./plan-types";
import { isClosedScoutLearningUnit, planNeedsLearningSyncRepair, buildPlanEnterHref } from "./plan-helpers";
import { PLAN_OUTCOME_KIND_LABELS } from "./plan-outcome-types";
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
      if (isClosedScoutLearningUnit(plan)) {
        const kind = plan.outcome?.outcomeKind;
        return {
          id: plan.id,
          ticker: plan.ticker,
          planId: plan.id,
          outcome: kind ? PLAN_OUTCOME_KIND_LABELS[kind] : "Outcome recorded",
          strategyState: "Outcome recorded",
          originalR: formatOperationalR(plan.plannedRR),
          executableR: formatOperationalR(plan.outcome?.theoreticalResultR ?? null),
          requiredAction: planNeedsLearningSyncRepair(plan)
            ? "Retry learning sync"
            : "Open in Scout",
          href: buildPlanEnterHref(plan),
        };
      }
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
        href: buildPlanEnterHref(plan),
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
