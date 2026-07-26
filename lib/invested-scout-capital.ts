/**
 * Invested Scout capital from open MTA Trades (actual execution data).
 * Model A: informational for equity/allocations — not a second cash subtraction.
 */
import type { Trade } from "./types";
import {
  configuredField,
  unconfiguredField,
  type CapitalField,
} from "./capital-types";

export type InvestedScoutCapitalResult = {
  field: CapitalField;
  openTradeCount: number;
  details: Array<{ tradeId: string; capital: number }>;
};

/**
 * Open Trade invested capital = remaining open quantity × average entry.
 * Trade schema: open size is `shares`; average entry is `entry`.
 * Excludes closed/pending Trades, External Positions, unexecuted Plans.
 */
export function computeInvestedScoutCapital(
  openTrades: Trade[]
): InvestedScoutCapitalResult {
  const details: Array<{ tradeId: string; capital: number }> = [];
  let sum = 0;
  let missing = 0;

  for (const t of openTrades) {
    if (t.status !== "open") continue;
    const qty = Number(t.shares);
    const entry = Number(t.entry);
    if (!(qty > 0) || !Number.isFinite(qty) || !(entry > 0) || !Number.isFinite(entry)) {
      missing += 1;
      continue;
    }
    const capital = qty * entry;
    details.push({ tradeId: t.id, capital });
    sum += capital;
  }

  if (missing > 0 && details.length === 0) {
    return {
      field: unconfiguredField(
        "open Trades lack required shares/entry for invested Scout capital"
      ),
      openTradeCount: 0,
      details,
    };
  }

  return {
    field: configuredField(sum),
    openTradeCount: details.length,
    details,
  };
}
