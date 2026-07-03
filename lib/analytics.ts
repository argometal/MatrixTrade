import { calculateTradeResult } from "./calculate";
import { computeRMultiple } from "./review";
import type { Playbook } from "./playbook-types";
import type { Trade } from "./types";

export function closedTrades(trades: Trade[]): Trade[] {
  return trades.filter((t) => t.status === "closed");
}

export function computeAvgWinner(trades: Trade[]): number | null {
  const winners = closedTrades(trades)
    .map((t) => calculateTradeResult(t))
    .filter((pnl): pnl is number => pnl !== null && pnl > 0);
  if (winners.length === 0) return null;
  return winners.reduce((a, b) => a + b, 0) / winners.length;
}

export function computeAvgLoser(trades: Trade[]): number | null {
  const losers = closedTrades(trades)
    .map((t) => calculateTradeResult(t))
    .filter((pnl): pnl is number => pnl !== null && pnl < 0);
  if (losers.length === 0) return null;
  return losers.reduce((a, b) => a + b, 0) / losers.length;
}

export function computeProfitFactor(trades: Trade[]): number | null {
  let grossWin = 0;
  let grossLoss = 0;
  for (const trade of closedTrades(trades)) {
    const pnl = calculateTradeResult(trade);
    if (pnl === null) continue;
    if (pnl > 0) grossWin += pnl;
    else if (pnl < 0) grossLoss += Math.abs(pnl);
  }
  if (grossLoss === 0) return grossWin > 0 ? Infinity : null;
  return grossWin / grossLoss;
}

export function computeExpectancyR(trades: Trade[]): number | null {
  const values = closedTrades(trades)
    .map(computeRMultiple)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeNetPnL(trades: Trade[]): number {
  let sum = 0;
  for (const trade of closedTrades(trades)) {
    sum += calculateTradeResult(trade) ?? 0;
  }
  return sum;
}

export function computeWinRate(trades: Trade[]): number | null {
  const closed = closedTrades(trades);
  if (closed.length === 0) return null;
  let wins = 0;
  for (const trade of closed) {
    const pnl = calculateTradeResult(trade);
    if (pnl !== null && pnl > 0) wins += 1;
  }
  return wins / closed.length;
}

export interface PlaybookStats {
  playbook: Playbook | null;
  playbookId: string | null;
  tradeCount: number;
  closedCount: number;
  winRate: number | null;
  avgWinner: number | null;
  avgLoser: number | null;
  profitFactor: number | null;
  expectancyR: number | null;
  netPnL: number;
  mistakesCount: number;
  lastTradeDate: string | null;
  tradeIds: string[];
}

function countMistakes(trades: Trade[]): number {
  let count = 0;
  for (const trade of trades) {
    if (!trade.mistakes?.length) continue;
    for (const m of trade.mistakes) {
      if (m !== "none") count += 1;
    }
  }
  return count;
}

function lastTradeDate(trades: Trade[]): string | null {
  const dates = trades
    .map((t) => t.closedAt ?? t.createdAt)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
  return dates[0] ?? null;
}

export function computePlaybookStats(
  playbook: Playbook | null,
  playbookId: string | null,
  allTrades: Trade[]
): PlaybookStats {
  const subset =
    playbookId === null
      ? allTrades.filter((t) => !t.playbookId)
      : allTrades.filter((t) => t.playbookId === playbookId);

  const closed = closedTrades(subset);

  return {
    playbook,
    playbookId,
    tradeCount: subset.length,
    closedCount: closed.length,
    winRate: computeWinRate(subset),
    avgWinner: computeAvgWinner(subset),
    avgLoser: computeAvgLoser(subset),
    profitFactor: computeProfitFactor(subset),
    expectancyR: computeExpectancyR(subset),
    netPnL: computeNetPnL(subset),
    mistakesCount: countMistakes(subset),
    lastTradeDate: lastTradeDate(subset),
    tradeIds: subset.map((t) => t.id),
  };
}

export function computeAllPlaybookStats(
  playbooks: Playbook[],
  trades: Trade[]
): PlaybookStats[] {
  const stats = playbooks.map((pb) => computePlaybookStats(pb, pb.id, trades));
  const unassigned = computePlaybookStats(null, null, trades);
  if (unassigned.tradeCount > 0) {
    stats.push(unassigned);
  }
  return stats;
}
