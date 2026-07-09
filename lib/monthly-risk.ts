import { calculateTradeResult } from "./calculate";
import type { Trade } from "./types";

export type MonthlyRisk = {
  monthKey: string;
  /** Base monthly cap from rules (negative USD, e.g. -300). */
  monthlyLossLimit: number;
  /** Unused cap rolled from the previous calendar month (positive USD). */
  carryoverIn: number;
  /** Total loss allowed this month: base + carryover (negative USD). */
  effectiveLossCap: number;
  /** Closed-trade P/L in the current calendar month only. */
  monthlyRealizedPnL: number;
  /** Positive USD remaining before the effective monthly cap. */
  monthlyLossRoom: number;
  monthlyCapBreached: boolean;
  closedTradesThisMonth: number;
  previousMonthKey: string;
  previousMonthUnused: number;
};

export function currentMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return date.toISOString().slice(0, 7);
}

export function isTradeInMonth(trade: Trade, monthKey: string): boolean {
  if (trade.status !== "closed") return false;
  const stamp = trade.closedAt ?? trade.createdAt;
  return stamp.slice(0, 7) === monthKey;
}

export function sumClosedPnLInMonth(trades: Trade[], monthKey: string): number {
  let total = 0;
  for (const trade of trades) {
    if (!isTradeInMonth(trade, monthKey)) continue;
    const result = calculateTradeResult(trade);
    if (result !== null) total += result;
  }
  return total;
}

/** Unused cap from a single month using the base limit only (no nested carryover). */
export function unusedCapInMonth(trades: Trade[], monthKey: string, baseCap: number): number {
  const monthlyPnL = sumClosedPnLInMonth(trades, monthKey);
  const lossUsed = Math.abs(Math.min(monthlyPnL, 0));
  return Math.max(0, baseCap - lossUsed);
}

export function computeMonthlyRisk(
  trades: Trade[],
  monthlyLossLimit: number,
  monthKey?: string
): MonthlyRisk {
  const key = monthKey ?? currentMonthKey();
  const baseCap = Math.abs(monthlyLossLimit);
  const prevKey = previousMonthKey(key);
  const previousMonthUnused = unusedCapInMonth(trades, prevKey, baseCap);
  const carryoverIn = previousMonthUnused;
  const effectiveCapPositive = baseCap + carryoverIn;
  const effectiveLossCap = -effectiveCapPositive;

  const monthlyRealizedPnL = sumClosedPnLInMonth(trades, key);
  const lossUsedThisMonth = Math.abs(Math.min(monthlyRealizedPnL, 0));
  const monthlyLossRoom = Math.max(0, effectiveCapPositive - lossUsedThisMonth);
  const monthlyCapBreached = monthlyRealizedPnL <= effectiveLossCap;
  const closedThisMonth = trades.filter((t) => isTradeInMonth(t, key));

  return {
    monthKey: key,
    monthlyLossLimit,
    carryoverIn,
    effectiveLossCap,
    monthlyRealizedPnL,
    monthlyLossRoom,
    monthlyCapBreached,
    closedTradesThisMonth: closedThisMonth.length,
    previousMonthKey: prevKey,
    previousMonthUnused,
  };
}

export function sumTickerRealizedPnL(trades: Trade[], ticker: string, excludeTradeId?: string): number {
  const symbol = ticker.trim().toUpperCase();
  let total = 0;
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    if (excludeTradeId && trade.id === excludeTradeId.toUpperCase()) continue;
    if (trade.ticker.toUpperCase() !== symbol) continue;
    const result = calculateTradeResult(trade);
    if (result !== null) total += result;
  }
  return total;
}

export function isTickerLossBreached(
  tickerPnL: number,
  maxLossPerTicker: number
): boolean {
  return tickerPnL <= maxLossPerTicker;
}

export function formatMonthlyLossRoom(room: number): string {
  return `$${room.toFixed(2)}`;
}

export function isMonthlyCapBreached(monthlyRealizedPnL: number, effectiveLossCap: number): boolean {
  return monthlyRealizedPnL <= effectiveLossCap;
}

export function wouldExceedMonthlyCap(
  monthlyRealizedPnL: number,
  additionalResult: number,
  effectiveLossCap: number
): boolean {
  return isMonthlyCapBreached(monthlyRealizedPnL + additionalResult, effectiveLossCap);
}

export function wouldExceedTickerCap(
  tickerPnL: number,
  additionalResult: number,
  maxLossPerTicker: number
): boolean {
  return isTickerLossBreached(tickerPnL + additionalResult, maxLossPerTicker);
}
