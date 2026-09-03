import type { Trade } from "../types";
import type { TradesStore } from "./types";

/** In-memory trades stand-in for isolated Apply harnesses (tests only). */
export function createMemoryTradesStore(
  seed: Trade[] = []
): TradesStore & { rows: Trade[] } {
  const rows = seed.map((t) => ({ ...t }));
  return {
    rows,
    async readAll() {
      return rows.map((t) => ({ ...t }));
    },
    async upsert(trade) {
      const idx = rows.findIndex(
        (x) => x.id.toUpperCase() === trade.id.toUpperCase()
      );
      if (idx >= 0) rows[idx] = { ...trade };
      else rows.push({ ...trade });
      rows.sort((a, b) => a.id.localeCompare(b.id));
    },
  };
}
