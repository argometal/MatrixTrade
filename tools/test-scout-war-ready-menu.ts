/**
 * War-ready Case menu vs closed Scout learning units (miss / UPL).
 * Run: npx tsx tools/test-scout-war-ready-menu.ts
 */
import assert from "node:assert/strict";
import {
  countActivePlans,
  isClosedScoutLearningUnit,
  isWarReadyScoutPlan,
} from "../lib/plan-helpers";
import { computeScoutLearningAggregates } from "../lib/learning-scout-aggregates";
import type { TradePlan } from "../lib/plan-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";

function plan(overrides: Partial<TradePlan>): TradePlan {
  const now = "2026-08-15T00:00:00.000Z";
  return {
    id: "PLAN-001",
    ticker: "MSFT",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "5m",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const live = plan({ id: "PLAN-010", status: "watching" });
const ready = plan({ id: "PLAN-011", status: "ready" });
const expiredOpen = plan({ id: "PLAN-012", status: "expired" });
const missClosed = plan({
  id: "PLAN-003",
  status: "failed",
  outcome: {
    planId: "PLAN-003",
    recordedAt: nowIso(),
    outcomeKind: "missed_opportunity",
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
    updatedAt: nowIso(),
  },
});

function nowIso() {
  return "2026-08-15T12:00:00.000Z";
}

assert.equal(isWarReadyScoutPlan(live), true);
assert.equal(isWarReadyScoutPlan(ready), true);
assert.equal(isWarReadyScoutPlan(expiredOpen), false);
assert.equal(isWarReadyScoutPlan(missClosed), false);
assert.equal(isClosedScoutLearningUnit(missClosed), true);
assert.equal(isClosedScoutLearningUnit(live), false);
assert.equal(countActivePlans([live, ready, expiredOpen, missClosed]), 2);

const missLo: LearningOutcome = {
  id: "LO-MSFT-001",
  kind: "missed_opportunity",
  ticker: "MSFT",
  planId: "PLAN-003",
  realizedR: 0,
  counterfactualR: 6.25,
  entryReached: false,
  stopReachedBeforeTarget: false,
  targetReachedBeforeStop: true,
  nonExecutionReason: "entry_not_reached",
  lifecycleStatus: "observing",
  createdAt: nowIso(),
  updatedAt: nowIso(),
  source: "plan_outcome",
};

const uplLo: LearningOutcome = {
  id: "LO-TEST-002",
  kind: "unexecuted_plan_loss",
  ticker: "TEST",
  planId: "PLAN-001",
  realizedR: 0,
  counterfactualR: -1,
  entryReached: true,
  stopReachedBeforeTarget: true,
  targetReachedBeforeStop: false,
  nonExecutionReason: "order_not_staged",
  lifecycleStatus: "concluded",
  createdAt: nowIso(),
  updatedAt: nowIso(),
  source: "plan_outcome",
};

const agg = computeScoutLearningAggregates({
  learningOutcomes: [missLo, uplLo],
});
assert.equal(agg.missedOpportunityCount, 1);
assert.equal(agg.unexecutedPlanLossCount, 1);
assert.equal(agg.evaluatedScoutCount, 2);
assert.equal(agg.counterfactualScoutR, 5.25); // 6.25 + (-1)

console.log("test-scout-war-ready-menu: ok");
