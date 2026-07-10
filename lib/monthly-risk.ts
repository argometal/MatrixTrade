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
  /** Closed-trade net P/L in the current calendar month only (signed USD). */
  monthlyRealizedPnL: number;
  /** Gross losses consumed this month (positive USD, wins do not offset). */
  lossUsedThisMonth: number;
  /** Gross losses in all calendar months before the current one (positive USD). */
  previousMonthLossUsed: number;
  /** Display cap: base budget + carryover when enabled (excludes spent). */
  monthlyRoomCap: number;
  /** Positive USD remaining before hitting the monthly allowance. */
  monthlyLossRoom: number;
  /** Whether unused prior-month budget rolls into this month's allowance. */
  carryoverEnabled: boolean;
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

/** Sum of absolute losing trade results in a month (loss budget consumed). */
export function sumGrossLossesInMonth(trades: Trade[], monthKey: string): number {
  let total = 0;
  for (const trade of trades) {
    if (!isTradeInMonth(trade, monthKey)) continue;
    const result = calculateTradeResult(trade);
    if (result !== null && result < 0) total += Math.abs(result);
  }
  return total;
}

export function countClosedTradesBeforeMonth(trades: Trade[], monthKey: string): number {
  let count = 0;
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    const stamp = trade.closedAt ?? trade.createdAt;
    if (monthKeyFromIso(stamp) < monthKey) count++;
  }
  return count;
}

/** Gross losses from all closed trades in calendar months strictly before monthKey. */
export function sumGrossLossesBeforeMonth(trades: Trade[], monthKey: string): number {
  let total = 0;
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    const stamp = trade.closedAt ?? trade.createdAt;
    if (monthKeyFromIso(stamp) >= monthKey) continue;
    const result = calculateTradeResult(trade);
    if (result !== null && result < 0) total += Math.abs(result);
  }
  return total;
}

/**
 * Carryover = unused budget after all prior experiment losses against one monthly cap.
 * Example: base $300, prior gross losses $202 → carryover $98.
 * No closed trades before this month → $0 carryover.
 */
export function carryoverFromPreviousMonth(
  trades: Trade[],
  monthKey: string,
  baseCap: number
): { carryoverIn: number; previousMonthLossUsed: number; closedTrades: number } {
  const closedTrades = countClosedTradesBeforeMonth(trades, monthKey);
  if (closedTrades === 0) {
    return { carryoverIn: 0, previousMonthLossUsed: 0, closedTrades: 0 };
  }

  const previousMonthLossUsed = sumGrossLossesBeforeMonth(trades, monthKey);
  const carryoverIn = Math.max(0, baseCap - previousMonthLossUsed);
  return { carryoverIn, previousMonthLossUsed, closedTrades };
}

export function computeMonthlyRisk(
  trades: Trade[],
  monthlyLossLimit: number,
  monthKey?: string,
  options?: { carryoverEnabled?: boolean }
): MonthlyRisk {
  const key = monthKey ?? currentMonthKey();
  const baseCap = Math.abs(monthlyLossLimit);
  const carryoverEnabled = options?.carryoverEnabled !== false;
  const prevKey = previousMonthKey(key);
  const prev = carryoverFromPreviousMonth(trades, key, baseCap);
  const carryoverIn = carryoverEnabled ? prev.carryoverIn : 0;
  const monthlyAllowance = baseCap + carryoverIn;
  const monthlyRoomCap = monthlyAllowance;
  const effectiveLossCap = -monthlyAllowance;

  const monthlyRealizedPnL = sumClosedPnLInMonth(trades, key);
  const lossUsedThisMonth = sumGrossLossesInMonth(trades, key);
  const monthlyLossRoom = Math.max(0, monthlyAllowance - lossUsedThisMonth);
  const monthlyCapBreached = lossUsedThisMonth >= monthlyAllowance;

  return {
    monthKey: key,
    monthlyLossLimit,
    baseCap,
    carryoverIn,
    monthlyAllowance,
    effectiveLossCap,
    monthlyRealizedPnL,
    lossUsedThisMonth,
    previousMonthLossUsed: prev.previousMonthLossUsed,
    monthlyRoomCap,
    monthlyLossRoom,
    carryoverEnabled,
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

export function isMonthlyCapBreached(
  lossUsedThisMonth: number,
  monthlyAllowance: number
): boolean {
  return lossUsedThisMonth >= monthlyAllowance;
}

export function wouldExceedMonthlyCap(
  lossUsedThisMonth: number,
  additionalResult: number,
  monthlyAllowance: number
): boolean {
  const additionalLoss = additionalResult < 0 ? Math.abs(additionalResult) : 0;
  return isMonthlyCapBreached(lossUsedThisMonth + additionalLoss, monthlyAllowance);
}

export function wouldExceedTickerCap(
  tickerPnL: number,
  additionalResult: number,
  maxLossPerTicker: number
): boolean {
  return isTickerLossBreached(tickerPnL + additionalResult, maxLossPerTicker);
}
