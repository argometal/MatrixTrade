import assert from "node:assert/strict";
import { analyzeOpportunityConsumption } from "../lib/opportunity-consumption";
import type { MarketRealityCaseWindow } from "../lib/market-reality-types";

const window: MarketRealityCaseWindow = {
  id: "MRW-FIXTURE-001",
  planId: "PLAN-FIXTURE",
  ticker: "NFLX",
  timeframe: "1d",
  source: "fixture",
  decisionBoundaryAt: "2026-07-25T00:00:00.000Z",
  windowStart: "2026-07-25T00:00:00.000Z",
  windowEnd: "2026-07-31T23:59:59.000Z",
  windowKind: "retrospective_observation",
  retrievedAt: "2026-09-08T00:00:00.000Z",
  sessionNote: "fixture",
  bars: [
    { timestamp: "2026-07-25T13:30:00.000Z", open: 61, high: 64, low: 61, close: 63, volume: 1 },
    { timestamp: "2026-07-28T13:30:00.000Z", open: 64, high: 66, low: 63, close: 65, volume: 1 },
    { timestamp: "2026-07-29T13:30:00.000Z", open: 66, high: 70, low: 67, close: 69, volume: 1 },
    { timestamp: "2026-07-30T13:30:00.000Z", open: 70, high: 75, low: 72, close: 74, volume: 1 },
    { timestamp: "2026-07-31T13:30:00.000Z", open: 73, high: 74, low: 64, close: 66, volume: 1 },
  ],
};

const analysis = analyzeOpportunityConsumption({
  window,
  plannedEntry: 60,
  stopPrice: 55,
  targetPrice: 88,
  plannedRR: 5.6,
  executionOccurred: false,
});

assert.equal(analysis.available, true);
assert.equal(analysis.plannedRiskPrice, 5);
assert.equal(analysis.favorableDisplacementPrice, 15);
assert.equal(analysis.favorableDisplacementR, 3);
assert.equal(analysis.maxFavorablePrice, 75);
assert.equal(analysis.pullbackLowAfterPeak, 64);
assert.equal(analysis.subsequentPullbackPrice, 11);
assert.equal(analysis.subsequentPullbackR, 2.2);
assert.equal(analysis.retestedOriginalEntryAfterPeak, false);
assert.equal(analysis.restoredRRAtDeepestPullback, 2.6667);
assert.equal(analysis.restoredOriginalAsymmetryAfterPeak, false);
assert.equal(analysis.checkpoints.length, 2);
assert.equal(analysis.checkpoints[0]!.reached, true);
assert.equal(analysis.checkpoints[1]!.reached, true);
assert.equal(analysis.checkpoints[0]!.subsequentMfePrice, 12.5);
assert.equal(analysis.checkpoints[0]!.subsequentMfeR, 2.5);
assert.equal(analysis.checkpoints[0]!.subsequentMaePrice, 0);
assert.equal(analysis.checkpoints[0]!.subsequentMaeR, 0);
assert.equal(analysis.checkpoints[0]!.timeToDeepestPullbackMs, 259200000);
assert.equal(analysis.checkpoints[1]!.laterPullbackObserved, true);
assert.equal(analysis.checkpoints[1]!.pullbackLowAfterThreshold, 64);
assert.equal(analysis.checkpoints[1]!.subsequentMfePrice, 10);
assert.equal(analysis.checkpoints[1]!.subsequentMfeR, 2);
assert.equal(analysis.checkpoints[1]!.subsequentMaePrice, 1);
assert.equal(analysis.checkpoints[1]!.subsequentMaeR, 0.2);
assert.equal(analysis.checkpoints[1]!.timeToDeepestPullbackMs, 259200000);
assert.equal(analysis.checkpoints[1]!.targetReachedAfterThreshold, false);
assert.equal(analysis.checkpoints[1]!.stopReachedAfterThreshold, false);
assert.equal(analysis.lateEntryGeometryAvailable, false);
assert.match(
  analysis.lateEntryGeometryReason ?? "",
  /Remaining distance to the original target is not a late-entry R:R/
);
assert.match(
  analysis.checkpointOrderingLimitation ?? "",
  /exclude the first crossing bar/
);

const duplicate = analyzeOpportunityConsumption({
  window,
  plannedEntry: 60,
  stopPrice: 55,
  targetPrice: 88,
  plannedRR: 5.6,
  executionOccurred: false,
  learningOutcome: {
    id: "LO-DUP",
    kind: "duplicate_creation",
    ticker: "NFLX",
    planId: "PLAN-DUP",
    realizedR: 0,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  },
});

assert.equal(duplicate.excludedFromAggregates, true);
assert.equal(duplicate.exclusionReason, "duplicate_creation");

const unavailable = analyzeOpportunityConsumption({
  window: null,
  plannedEntry: 60,
  stopPrice: 55,
  targetPrice: 88,
  plannedRR: 5.6,
  executionOccurred: false,
});

assert.equal(unavailable.available, false);
assert.match(unavailable.reason ?? "", /Case-bound Reality window or frozen plan geometry is missing/);
assert.equal(unavailable.lateEntryGeometryAvailable, false);

const executed = analyzeOpportunityConsumption({
  window,
  plannedEntry: 60,
  stopPrice: 55,
  targetPrice: 88,
  plannedRR: 5.6,
  executionOccurred: true,
});

assert.equal(executed.available, false);
assert.match(executed.reason ?? "", /Execution occurred/);
assert.equal(executed.checkpoints.length, 0);

console.log("test-opportunity-consumption: PASS");
