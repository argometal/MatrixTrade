import { stripComputedTradeFields } from "./trades-store/mapping";
import type { Trade } from "./types";

/** API-safe trade — no Obsidian paths, no internal flags. */
export function toAiTradeDto(trade: Trade): Record<string, unknown> {
  return stripComputedTradeFields(trade) as unknown as Record<string, unknown>;
}

export function toAiTradesDto(trades: Trade[]): Record<string, unknown>[] {
  return trades.map(toAiTradeDto);
}
