import { calculateTradeResult } from "./calculate";
import { computeAllPlaybookStats, computeWinRate } from "./analytics";
import type { AiNote } from "./ai-notes-types";
import type { Playbook } from "./playbook-types";
import type { Experiment, Trade } from "./types";

export interface AiBridgeLiveSnapshot {
  openCount: number;
  pendingCount: number;
  closedCount: number;
  maxTrades: number;
  totalPnL: number;
  winRatePercent: number | null;
  expectancyPerTrade: number | null;
  playbookRows: Array<{
    name: string;
    netPnL: number;
    winRatePercent: number | null;
    tradeCount: number;
  }>;
  bestPlaybook: { name: string; netPnL: number } | null;
  worstPlaybook: { name: string; netPnL: number } | null;
  topPlaybooks: Array<{
    name: string;
    netPnL: number;
    winRatePercent: number | null;
    tradeCount: number;
  }>;
  recentClosed: Array<{
    id: string;
    ticker: string;
    direction: string;
    pnl: number | null;
    dateLabel: string;
  }>;
  aiNoteBullets: string[];
}

function formatDateLabel(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function buildAiBridgeLiveSnapshot(
  experiment: Experiment,
  trades: Trade[],
  playbooks: Playbook[],
  aiNotes: AiNote[]
): AiBridgeLiveSnapshot {
  const openCount = trades.filter((t) => t.status === "open").length;
  const pendingCount = trades.filter((t) => t.status === "pending").length;
  const closed = trades.filter((t) => t.status === "closed");
  const winRate = computeWinRate(trades);

  const stats = computeAllPlaybookStats(playbooks, trades)
    .filter((row) => row.tradeCount > 0)
    .sort((a, b) => b.netPnL - a.netPnL);

  const playbookRows = stats.slice(0, 4).map((row) => ({
    name: row.playbook?.name ?? "Unassigned",
    netPnL: row.netPnL,
    winRatePercent: row.winRate !== null ? Math.round(row.winRate * 100) : null,
    tradeCount: row.tradeCount,
  }));

  const topPlaybooks = stats.slice(0, 3).map((row) => ({
    name: row.playbook?.name ?? "Unassigned",
    netPnL: row.netPnL,
    winRatePercent: row.winRate !== null ? Math.round(row.winRate * 100) : null,
    tradeCount: row.tradeCount,
  }));

  const bestPlaybook =
    stats.length > 0
      ? { name: stats[0].playbook?.name ?? "Unassigned", netPnL: stats[0].netPnL }
      : null;
  const worstPlaybook =
    stats.length > 0
      ? {
          name: stats[stats.length - 1].playbook?.name ?? "Unassigned",
          netPnL: stats[stats.length - 1].netPnL,
        }
      : null;

  const recentClosed = [...closed]
    .sort((a, b) => (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt))
    .slice(0, 5)
    .map((trade) => ({
      id: trade.id,
      ticker: trade.ticker,
      direction: trade.direction === "short" ? "Short" : "Long",
      pnl: calculateTradeResult(trade),
      dateLabel: formatDateLabel(trade.closedAt ?? trade.createdAt),
    }));

  const aiNoteBullets = aiNotes.slice(0, 4).map((note) => {
    const prefix = note.tradeId ? `${note.tradeId}: ` : "";
    const body = note.body.trim().replace(/\s+/g, " ");
    const clipped = body.length > 90 ? `${body.slice(0, 90)}…` : body;
    return `${prefix}${clipped}`;
  });

  if (playbookRows.length > 0 && playbookRows[0].netPnL > 0) {
    aiNoteBullets.unshift(
      `${playbookRows[0].name} is your top playbook this cycle (+$${playbookRows[0].netPnL.toFixed(2)} net).`
    );
  }

  return {
    openCount,
    pendingCount,
    closedCount: closed.length,
    maxTrades: trades.length,
    totalPnL: experiment.realizedPnL,
    winRatePercent: winRate !== null ? Math.round(winRate * 100) : null,
    expectancyPerTrade:
      closed.length > 0 ? experiment.realizedPnL / closed.length : null,
    playbookRows,
    bestPlaybook,
    worstPlaybook,
    topPlaybooks,
    recentClosed,
    aiNoteBullets,
  };
}

export function formatSignedUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}
