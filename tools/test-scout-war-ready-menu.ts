/**
 * PROMPT 15-06 — War Menu = operational Case filter (not archive).
 * Canonical predicate: isWarReadyScoutPlan (watching|ready && !outcome.recordedAt).
 * Run: npm run test:scout-war-ready-menu
 */
import assert from "node:assert/strict";
import {
  countActivePlans,
  isClosedScoutLearningUnit,
  isWarReadyScoutPlan,
} from "../lib/plan-helpers";
import { computeScoutLearningAggregates } from "../lib/learning-scout-aggregates";
import { buildActiveScoutMonetaryRows } from "../lib/scout-monetary-metrics";
import { buildTradeProspects } from "../lib/trade-prospects";
import { formatPlansSnapshotSection } from "../lib/plan-snapshot";
import { isActiveStockThesisStatus } from "../lib/stock-thesis-types";
import type { TradePlan, PlanOutcome } from "../lib/plan-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { StockThesis } from "../lib/stock-thesis-types";

function nowIso() {
  return "2026-08-15T12:00:00.000Z";
}

function baseOutcome(
  overrides: Partial<PlanOutcome> & Pick<PlanOutcome, "planId" | "outcomeKind">
): PlanOutcome {
  return {
    recordedAt: nowIso(),
    tradeExecuted: false,
    entryTriggered: false,
    stopTriggered: false,
    targetTriggered: false,
    entryReached: false,
    stopReachedBeforeTarget: false,
    targetReachedBeforeStop: false,
    theoreticalResultR: 0,
    realizedResultR: 0,
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
    evidenceRefs: [],
    updatedAt: nowIso(),
    ...overrides,
  };
}

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

// --- Acceptance 1–2: watching / ready + no outcome → visible ---
const watchingLive = plan({ id: "PLAN-010", status: "watching" });
const readyLive = plan({
  id: "PLAN-011",
  status: "ready",
  plannedEntry: 100,
  stopPrice: 95,
  targetPrice: 120,
});
assert.equal(isWarReadyScoutPlan(watchingLive), true, "1. watching + no outcome → war-ready");
assert.equal(isWarReadyScoutPlan(readyLive), true, "2. ready + no outcome → war-ready");

// --- Acceptance 3: watching + terminal outcome → hidden ---
const watchingWithTerminal = plan({
  id: "PLAN-012",
  status: "watching",
  outcome: baseOutcome({
    planId: "PLAN-012",
    outcomeKind: "missed_opportunity",
    entryReached: false,
    targetReachedBeforeStop: true,
    nonExecutionReason: "entry_not_reached",
    theoreticalResultR: 4,
  }),
});
assert.equal(
  isWarReadyScoutPlan(watchingWithTerminal),
  false,
  "3. watching + terminal outcome → hidden"
);

// --- Acceptance 4: missed_opportunity → hidden (AMZN PLAN-008 case) ---
const amznMiss = plan({
  id: "PLAN-008",
  ticker: "AMZN",
  stockThesisId: "ST-AMZN-001",
  status: "failed",
  outcome: baseOutcome({
    planId: "PLAN-008",
    outcomeKind: "missed_opportunity",
    entryReached: false,
    targetReachedBeforeStop: true,
    nonExecutionReason: "entry_not_reached",
    theoreticalResultR: 5.2,
  }),
});
assert.equal(isWarReadyScoutPlan(amznMiss), false, "4. missed_opportunity → hidden");
assert.equal(isClosedScoutLearningUnit(amznMiss), true);

// --- Acceptance 5: unexecuted_plan_loss → hidden ---
const uplClosed = plan({
  id: "PLAN-009",
  ticker: "TEST",
  status: "failed",
  outcome: baseOutcome({
    planId: "PLAN-009",
    outcomeKind: "unexecuted_plan_loss",
    entryReached: true,
    stopReachedBeforeTarget: true,
    nonExecutionReason: "order_not_staged",
    theoreticalResultR: -1,
  }),
});
assert.equal(isWarReadyScoutPlan(uplClosed), false, "5. UPL → hidden");

// --- Acceptance 6: historical PLAN remains retrievable outside War Menu ---
const universe = [watchingLive, readyLive, watchingWithTerminal, amznMiss, uplClosed];
const warMenu = universe.filter(isWarReadyScoutPlan);
assert.deepEqual(
  warMenu.map((p) => p.id).sort(),
  ["PLAN-010", "PLAN-011"],
  "War Menu ids"
);
const archive = universe.filter(isClosedScoutLearningUnit);
assert.ok(
  archive.some((p) => p.id === "PLAN-008"),
  "6. PLAN-008 still in closed learning set"
);
assert.ok(
  universe.some((p) => p.id === "PLAN-008"),
  "6. PLAN-008 still in full plan universe (not deleted)"
);

// --- Acceptance 7: Stock File remains available for a new tactical PLAN ---
const stAmzn = {
  id: "ST-AMZN-001",
  ticker: "AMZN",
  status: "watching",
} as StockThesis;
assert.equal(
  isActiveStockThesisStatus(stAmzn.status),
  true,
  "7. ST-AMZN-001 remains active after PLAN-008 miss"
);
const amznWarPlans = universe.filter(
  (p) => p.stockThesisId === "ST-AMZN-001" && isWarReadyScoutPlan(p)
);
assert.equal(amznWarPlans.length, 0, "7. no war-ready AMZN plan after miss");
// New war-ready window can coexist with historical miss on same Stock File
const amznNewBattle = plan({
  id: "PLAN-015",
  ticker: "AMZN",
  stockThesisId: "ST-AMZN-001",
  status: "watching",
  plannedEntry: 180,
  stopPrice: 170,
  targetPrice: 220,
});
assert.equal(isWarReadyScoutPlan(amznNewBattle), true, "7. new PLAN on same Stock File is war-ready");
assert.equal(isWarReadyScoutPlan(amznMiss), false, "7. historical PLAN-008 stays out of War Menu");

assert.equal(countActivePlans(universe), 2);
assert.equal(countActivePlans([...universe, amznNewBattle]), 3);

// Downstream consumers share the same predicate
assert.equal(
  buildTradeProspects([readyLive, amznMiss, uplClosed]).map((p) => p.planId).join(","),
  "PLAN-011"
);
assert.equal(buildActiveScoutMonetaryRows([watchingLive, amznMiss]).length <= 1, true);
assert.ok(!formatPlansSnapshotSection([amznMiss, watchingLive]).includes("id:PLAN-008"));
assert.ok(formatPlansSnapshotSection([amznMiss, watchingLive]).includes("id:PLAN-010"));

// Insights archive still counts miss / UPL via Learning Outcomes (not War Menu)
const missLo: LearningOutcome = {
  id: "LO-AMZN-008",
  kind: "missed_opportunity",
  ticker: "AMZN",
  planId: "PLAN-008",
  realizedR: 0,
  counterfactualR: 5.2,
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
  id: "LO-TEST-009",
  kind: "unexecuted_plan_loss",
  ticker: "TEST",
  planId: "PLAN-009",
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
const agg = computeScoutLearningAggregates({ learningOutcomes: [missLo, uplLo] });
assert.equal(agg.missedOpportunityCount, 1);
assert.equal(agg.unexecutedPlanLossCount, 1);

console.log("test-scout-war-ready-menu: ok");
