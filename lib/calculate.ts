import type { Experiment, Trade } from "./types";

const FEES = 0;

export function calculateTradeResult(trade: Trade): number | null {
  if (trade.status !== "closed" || trade.exit === undefined) {
    return null;
  }
  return (trade.exit - trade.entry) * trade.shares - FEES;
}

export function isWin(result: number): boolean {
  return result > 0;
}

export function isLoss(result: number): boolean {
  return result < 0;
}

export function buildObsidianLink(
  tradeId: string,
  ticker: string,
  vault: string,
  tradesFolder = "Trades"
): string {
  const file = `${tradesFolder}/${tradeId}-${ticker.toUpperCase()}`;
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`;
}

export function computeExperiment(
  trades: Trade[],
  cycleLossLimit: number,
  maxTrades: number
): Experiment {
  const closed = trades.filter((t) => t.status === "closed");

  let realizedPnL = 0;
  let wins = 0;
  let losses = 0;

  for (const trade of closed) {
    const result = calculateTradeResult(trade);
    if (result === null) continue;

    realizedPnL += result;
    if (isWin(result)) wins += 1;
    else if (isLoss(result)) losses += 1;
  }

  return {
    cycleLossLimit,
    realizedPnL,
    remainingLossBudget: cycleLossLimit - realizedPnL,
    maxTrades,
    closedTrades: closed.length,
    wins,
    losses,
  };
}

export function winRate(experiment: Experiment): number {
  const total = experiment.wins + experiment.losses;
  if (total === 0) return 0;
  return experiment.wins / total;
}

export function isCycleLossLimitBreached(realizedPnL: number, cycleLossLimit: number): boolean {
  return realizedPnL <= cycleLossLimit;
}
