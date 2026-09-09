import assert from "node:assert/strict";
import {
  buildNonExecutedPlanRows,
  buildReviewPlanRows,
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
    id: "PLAN-303",
    ticker: "TSLA",
    stockThesisId: "ST-TSLA-001",
    status: "expired",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 130,
    plannedRR: 3,
    outcome: {
      recordedAt: "2026-07-30T00:00:00.000Z",
      outcomeKind: "missed_opportunity",
      tradeExecuted: false,
      entryTriggered: false,
      stopTriggered: false,
      targetTriggered: true,
      theoreticalResultR: 3,
      realizedResultR: 0,
      outcomeSource: "manual_review",
      evidenceStatus: "verified",
      evidenceRefs: [],
      updatedAt: "2026-07-30T00:00:00.000Z",
      learningSyncStatus: "complete",
    },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
  },
];

const nonExecuted = buildNonExecutedPlanRows(plans, []);
assert.equal(nonExecuted.length >= 2, true);
assert.equal(
  nonExecuted.some((row) => row.planId === "PLAN-301" && row.outcome.includes("Expired")),
  true
);
assert.equal(
  nonExecuted.some((row) => row.planId === "PLAN-302" && row.outcome === "Marginal"),
  true
);
assert.equal(
  nonExecuted.some(
    (row) =>
      row.planId === "PLAN-303" &&
      row.outcome === "Missed opportunity" &&
      row.strategyState === "Outcome recorded"
  ),
  true
);

const review = buildReviewPlanRows(plans, []);
assert.equal(review.some((row) => row.planId === "PLAN-301"), true);
assert.equal(review.some((row) => row.planId === "PLAN-303"), false);

console.log("test-trades-plan-review: ok");
