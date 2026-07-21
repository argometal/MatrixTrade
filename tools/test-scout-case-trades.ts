/**
 * Plain assert script — npm run via tsx (no vitest).
 * Run: npx tsx tools/test-scout-case-trades.ts
 */
import {
  incompleteTradesForTicker,
  isTradeActiveInScout,
  isTradeCompleteForScout,
  orphanIncompleteTradeTickers,
  tradesForScoutCase,
} from "../lib/scout-case-trades";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { Trade } from "../lib/types";
import type { TradePlan } from "../lib/plan-types";

function trade(partial: Partial<Trade> & Pick<Trade, "id" | "ticker" | "status">): Trade {
  return {
    entry: 100,
    stop: 90,
    shares: 10,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

const thesis = {
  id: "ST-AMZN-001",
  ticker: "AMZN",
  status: "watching",
  version: 1,
  style: "swing",
  thesis: "test",
  historicalAnalysis: [],
  levels: {
    majorSupport: 200,
    majorResistance: 300,
    primaryZone: { low: 220, high: 240 },
    targets: [260, 280],
  },
  riskRules: { minimumRR: 2, invalidation: "x" },
  currentHypothesis: "h",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
} as StockThesis;

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const open = trade({ id: "H001", ticker: "AMZN", status: "open" });
const closedPending = trade({
  id: "H002",
  ticker: "AMZN",
  status: "closed",
  exit: 95,
  closedAt: "2026-07-02T00:00:00.000Z",
});
const closedDone = trade({
  id: "H003",
  ticker: "AMZN",
  status: "closed",
  exit: 110,
  closedAt: "2026-07-02T00:00:00.000Z",
  reviewedAt: "2026-07-03T00:00:00.000Z",
});

assert(isTradeActiveInScout(open), "open should stay in Scout");
assert(isTradeActiveInScout(closedPending), "closed without review stays in Scout");
assert(isTradeCompleteForScout(closedDone), "reviewed closed is complete");
assert(!isTradeActiveInScout(closedDone), "reviewed closed leaves Scout");

const byTicker = tradesForScoutCase({
  thesis,
  thesisPlans: [] as TradePlan[],
  trades: [open, closedPending, closedDone],
});
assert(
  byTicker.map((t) => t.id).join(",") === "H001,H002",
  `expected H001,H002 got ${byTicker.map((t) => t.id)}`
);

const googl = trade({ id: "H010", ticker: "GOOGL", status: "open" });
assert(
  orphanIncompleteTradeTickers([googl], [thesis]).join(",") === "GOOGL",
  "GOOGL should be orphan ticker"
);
assert(incompleteTradesForTicker([googl], "GOOGL").length === 1, "GOOGL incomplete count");

console.log("test-scout-case-trades: ok");
