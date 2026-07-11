import {
  computeAllPlaybookStats,
  computeProfitFactor,
  type PlaybookStats,
} from "./analytics";
import { calculateTradeResult, winRate } from "./calculate";
import { buildAttentionItems } from "./dashboard-attention";
import { fetchBridgeInbox } from "./bridge";
import { formatCycleLabel } from "./experiment-label";
import { getPlaybooks } from "./playbooks";
import {
  buildEquityCurve,
  computeAvgR,
  computeExpectancy,
  computeMistakeStats,
  type EquityPoint,
  type MistakeStat,
} from "./review";
import { buildPlanAttentionItems } from "./plan-attention";
import { countActivePlans, countPlansNeedingReview } from "./plan-helpers";
import { getPlans } from "./plans";
import { getExperiment, getMonthlyRisk, getTrades } from "./storage";
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import type { AttentionItem } from "./dashboard-attention";
import type { Experiment } from "./types";
import type { MonthlyRisk } from "./monthly-risk";

export type DashboardData = {
  experiment: Experiment;
  monthly: MonthlyRisk;
  cycleLabel: string;
  openTrades: number;
  pendingReviews: number;
  activePlaybooks: number;
  testingPlaybooks: number;
  activePlans: number;
  plansNeedingReview: number;
  attentionItems: AttentionItem[];
  mistakeStats: MistakeStat[];
  equityPoints: EquityPoint[];
  winRate: number;
  profitFactor: number | null;
  expectancy: number | null;
  avgR: number | null;
  bestPlaybook: PlaybookStats | null;
  worstPlaybook: PlaybookStats | null;
};

export async function loadDashboardData(): Promise<DashboardData> {
  try {
    const [experiment, monthly, trades, playbooks, workerInbox, plans] = await Promise.all([
      getExperiment(),
      getMonthlyRisk(),
      getTrades(),
      getPlaybooks(),
      fetchBridgeInbox(),
      getPlans(),
    ]);

    const pendingInbox = await listAllPendingInboxItems(workerInbox);
    const attentionItems = [
      ...buildAttentionItems(trades, pendingInbox, playbooks, monthly),
      ...buildPlanAttentionItems(plans),
    ].sort((a, b) => a.priority - b.priority);
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

export function formatDashboardUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export function formatDashboardPf(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}
