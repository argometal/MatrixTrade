import assert from "node:assert/strict";
import {
  classifyIncompleteClosedTrade,
  formatIncompleteClosedSummary,
  listIncompleteClosedTrades,
} from "../lib/incomplete-closed-trades";
import type { Trade } from "../lib/types";

function base(partial: Partial<Trade> & Pick<Trade, "id" | "ticker" | "status">): Trade {
  return {
    entry: 100,
    stop: 90,
    shares: 10,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  } as Trade;
}

const closedBare = base({
  id: "H001",
  ticker: "AMZN",
  status: "closed",
  closedAt: "2026-07-10T00:00:00.000Z",
  exit: 95,
});

const closedReviewedPartial = base({
  id: "H002",
  ticker: "TSLA",
  status: "closed",
  closedAt: "2026-07-11T00:00:00.000Z",
  exit: 110,
  reviewedAt: "2026-07-12T00:00:00.000Z",
  playbookId: "structural-pullback-entry",
  planId: "PLAN-001",
  thesis: "Pullback to support",
  riskRewardPlanned: 3.2,
});

const closedComplete = base({
  id: "H003",
  ticker: "MSFT",
  status: "closed",
  closedAt: "2026-07-09T00:00:00.000Z",
  exit: 105,
  reviewedAt: "2026-07-09T12:00:00.000Z",
  playbookId: "structural-pullback-entry",
  planId: "PLAN-002",
  thesis: "OK",
  riskRewardPlanned: 3,
  lossClassification: "normal_valid_loss",
  postStopStudy: {
    enabled: true,
    durationDays: 90,
    startedAt: "2026-07-09T12:00:00.000Z",
    endsAt: "2026-10-07T12:00:00.000Z",
    originalTradeId: "H003",
    originalEntry: 100,
  },
});

const openTrade = base({ id: "H004", ticker: "NFLX", status: "open" });

assert.ok(classifyIncompleteClosedTrade(closedBare).includes("needs_review"));
assert.ok(classifyIncompleteClosedTrade(closedBare).includes("missing_playbook"));
assert.ok(classifyIncompleteClosedTrade(closedReviewedPartial).includes("missing_loss_classification"));
assert.deepEqual(classifyIncompleteClosedTrade(closedComplete), []);
assert.deepEqual(classifyIncompleteClosedTrade(openTrade), []);

const listed = listIncompleteClosedTrades([
  closedBare,
  closedReviewedPartial,
  closedComplete,
  openTrade,
]);
assert.equal(listed.length, 2);
assert.equal(listed[0].trade.id, "H002");
assert.match(formatIncompleteClosedSummary(listed[1]), /review pending/);

console.log("test-incomplete-closed-trades: ok");
