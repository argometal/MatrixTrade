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

const review = buildReviewPlanRows(plans, []);
assert.equal(review.some((row) => row.planId === "PLAN-301"), true);

console.log("test-trades-plan-review: ok");
