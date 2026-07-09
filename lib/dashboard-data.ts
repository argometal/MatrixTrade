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
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import { getExperiment, getMonthlyRisk, getTrades } from "./storage";
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
  const [experiment, monthly, trades, playbooks, workerInbox] = await Promise.all([
    getExperiment(),
    getMonthlyRisk(),
    getTrades(),
    getPlaybooks(),
    fetchBridgeInbox(),
  ]);

  const pendingInbox = await listAllPendingInboxItems(workerInbox);
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
    attentionItems: buildAttentionItems(trades, pendingInbox, playbooks, monthly),
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
