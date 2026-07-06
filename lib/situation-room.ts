import { computeAllPlaybookStats, computeProfitFactor } from "./analytics";
import { calculateTradeResult, winRate } from "./calculate";
import type { BridgeInboxItem } from "./bridge";
import { fetchBridgeInbox } from "./bridge";
import { buildAttentionItems } from "./dashboard-attention";
import { getPlaybookName } from "./playbooks";
import { computeExpectancy, computeRMultiple, buildEquityCurve, type EquityPoint } from "./review";
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import type { Playbook } from "./playbook-types";
import type { Experiment, Trade } from "./types";

export type AlertSeverity = "danger" | "warning" | "info";

export interface SituationRoomAlert {
  id: string;
  severity: AlertSeverity;
  label: string;
  href: string;
}

export interface SituationRoomActivity {
  id: string;
  at: string;
  kind: string;
  label: string;
  href?: string;
}

export interface SituationRoomData {
  greeting: string;
  cycleLabel: string;
  summary: {
    totalPnL: number;
    winRate: number | null;
    wins: number;
    losses: number;
    expectancy: number | null;
    tradesUsed: number;
    tradesMax: number;
    lossBudgetRemaining: number;
    cycleLossLimit: number;
  };
  performance: {
    equityPoints: EquityPoint[];
    lossLimit: number;
    bestDay: number | null;
    worstDay: number | null;
    avgDailyPnL: number | null;
    profitFactor: number | null;
  };
  tradeStatus: {
    open: number;
    pending: number;
    underReview: number;
    closed: number;
    remaining: number;
    max: number;
  };
  recentClosed: Array<{
    id: string;
    ticker: string;
    direction: string;
    playbook: string;
    entry: number;
    exit: number | null;
    pnl: number;
    rMultiple: number | null;
    date: string;
  }>;
  recentActivity: SituationRoomActivity[];
  alerts: SituationRoomAlert[];
  topPlaybooks: Array<{
    name: string;
    winRate: number | null;
    pnl: number;
    trades: number;
  }>;
  pendingInboxCount: number;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function dailyPnLStats(trades: Trade[]): {
  bestDay: number | null;
  worstDay: number | null;
  avgDailyPnL: number | null;
} {
  const byDay = new Map<string, number>();
  for (const trade of trades.filter((t) => t.status === "closed")) {
    const day = (trade.closedAt ?? trade.createdAt).slice(0, 10);
    const pnl = calculateTradeResult(trade) ?? 0;
    byDay.set(day, (byDay.get(day) ?? 0) + pnl);
  }
  const values = [...byDay.values()];
  if (values.length === 0) {
    return { bestDay: null, worstDay: null, avgDailyPnL: null };
  }
  return {
    bestDay: Math.max(...values),
    worstDay: Math.min(...values),
    avgDailyPnL: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

function buildRecentActivity(trades: Trade[], playbooks: Playbook[]): SituationRoomActivity[] {
  const events: SituationRoomActivity[] = [];

  for (const trade of trades) {
    if (trade.status === "closed") {
      events.push({
        id: `close-${trade.id}`,
        at: trade.closedAt ?? trade.createdAt,
        kind: "trade-closed",
        label: `Trade closed · ${trade.id} ${trade.ticker}`,
        href: `/trades/${trade.id}`,
      });
    }
    if (trade.reviewedAt) {
      events.push({
        id: `review-${trade.id}`,
        at: trade.reviewedAt,
        kind: "review-completed",
        label: `Review completed · ${trade.id} ${trade.ticker}`,
        href: `/trades/${trade.id}/review`,
      });
    }
    events.push({
      id: `created-${trade.id}`,
      at: trade.createdAt,
      kind: "trade-logged",
      label: `Trade logged · ${trade.id} ${trade.ticker}`,
      href: `/trades/${trade.id}`,
    });
  }

  for (const pb of playbooks) {
    events.push({
      id: `playbook-${pb.id}`,
      at: new Date(0).toISOString(),
      kind: "playbook",
      label: `Playbook · ${pb.name} (${pb.status})`,
      href: "/playbook",
    });
  }

  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);
}

function buildAlerts(
  experiment: Experiment,
  trades: Trade[],
  pendingInbox: BridgeInboxItem[],
  playbooks: Playbook[]
): SituationRoomAlert[] {
  const alerts: SituationRoomAlert[] = [];

  if (experiment.remainingLossBudget <= 0) {
    alerts.push({
      id: "loss-limit",
      severity: "danger",
      label: "Cycle loss budget exhausted",
      href: "/stats",
    });
  } else if (experiment.remainingLossBudget < experiment.cycleLossLimit * 0.25) {
    alerts.push({
      id: "loss-warning",
      severity: "warning",
      label: "Loss budget running low",
      href: "/stats",
    });
  }

  for (const item of buildAttentionItems(trades, pendingInbox as never, playbooks)) {
    const severity: AlertSeverity =
      item.id.startsWith("review") ? "warning" : item.id === "inbox" ? "info" : "warning";
    alerts.push({
      id: item.id,
      severity,
      label: item.label,
      href: item.href,
    });
  }

  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (row) => row.playbookId !== null && row.closedCount >= 3
  );
  for (const row of playbookStats) {
    if (row.netPnL < 0) {
      alerts.push({
        id: `pb-under-${row.playbookId}`,
        severity: "warning",
        label: `Playbook underperforming · ${row.playbook?.name ?? "Unknown"}`,
        href: "/playbook",
      });
    }
  }

  for (const trade of trades.filter((t) => t.status === "open")) {
    if (!trade.stop) {
      alerts.push({
        id: `stop-${trade.id}`,
        severity: "danger",
        label: `Stop not set · ${trade.id} ${trade.ticker}`,
        href: `/trades/${trade.id}`,
      });
    }
  }

  return alerts.slice(0, 8);
}

export function buildSituationRoomData(
  experiment: Experiment,
  trades: Trade[],
  playbooks: Playbook[],
  pendingInboxCount: number,
  pendingInbox: BridgeInboxItem[]
): SituationRoomData {
  const open = trades.filter((t) => t.status === "open").length;
  const pending = trades.filter((t) => t.status === "pending").length;
  const underReview = trades.filter((t) => t.status === "closed" && !t.reviewedAt).length;
  const closed = experiment.closedTrades;
  const remaining = Math.max(0, experiment.maxTrades - experiment.closedTrades);

  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (row) => row.playbookId !== null && row.closedCount > 0
  );
  const topPlaybooks = [...playbookStats]
    .sort((a, b) => b.netPnL - a.netPnL)
    .slice(0, 3)
    .map((row) => ({
      name: row.playbook?.name ?? "Unassigned",
      winRate: row.winRate,
      pnl: row.netPnL,
      trades: row.tradeCount,
    }));

  const recentClosed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      ticker: t.ticker,
      direction: t.direction ?? "long",
      playbook: getPlaybookName(playbooks, t.playbookId) ?? "—",
      entry: t.entry,
      exit: t.exit ?? null,
      pnl: calculateTradeResult(t) ?? 0,
      rMultiple: computeRMultiple(t),
      date: (t.closedAt ?? t.createdAt).slice(0, 10),
    }));

  const daily = dailyPnLStats(trades);
  const hour = new Date().getHours();

  return {
    greeting: greetingForHour(hour),
    cycleLabel: "Cycle 1",
    summary: {
      totalPnL: experiment.realizedPnL,
      winRate: winRate(experiment),
      wins: experiment.wins,
      losses: experiment.losses,
      expectancy: computeExpectancy(trades),
      tradesUsed: experiment.closedTrades,
      tradesMax: experiment.maxTrades,
      lossBudgetRemaining: experiment.remainingLossBudget,
      cycleLossLimit: experiment.cycleLossLimit,
    },
    performance: {
      equityPoints: buildEquityCurve(trades),
      lossLimit: experiment.cycleLossLimit,
      bestDay: daily.bestDay,
      worstDay: daily.worstDay,
      avgDailyPnL: daily.avgDailyPnL,
      profitFactor: computeProfitFactor(trades),
    },
    tradeStatus: {
      open,
      pending,
      underReview,
      closed,
      remaining,
      max: experiment.maxTrades,
    },
    recentClosed,
    recentActivity: buildRecentActivity(trades, playbooks),
    alerts: buildAlerts(experiment, trades, pendingInbox, playbooks),
    topPlaybooks,
    pendingInboxCount,
  };
}

export async function loadSituationRoomData(): Promise<SituationRoomData> {
  const { getExperiment, getTrades } = await import("./storage");
  const { getPlaybooks } = await import("./playbooks");
  const [experiment, trades, playbooks, workerInbox] = await Promise.all([
    getExperiment(),
    getTrades(),
    getPlaybooks(),
    fetchBridgeInbox(),
  ]);
  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  return buildSituationRoomData(experiment, trades, playbooks, pendingInbox.length, pendingInbox);
}

export function formatSituationUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatSituationPct(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatProfitFactor(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}
