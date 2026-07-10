import {
  computeAllPlaybookStats,
  computeAvgLoser,
  computeAvgWinner,
  computeProfitFactor,
} from "@/lib/analytics";
import { calculateTradeResult, winRate } from "@/lib/calculate";
import {
  buildEquityCurve,
  computeAvgR,
  computeExpectancy,
  computeMaxDrawdown,
  computeMistakeStats,
} from "@/lib/review";
import { getPlaybooks } from "@/lib/playbooks";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";
import type { PreviewStatsData } from "@/app/components/stats-preview/PreviewStats";

export async function loadStatsPageData(): Promise<PreviewStatsData> {
  const [trades, experiment, monthly, playbooks] = await Promise.all([
    getTrades(),
    getExperiment(),
    getMonthlyRisk(),
    getPlaybooks(),
  ]);

  const closed = trades.filter((t) => t.status === "closed");
  const expectancy = computeExpectancy(trades);
  const avgR = computeAvgR(trades);
  const maxDd = computeMaxDrawdown(trades);
  const rate = winRate(experiment);
  const equityPoints = buildEquityCurve(trades);
  const avgWinner = computeAvgWinner(trades);
  const avgLoser = computeAvgLoser(trades);
  const profitFactor = computeProfitFactor(trades);
  const mistakeStats = computeMistakeStats(trades);
  const mistakesCost = mistakeStats.reduce((sum, m) => sum + m.totalCost, 0);
  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (p) => p.closedCount > 0 || p.playbookId !== null
  );

  let bestTrade = closed[0];
  let worstTrade = closed[0];
  for (const t of closed) {
    const pnl = calculateTradeResult(t) ?? 0;
    const bestPnl = calculateTradeResult(bestTrade) ?? 0;
    const worstPnl = calculateTradeResult(worstTrade) ?? 0;
    if (pnl > bestPnl) bestTrade = t;
    if (pnl < worstPnl) worstTrade = t;
  }

  return {
    trades,
    experiment,
    monthly,
    equityPoints,
    winRatePct: rate * 100,
    expectancy,
    avgR,
    maxDd,
    avgWinner,
    avgLoser,
    profitFactor,
    mistakesCost,
    playbookStats,
    bestTrade,
    worstTrade,
  };
}
