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
import { isAiSessionError, requireAiSession } from "@/lib/ai-auth";
import { computeMistakeStats } from "@/lib/review";
import { getPlaybooks } from "@/lib/playbooks";
import { getExperiment, getTrades } from "@/lib/storage";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await requireAiSession(request, ["read:stats"]);
  if (isAiSessionError(session)) return session;

  const [trades, experiment, playbooks] = await Promise.all([
    getTrades(),
    getExperiment(),
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
      remainingLossBudget: experiment.remainingLossBudget,
      closedTrades: experiment.closedTrades,
      wins: experiment.wins,
      losses: experiment.losses,
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
