import { calculateTradeResult } from "./calculate";
import { computeAllPlaybookStats, computeExpectancyR, computeWinRate } from "./analytics";
import type { Playbook } from "./playbook-types";
import type { Experiment, Trade } from "./types";

export interface AiBridgeOverviewData {
  openTrades: number;
  pendingTrades: number;
  closedCycle: { closed: number };
  totalPnL: number;
  winRate: number | null;
  expectancyR: number | null;
  playbookSummary: {
    best: { name: string; pnl: number } | null;
    worst: { name: string; pnl: number } | null;
  };
  recentClosed: Array<{
    id: string;
    ticker: string;
    pnl: number;
    date: string;
    won: boolean;
  }>;
  topPlaybooks: Array<{
    name: string;
    winRate: number | null;
    pnl: number;
    trades: number;
  }>;
  pendingReviews: Array<{ id: string; ticker: string }>;
  unassignedTrades: Array<{ id: string; ticker: string; status: string }>;
}

export function buildAiBridgeOverview(
  experiment: Experiment,
  trades: Trade[],
  playbooks: Playbook[]
): AiBridgeOverviewData {
  const openTrades = trades.filter((t) => t.status === "open").length;
  const pendingTrades = trades.filter((t) => t.status === "pending").length;

  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (row) => row.playbookId !== null && row.closedCount > 0
  );
  const best = playbookStats.length
    ? [...playbookStats].sort((a, b) => b.netPnL - a.netPnL)[0]
    : null;
  const worst = playbookStats.length
    ? [...playbookStats].sort((a, b) => a.netPnL - b.netPnL)[0]
    : null;

  const recentClosed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt))
    .slice(0, 5)
    .map((t) => {
      const pnl = calculateTradeResult(t) ?? 0;
      return {
        id: t.id,
        ticker: t.ticker,
        pnl,
        date: (t.closedAt ?? t.createdAt).slice(0, 10),
        won: pnl > 0,
      };
    });

  const topPlaybooks = [...playbookStats]
    .sort((a, b) => b.netPnL - a.netPnL)
    .slice(0, 3)
    .map((row) => ({
      name: row.playbook?.name ?? "Unassigned",
      winRate: row.winRate,
      pnl: row.netPnL,
      trades: row.tradeCount,
    }));

  const pendingReviews = trades
    .filter((t) => t.status === "closed" && !t.reviewedAt)
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
    .slice(0, 5)
    .map((t) => ({ id: t.id, ticker: t.ticker }));

  const unassignedTrades = trades
    .filter((t) => t.status !== "closed" && !t.playbookId)
    .slice(0, 5)
    .map((t) => ({ id: t.id, ticker: t.ticker, status: t.status }));

  return {
    openTrades,
    pendingTrades,
    closedCycle: { closed: experiment.closedTrades },
    totalPnL: experiment.realizedPnL,
    winRate: computeWinRate(trades),
    expectancyR: computeExpectancyR(trades),
    playbookSummary: {
      best: best?.playbook
        ? { name: best.playbook.name, pnl: best.netPnL }
        : null,
      worst: worst?.playbook
        ? { name: worst.playbook.name, pnl: worst.netPnL }
        : null,
    },
    recentClosed,
    topPlaybooks,
    pendingReviews,
    unassignedTrades,
  };
}

export function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}
