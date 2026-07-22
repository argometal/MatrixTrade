import {
  computeAllPlaybookStats,
  computeProfitFactor,
} from "./analytics";
import { winRate } from "./calculate";
import { buildAttentionItems } from "./dashboard-attention";
import { fetchBridgeInbox } from "./bridge";
import { formatCycleLabel } from "./experiment-label";
import { getPlaybooks } from "./playbooks";
import {
  buildEquityCurve,
  computeAvgR,
  computeExpectancy,
  computeMistakeStats,
} from "./review";
import { buildPlanAttentionItems } from "./plan-attention";
import { buildLearningAttentionItems } from "./learning-attention";
import { enrichAttentionItemsWithAiSnapshots } from "./needs-attention-ai";
import { countActivePlans, countPlansNeedingReview } from "./plan-helpers";
import { getPlans } from "./plans";
import { getExperiment, getMonthlyRisk, getTrades } from "./storage";
import { getStockTheses } from "./stock-theses";
import { getObservations } from "./observation-store";
import { getLearningOutcomes } from "./learning-outcome-store";
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import type { DashboardData } from "./dashboard-types";

export type { DashboardData } from "./dashboard-types";
export { formatDashboardUsd, formatDashboardPf } from "./dashboard-display";

export async function loadDashboardData(): Promise<DashboardData> {
  try {
    const [
      experiment,
      monthly,
      trades,
      playbooks,
      workerInbox,
      plans,
      stockTheses,
      observations,
      learningOutcomes,
    ] = await Promise.all([
      getExperiment(),
      getMonthlyRisk(),
      getTrades(),
      getPlaybooks(),
      fetchBridgeInbox(),
      getPlans(),
      getStockTheses(),
      getObservations(),
      getLearningOutcomes(),
    ]);

    const pendingInbox = await listAllPendingInboxItems(workerInbox);
    const rawItems = [
      ...buildAttentionItems(trades, pendingInbox, playbooks, monthly),
      ...buildPlanAttentionItems(plans),
      ...buildLearningAttentionItems(trades, observations, learningOutcomes),
    ].sort((a, b) => a.priority - b.priority);

    const attentionItems = enrichAttentionItemsWithAiSnapshots(rawItems, {
      trades,
      plans,
      playbooks,
      stockTheses,
      observations,
      learningOutcomes,
      pendingInbox,
      monthly,
      experiment,
    });

    const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
      (p) => p.playbookId !== null && p.closedCount > 0
    );

    return {
      experiment,
      monthly,
      cycleLabel: formatCycleLabel(experiment),
      openTrades: trades.filter((t) => t.status === "open").length,
      pendingReviews: trades.filter((t) => t.status === "closed" && !t.reviewedAt).length,
      activePlaybooks: playbooks.filter((p) => p.status === "ACTIVE").length,
      testingPlaybooks: playbooks.filter((p) => p.status === "TESTING").length,
      activePlans: countActivePlans(plans),
      plansNeedingReview: countPlansNeedingReview(plans),
      attentionItems,
      mistakeStats: computeMistakeStats(trades),
      equityPoints: buildEquityCurve(trades),
      winRate: winRate(experiment),
      profitFactor: computeProfitFactor(trades),
      expectancy: computeExpectancy(trades),
      avgR: computeAvgR(trades),
      bestPlaybook: playbookStats.length
        ? [...playbookStats].sort((a, b) => b.netPnL - a.netPnL)[0]
        : null,
      worstPlaybook: playbookStats.length
        ? [...playbookStats].sort((a, b) => a.netPnL - b.netPnL)[0]
        : null,
    };
  } catch (err) {
    console.error("loadDashboardData failed:", err);
    const emptyExperiment = {
      realizedPnL: 0,
      grossLoss: 0,
      closedTrades: 0,
      wins: 0,
      losses: 0,
    };
    return {
      experiment: emptyExperiment,
      monthly: {
        monthKey: new Date().toISOString().slice(0, 7),
        monthlyLossLimit: -300,
        baseCap: 300,
        carryoverIn: 0,
        carryoverEnabled: true,
        monthlyAllowance: 300,
        monthlyRoomCap: 300,
        lossUsedThisMonth: 0,
        effectiveLossCap: -300,
        previousMonthLossUsed: 0,
        monthlyRealizedPnL: 0,
        monthlyLossRoom: 0,
        monthlyCapBreached: false,
        closedTradesThisMonth: 0,
        closedTradesPreviousMonth: 0,
        previousMonthKey: "",
      },
      cycleLabel: formatCycleLabel(),
      openTrades: 0,
      pendingReviews: 0,
      activePlaybooks: 0,
      testingPlaybooks: 0,
      activePlans: 0,
      plansNeedingReview: 0,
      attentionItems: [],
      mistakeStats: [],
      equityPoints: [],
      winRate: 0,
      profitFactor: null,
      expectancy: null,
      avgR: null,
      bestPlaybook: null,
      worstPlaybook: null,
    };
  }
}
