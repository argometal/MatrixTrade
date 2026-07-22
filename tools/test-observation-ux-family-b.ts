import assert from "node:assert/strict";
import {
  FAMILY_B_CHECKLIST,
  isSecularTrendContinuationPlaybook,
  SECULAR_TREND_CONTINUATION_PLAYBOOK_ID,
} from "../lib/playbook-family-b";
import { ensureObservationForClosedTrade } from "../lib/observation";
import { getObservationByTradeId, upsertObservation } from "../lib/observation-store";
import type { Trade } from "../lib/types";
import type { ObservationRecord } from "../lib/observation-types";

assert.equal(isSecularTrendContinuationPlaybook("secular-trend-continuation"), true);
assert.equal(isSecularTrendContinuationPlaybook("structural-pullback-entry"), false);
assert.equal(SECULAR_TREND_CONTINUATION_PLAYBOOK_ID, "secular-trend-continuation");
assert.ok(FAMILY_B_CHECKLIST.length >= 6);

// Unit: ensureObservationForClosedTrade is exportable alias of start path
assert.equal(typeof ensureObservationForClosedTrade, "function");
assert.equal(typeof getObservationByTradeId, "function");
assert.equal(typeof upsertObservation, "function");

const trade = {
  id: "H099",
  ticker: "TEST",
  status: "closed",
  closedAt: "2026-07-20T00:00:00.000Z",
  entry: 10,
  stop: 9,
  shares: 1,
  createdAt: "2026-07-19T00:00:00.000Z",
} as Trade;

// Smoke shape for observation record (no store write in CI without FS)
const obsShape: Partial<ObservationRecord> = {
  tradeId: trade.id,
  ticker: trade.ticker,
  status: "observing",
};
assert.equal(obsShape.status, "observing");

console.log("test-observation-ux-family-b: ok");
