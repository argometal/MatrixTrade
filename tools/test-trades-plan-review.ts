/**
 * Trades Review / Never-executed plan rows — recorded outcomes surface as summary.
 * Run: npm run test:trades-plan-review
 */
import assert from "node:assert/strict";
import {
  buildNonExecutedPlanRows,
  buildReviewPlanRows,
  summarizeNonExecutedPlanOutcome,
} from "../lib/trades-plan-review";
import type { TradePlan } from "../lib/plan-types";

const plans: TradePlan[] = [
  {
    id: "PLAN-301",
    ticker: "SHOP",
    stockThesisId: "ST-SHOP-001",
    status: "expired",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 140,
    plannedRR: 4,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
  },
  {
    id: "PLAN-302",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 132,
    plannedRR: 3.2,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
  },
  {
    id: "PLAN-003",
    ticker: "MSFT",
    stockThesisId: "ST-MSFT-001",
    status: "failed",
    analysisTimeframes: ["1D"],
    entryTimeframe: "5m",
    plannedEntry: 350,
    stopPrice: 334,
    targetPrice: 450,
    plannedRR: 6.25,
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    outcome: {
      planId: "PLAN-003",
      recordedAt: "2026-08-15T00:00:00.000Z",
      outcomeKind: "missed_opportunity",
      status: "entry_not_triggered",
      tradeExecuted: false,
      entryTriggered: false,
      stopTriggered: false,
      targetTriggered: true,
      entryReached: false,
      stopReachedBeforeTarget: false,
      targetReachedBeforeStop: true,
      nonExecutionReason: "entry_not_reached",
      theoreticalResultR: 6.25,
      realizedResultR: 0,
      outcomeSource: "counterfactual_observation",
      evidenceStatus: "verified",
      evidenceRefs: [],
      updatedAt: "2026-08-15T00:00:00.000Z",
    },
  },
];

assert.equal(
  summarizeNonExecutedPlanOutcome(plans[2]!),
  "Missed opportunity"
);

const nonExecuted = buildNonExecutedPlanRows(plans, []);
assert.equal(nonExecuted.length >= 3, true);
assert.equal(
  nonExecuted.some((row) => row.planId === "PLAN-301" && row.outcome.includes("Expired")),
  true
);
assert.equal(
  nonExecuted.some((row) => row.planId === "PLAN-302" && row.outcome === "Marginal"),
  true
);
const msft = nonExecuted.find((row) => row.planId === "PLAN-003");
assert.ok(msft);
assert.equal(msft!.outcome, "Missed opportunity");
assert.equal(msft!.outcomeRecorded, true);
assert.equal(msft!.strategyState, "closed · learning");
assert.equal(msft!.counterfactualR, "6.3R");

const review = buildReviewPlanRows(plans, []);
assert.equal(review.some((row) => row.planId === "PLAN-301"), true);
assert.equal(review.some((row) => row.planId === "PLAN-003"), true);
assert.equal(
  review.find((row) => row.planId === "PLAN-003")?.outcome,
  "Missed opportunity"
);

console.log("test-trades-plan-review: ok");
