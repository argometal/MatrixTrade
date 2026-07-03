import { calculateTradeResult } from "./calculate";
import type { Experiment, MistakeType, Trade } from "./types";

export const MISTAKE_TYPES: readonly MistakeType[] = [
  "fomo",
  "chased",
  "oversized",
  "ignored_stop",
  "ignored_htf",
  "revenge",
  "none",
] as const;

export const MISTAKE_LABELS: Record<MistakeType, string> = {
  fomo: "FOMO",
  chased: "Chased entry",
  oversized: "Oversized",
  ignored_stop: "Ignored stop",
  ignored_htf: "Ignored HTF",
  revenge: "Revenge trade",
  none: "None",
};

export function isTradeReviewed(trade: Trade): boolean {
  return Boolean(trade.reviewedAt);
}

export function getUnreviewedTrades(trades: Trade[]): Trade[] {
  return trades
    .filter((t) => t.status === "closed" && !isTradeReviewed(t))
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
}

export function computeRMultiple(trade: Trade): number | null {
  if (trade.status !== "closed" || trade.exit === undefined) return null;
  const riskPerShare = trade.entry - trade.stop;
  if (riskPerShare <= 0) return null;
  const pnl = calculateTradeResult(trade);
  if (pnl === null) return null;
  const riskTotal = riskPerShare * trade.shares;
  if (riskTotal <= 0) return null;
  return pnl / riskTotal;
}

export function computeRiskAmount(trade: Trade): number | null {
  const riskPerShare = trade.entry - trade.stop;
  if (riskPerShare <= 0) return null;
  return riskPerShare * trade.shares;
}

export function computeHoldDays(trade: Trade): number | null {
  if (!trade.closedAt) return null;
  const start = new Date(trade.createdAt).getTime();
  const end = new Date(trade.closedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

export interface MistakeStat {
  id: MistakeType;
  label: string;
  count: number;
  totalCost: number;
  avgCost: number;
}

export function computeMistakeStats(trades: Trade[]): MistakeStat[] {
  const totals = new Map<MistakeType, { count: number; cost: number }>();

  for (const type of MISTAKE_TYPES) {
    if (type === "none") continue;
    totals.set(type, { count: 0, cost: 0 });
  }

  for (const trade of trades) {
    if (trade.status !== "closed" || !trade.mistakes?.length) continue;
    const pnl = calculateTradeResult(trade) ?? 0;
    for (const mistake of trade.mistakes) {
      if (mistake === "none") continue;
      const row = totals.get(mistake);
      if (!row) continue;
      row.count += 1;
      if (pnl < 0) row.cost += pnl;
    }
  }

  return MISTAKE_TYPES.filter((id) => id !== "none")
    .map((id) => {
      const row = totals.get(id) ?? { count: 0, cost: 0 };
      return {
        id,
        label: MISTAKE_LABELS[id],
        count: row.count,
        totalCost: row.cost,
        avgCost: row.count > 0 ? row.cost / row.count : 0,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => a.totalCost - b.totalCost);
}

export interface EquityPoint {
  id: string;
  label: string;
  cumulativePnL: number;
  tradePnL: number;
  date: string;
}

export function buildEquityCurve(trades: Trade[]): EquityPoint[] {
  const closed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (a.closedAt ?? a.createdAt).localeCompare(b.closedAt ?? b.createdAt));

  let cumulative = 0;
  const points: EquityPoint[] = [
    {
      id: "start",
      label: "Start",
      cumulativePnL: 0,
      tradePnL: 0,
      date: closed[0]?.createdAt ?? new Date().toISOString(),
    },
  ];

  for (const trade of closed) {
    const pnl = calculateTradeResult(trade) ?? 0;
    cumulative += pnl;
    points.push({
      id: trade.id,
      label: `${trade.id} ${trade.ticker}`,
      cumulativePnL: cumulative,
      tradePnL: pnl,
      date: trade.closedAt ?? trade.createdAt,
    });
  }

  return points;
}

export interface NextAction {
  label: string;
  href: string;
  kind: "review" | "open" | "close" | "new";
}

export function getNextAction(trades: Trade[], experiment: Experiment): NextAction | null {
  const unreviewed = getUnreviewedTrades(trades);
  if (unreviewed.length > 0) {
    const t = unreviewed[0];
    return {
      label: `Review ${t.id} · ${t.ticker}`,
      href: `/trades/${t.id}/review`,
      kind: "review",
    };
  }

  const open = trades.find((t) => t.status === "open");
  if (open) {
    return {
      label: `Manage ${open.id} · ${open.ticker}`,
      href: `/trades/${open.id}`,
      kind: "open",
    };
  }

  const pending = trades.find((t) => t.status === "pending");
  if (pending) {
    return {
      label: `Open ${pending.id} · ${pending.ticker}`,
      href: `/trades/${pending.id}`,
      kind: "close",
    };
  }

  if (experiment.closedTrades < experiment.maxTrades && experiment.remainingLossBudget > 0) {
    return { label: "Log next trade", href: "/trades/new", kind: "new" };
  }

  return null;
}

export function isBudgetWarning(experiment: Experiment): boolean {
  const used = experiment.realizedPnL - experiment.cycleLossLimit;
  const total = -experiment.cycleLossLimit;
  if (total <= 0) return false;
  return used / total >= 0.7;
}

export function suggestExportQuestion(
  trades: Trade[],
  mistakeStats: MistakeStat[]
): string {
  const unreviewed = getUnreviewedTrades(trades);
  if (unreviewed.length > 0) {
    return `I have ${unreviewed.length} closed trade(s) without review. What should I focus on when reviewing them?`;
  }
  if (mistakeStats.length > 0) {
    const top = mistakeStats[0];
    return `My costliest mistake is "${top.label}" (${top.totalCost.toFixed(2)} USD). What pattern should I break and what rule should I add?`;
  }
  return "Review my experiment state, trade analysis, and risk. What should I focus on next?";
}

export function computeExpectancy(trades: Trade[]): number | null {
  const closed = trades.filter((t) => t.status === "closed");
  if (closed.length === 0) return null;
  let sum = 0;
  for (const trade of closed) {
    sum += calculateTradeResult(trade) ?? 0;
  }
  return sum / closed.length;
}

export function computeAvgR(trades: Trade[]): number | null {
  const values = trades
    .filter((t) => t.status === "closed")
    .map(computeRMultiple)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeMaxDrawdown(trades: Trade[]): number {
  const curve = buildEquityCurve(trades);
  let peak = 0;
  let maxDd = 0;
  for (const point of curve) {
    if (point.cumulativePnL > peak) peak = point.cumulativePnL;
    const dd = point.cumulativePnL - peak;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}
