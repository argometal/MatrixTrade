import { computeAllPlaybookStats, computeExpectancyR } from "./analytics";
import { calculateTradeResult, winRate } from "./calculate";
import { formatCycleLabel } from "./experiment-label";
import { getPlaybookName } from "./playbooks";
import { computeExpectancy, computeRMultiple, computeRiskAmount } from "./review";
import type { Playbook } from "./playbook-types";
import type { Experiment, Trade } from "./types";

import type { TradesWorkspaceData, TradesWorkspaceRow } from "./trades-workspace-types";
export type { TradesWorkspaceData, TradesWorkspaceRow } from "./trades-workspace-types";
export { formatTradeUsd } from "./trades-workspace-types";

export function suggestNextTradeId(trades: Trade[]): string {
  const nums = trades
    .map((t) => parseInt(t.id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `H${String(next).padStart(3, "0")}`;
}

function toRow(trade: Trade, playbooks: Playbook[]): TradesWorkspaceRow {
  const pnl = trade.status === "closed" ? calculateTradeResult(trade) : null;
  return {
    id: trade.id,
    ticker: trade.ticker,
    direction: trade.direction ?? "long",
    playbook: getPlaybookName(playbooks, trade.playbookId) ?? "—",
    entry: trade.entry,
    stop: trade.stop,
    target: trade.target ?? null,
    status: trade.status,
    pnl,
    rMultiple: trade.status === "closed" ? computeRMultiple(trade) : null,
    date: (trade.closedAt ?? trade.createdAt).slice(0, 10),
    reviewed: Boolean(trade.reviewedAt),
  };
}

export function buildTradesWorkspaceData(
  experiment: Experiment,
  trades: Trade[],
  playbooks: Playbook[],
  pendingInboxCount: number
): TradesWorkspaceData {
  const rows = [...trades]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((t) => toRow(t, playbooks));

  const openTrades = trades.filter((t) => t.status === "open");
  const positions = openTrades.map((t) => ({
    id: t.id,
    ticker: t.ticker,
    direction: t.direction ?? "long",
    risk: computeRiskAmount(t),
  }));
  const totalRisk = positions.reduce((s, p) => s + (p.risk ?? 0), 0);

  const closed = trades.filter((t) => t.status === "closed");
  const closedWithPnl = closed
    .map((t) => ({ trade: t, pnl: calculateTradeResult(t) ?? 0 }))
    .filter((x) => x.pnl !== null);

  const bestTrade = closedWithPnl.length
    ? [...closedWithPnl].sort((a, b) => b.pnl - a.pnl)[0]
    : null;
  const worstTrade = closedWithPnl.length
    ? [...closedWithPnl].sort((a, b) => a.pnl - b.pnl)[0]
    : null;

  const rRows = closed
    .map((t) => ({ trade: t, r: computeRMultiple(t) }))
    .filter((x): x is { trade: Trade; r: number } => x.r !== null);
  const highestR = rRows.length ? [...rRows].sort((a, b) => b.r - a.r)[0] : null;

  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (row) => row.playbookId !== null && row.closedCount > 0
  );
  const bestPb = playbookStats.length
    ? [...playbookStats].sort((a, b) => b.netPnL - a.netPnL)[0]
    : null;

  const recentClosed = closed
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      ticker: t.ticker,
      pnl: calculateTradeResult(t) ?? 0,
      date: (t.closedAt ?? t.createdAt).slice(0, 10),
    }));

  return {
    cycleLabel: formatCycleLabel(experiment),
    tradesMax: experiment.maxTrades,
    rows,
    counts: {
      open: trades.filter((t) => t.status === "open").length,
      pending: trades.filter((t) => t.status === "pending").length,
      closed: experiment.closedTrades,
      all: trades.length,
    },
    openSummary: {
      positions,
      totalRisk,
      count: openTrades.length,
    },
    insights: {
      bestTrade: bestTrade
        ? { id: bestTrade.trade.id, ticker: bestTrade.trade.ticker, pnl: bestTrade.pnl }
        : null,
      worstTrade: worstTrade
        ? { id: worstTrade.trade.id, ticker: worstTrade.trade.ticker, pnl: worstTrade.pnl }
        : null,
      highestR: highestR
        ? { id: highestR.trade.id, ticker: highestR.trade.ticker, r: highestR.r }
        : null,
      winRate: winRate(experiment),
      expectancy: computeExpectancy(trades),
      avgR: computeExpectancyR(trades),
      bestPlaybook: bestPb?.playbook
        ? { name: bestPb.playbook.name, pnl: bestPb.netPnL }
        : null,
    },
    recentClosed,
    playbooks: playbooks.map((p) => ({ id: p.id, name: p.name })),
    suggestedTradeId: suggestNextTradeId(trades),
    pendingInboxCount,
  };
}

export async function loadTradesWorkspaceData(): Promise<TradesWorkspaceData> {
  const { fetchBridgeInbox } = await import("./bridge");
  const { getExperiment, getTrades } = await import("./storage");
  const { getPlaybooks } = await import("./playbooks");
  const { listAllPendingInboxItems } = await import("./trading-inbox-storage");

  const [experiment, trades, playbooks, workerInbox] = await Promise.all([
    getExperiment(),
    getTrades(),
    getPlaybooks(),
    fetchBridgeInbox(),
  ]);
  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  return buildTradesWorkspaceData(experiment, trades, playbooks, pendingInbox.length);
}
