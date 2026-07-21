import { isTradeReviewed } from "./review";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import type { Trade } from "./types";

/**
 * Completado (sale del war room) = fill cerrado + review/análisis hecho.
 * Cerrado ≠ completado: closed sin review sigue en Scout.
 */
export function isTradeCompleteForScout(trade: Trade): boolean {
  return trade.status === "closed" && isTradeReviewed(trade);
}

export function isTradeActiveInScout(trade: Trade): boolean {
  return !isTradeCompleteForScout(trade);
}

/**
 * Trades for a Scout case: explicit plan links OR same ticker as the stock file.
 * Incomplete only — completed fills belong in Trades histórico.
 */
export function tradesForScoutCase(args: {
  thesis: StockThesis;
  thesisPlans: TradePlan[];
  trades: Trade[];
}): Trade[] {
  const { thesis, thesisPlans, trades } = args;
  const planIds = new Set(thesisPlans.map((p) => p.id.toUpperCase()));
  const linkedIds = new Set(
    thesisPlans.map((p) => p.linkedTradeId?.toUpperCase()).filter(Boolean) as string[]
  );
  const ticker = thesis.ticker.toUpperCase();

  const matched = trades.filter((t) => {
    if (!isTradeActiveInScout(t)) return false;
    const id = t.id.toUpperCase();
    if (linkedIds.has(id)) return true;
    if (t.planId && planIds.has(t.planId.toUpperCase())) return true;
    if (t.ticker.toUpperCase() === ticker) return true;
    return false;
  });

  return matched.sort((a, b) => a.id.localeCompare(b.id));
}

/** Tickers with incomplete fills that have no active stock file — orphan war-room cases. */
export function orphanIncompleteTradeTickers(
  trades: Trade[],
  activeTheses: StockThesis[]
): string[] {
  const covered = new Set(activeTheses.map((t) => t.ticker.toUpperCase()));
  const orphans = new Set<string>();
  for (const trade of trades) {
    if (!isTradeActiveInScout(trade)) continue;
    const ticker = trade.ticker.toUpperCase();
    if (!covered.has(ticker)) orphans.add(ticker);
  }
  return [...orphans].sort();
}

export function incompleteTradesForTicker(trades: Trade[], ticker: string): Trade[] {
  const t = ticker.toUpperCase();
  return trades
    .filter((trade) => trade.ticker.toUpperCase() === t && isTradeActiveInScout(trade))
    .sort((a, b) => a.id.localeCompare(b.id));
}
