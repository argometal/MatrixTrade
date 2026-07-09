import { calculateTradeResult } from "./calculate";
import type { Trade } from "./types";

export type MonthlyRisk = {
  monthKey: string;
  /** Base monthly cap from rules (negative USD, e.g. -300). */
  monthlyLossLimit: number;
  /** Positive USD base allowance (e.g. 300). */
  baseCap: number;
  /** Unused cap rolled from the previous calendar month only (positive USD). */
  carryoverIn: number;
  /** Total allowance this month: base + carryover (positive USD, e.g. 398). */
  monthlyAllowance: number;
  /** Total loss allowed this month as negative USD (e.g. -398). */
  effectiveLossCap: number;
  /** Closed-trade P/L in the current calendar month only. */
  monthlyRealizedPnL: number;
  /** Losses used in the previous calendar month (positive USD). */
  previousMonthLossUsed: number;
  /** Positive USD remaining before hitting the monthly allowance. */
  monthlyLossRoom: number;
  monthlyCapBreached: boolean;
  closedTradesThisMonth: number;
  closedTradesPreviousMonth: number;
  previousMonthKey: string;
};

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Local calendar month from an ISO timestamp (avoids UTC slice shifting month). */
export function monthKeyFromIso(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return iso.slice(0, 7);
  return currentMonthKey(new Date(parsed));
}

export function isTradeInMonth(trade: Trade, monthKey: string): boolean {
  if (trade.status !== "closed") return false;
  const stamp = trade.closedAt ?? trade.createdAt;
  return monthKeyFromIso(stamp) === monthKey;
}

export function countClosedTradesInMonth(trades: Trade[], monthKey: string): number {
  return trades.filter((t) => isTradeInMonth(t, monthKey)).length;
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

/**
 * Carryover from the immediately previous calendar month only.
 * If that month had no closed trades → $0 carryover (no free $300 rollover).
 * If it had losses → unused = baseCap - losses (e.g. 300 - 202 = 98).
 */
export function carryoverFromPreviousMonth(
  trades: Trade[],
  previousMonthKey: string,
  baseCap: number
): { carryoverIn: number; previousMonthLossUsed: number; closedTrades: number } {
  const closedTrades = countClosedTradesInMonth(trades, previousMonthKey);
  if (closedTrades === 0) {
    return { carryoverIn: 0, previousMonthLossUsed: 0, closedTrades: 0 };
  }

  const monthlyPnL = sumClosedPnLInMonth(trades, previousMonthKey);
  const previousMonthLossUsed = Math.abs(Math.min(monthlyPnL, 0));
  const carryoverIn = Math.max(0, baseCap - previousMonthLossUsed);
  return { carryoverIn, previousMonthLossUsed, closedTrades };
}

export function computeMonthlyRisk(
  trades: Trade[],
  monthlyLossLimit: number,
  monthKey?: string
): MonthlyRisk {
  const key = monthKey ?? currentMonthKey();
  const baseCap = Math.abs(monthlyLossLimit);
  const prevKey = previousMonthKey(key);
  const prev = carryoverFromPreviousMonth(trades, prevKey, baseCap);
  const carryoverIn = prev.carryoverIn;
  const monthlyAllowance = baseCap + carryoverIn;
  const effectiveLossCap = -monthlyAllowance;

  const monthlyRealizedPnL = sumClosedPnLInMonth(trades, key);
  const lossUsedThisMonth = Math.abs(Math.min(monthlyRealizedPnL, 0));
  const monthlyLossRoom = Math.max(0, monthlyAllowance - lossUsedThisMonth);
  const monthlyCapBreached = monthlyRealizedPnL <= effectiveLossCap;

  return {
    monthKey: key,
    monthlyLossLimit,
    baseCap,
    carryoverIn,
    monthlyAllowance,
    effectiveLossCap,
    monthlyRealizedPnL,
    previousMonthLossUsed: prev.previousMonthLossUsed,
    monthlyLossRoom,
    monthlyCapBreached,
    closedTradesThisMonth: countClosedTradesInMonth(trades, key),
    closedTradesPreviousMonth: prev.closedTrades,
    previousMonthKey: prevKey,
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

export function isTickerLossBreached(tickerPnL: number, maxLossPerTicker: number): boolean {
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
