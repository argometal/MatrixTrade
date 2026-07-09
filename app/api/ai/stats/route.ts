/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 */
import { NextResponse } from "next/server";
import {
  computeAllPlaybookStats,
  computeAvgLoser,
  computeAvgWinner,
  computeExpectancyR,
  computeNetPnL,
  computeProfitFactor,
  computeWinRate,
  closedTrades,
} from "@/lib/analytics";
import { aiSessionDisabledResponse, isAiSessionDisabled } from "@/lib/ai-session-disabled";
import { isAiSessionError, requireAiSession } from "@/lib/ai-auth";
import { computeMistakeStats } from "@/lib/review";
import { getPlaybooks } from "@/lib/playbooks";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";

export async function GET(request: Request): Promise<NextResponse> {
  if (isAiSessionDisabled()) return aiSessionDisabledResponse();

  const session = await requireAiSession(request, ["read:stats"]);
  if (isAiSessionError(session)) return session;

  const [trades, experiment, monthly, playbooks] = await Promise.all([
    getTrades(),
    getExperiment(),
    getMonthlyRisk(),
    getPlaybooks(),
  ]);

  const closed = closedTrades(trades);
  const playbookStats = computeAllPlaybookStats(playbooks, trades).map((row) => ({
    playbookId: row.playbookId,
    playbookName: row.playbook?.name ?? null,
    tradeCount: row.tradeCount,
    closedCount: row.closedCount,
    winRate: row.winRate,
    netPnL: row.netPnL,
    profitFactor: row.profitFactor,
    expectancyR: row.expectancyR,
  }));

  return NextResponse.json({
    ok: true,
    experiment: {
      realizedPnL: experiment.realizedPnL,
      grossLoss: experiment.grossLoss,
      closedTrades: experiment.closedTrades,
      wins: experiment.wins,
      losses: experiment.losses,
      maxTrades: experiment.maxTrades,
    },
    monthly: {
      monthKey: monthly.monthKey,
      monthlyLossLimit: monthly.monthlyLossLimit,
      monthlyAllowance: monthly.monthlyAllowance,
      carryoverIn: monthly.carryoverIn,
      lossUsedThisMonth: monthly.lossUsedThisMonth,
      effectiveLossCap: monthly.effectiveLossCap,
      monthlyRealizedPnL: monthly.monthlyRealizedPnL,
      monthlyLossRoom: monthly.monthlyLossRoom,
      monthlyCapBreached: monthly.monthlyCapBreached,
    },
    overall: {
      closedCount: closed.length,
      winRate: computeWinRate(trades),
      netPnL: computeNetPnL(trades),
      avgWinner: computeAvgWinner(trades),
      avgLoser: computeAvgLoser(trades),
      profitFactor: computeProfitFactor(trades),
      expectancyR: computeExpectancyR(trades),
    },
    mistakes: computeMistakeStats(trades),
    playbooks: playbookStats,
  });
}
