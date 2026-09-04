/**
 * MXT 021 — Go ticker preservation + Analyze package smoke + label semantics.
 */
import assert from "node:assert/strict";
import { buildPlanAttentionItems } from "../lib/plan-attention";
import { NO_ENTRY_DIAGNOSIS_LABEL } from "../lib/insights-case-labels";
import type { TradePlan } from "../lib/plan-types";

const plan = {
  id: "PLAN-013",
  ticker: "VGT",
  stockThesisId: "ST-VGT-001",
  status: "expired",
  analysisTimeframes: ["1W"],
  entryTimeframe: "1D",
  plannedEntry: 100,
  stopPrice: 92,
  targetPrice: 126,
  plannedRR: 3.25,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
  decision: {
    id: "DEC-adcda11f6503",
    verdict: "wait",
    decisionConfidence: 70,
    challenges: ["test"],
    decidedAt: "2026-07-31T00:00:00.000Z",
  },
} as TradePlan;

const items = buildPlanAttentionItems([plan]);
const review = items.find((i) => i.id === "plan-review-PLAN-013");
assert.ok(review, "plan review attention present");
assert.match(review!.href, /plan=PLAN-013/);
assert.match(review!.href, /thesis=ST-VGT-001/);
assert.match(review!.href, /ticker=VGT/);

assert.equal(NO_ENTRY_DIAGNOSIS_LABEL.OVER_OPTIMIZATION, "Possible Over-Optimization");
assert.ok(
  !NO_ENTRY_DIAGNOSIS_LABEL.OVER_OPTIMIZATION.includes("Missed /"),
  "must not conflate Missed Opportunity with Over-Optimization"
);

console.log("test-mxt-021-p0-repairs: ok");
