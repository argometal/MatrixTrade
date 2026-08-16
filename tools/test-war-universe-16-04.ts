/**
 * PROMPT 16-04 — Operational War Universe contract.
 * Canonical: isWarReadyScoutPlan / isOperationalWarPlan in lib/plan-helpers.ts
 * Run: npm run test:war-universe
 */
import assert from "node:assert/strict";
import {
  countActivePlans,
  isClosedScoutLearningUnit,
  isOperationalWarPlan,
  isWarReadyScoutPlan,
  planNeedsLearningSyncRepair,
  planNeedsStrategyReview,
} from "../lib/plan-helpers";
import { buildActiveScoutMonetaryRows } from "../lib/scout-monetary-metrics";
import { buildTradeProspects } from "../lib/trade-prospects";
import type { TradePlan, PlanOutcome } from "../lib/plan-types";

function nowIso() {
  return "2026-08-16T12:00:00.000Z";
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
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 140,
    plannedRR: 4,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function withOa(
  p: TradePlan,
  operationalState: NonNullable<
    NonNullable<TradePlan["decision"]>["operationalAssessment"]
  >["operationalState"]
): TradePlan {
  return {
    ...p,
    decision: {
      id: "DEC-1",
      verdict: "wait",
      decisionConfidence: 60,
      challenges: ["timing"],
      decidedAt: nowIso(),
      operationalAssessment: {
        thesisState: "unknown",
        operationalState,
        waitHorizon: "unknown",
        nextAction: operationalState === "missed" ? "replace_plan" : "monitor",
        freshness: "current",
        reviewRequired: false,
        reasonCodes:
          operationalState === "missed"
            ? ["entry_passed_without_execution"]
            : operationalState === "superseded"
              ? ["plan_superseded"]
              : ["manual_override"],
        source: "manual_override",
        confirmedAt: nowIso(),
      },
    },
  };
}

// --- included ---
const watchingLive = plan({ id: "PLAN-010", status: "watching" });
const readyLive = plan({
  id: "PLAN-011",
  status: "ready",
  plannedEntry: 100,
  stopPrice: 95,
  targetPrice: 120,
});
assert.equal(isWarReadyScoutPlan(watchingLive), true, "watching vivo → incluido");
assert.equal(isWarReadyScoutPlan(readyLive), true, "ready vivo → incluido");
assert.equal(isOperationalWarPlan(watchingLive), true, "alias matches");

// approaching OA still war-ready (belonging ≠ Action/Watch view)
assert.equal(
  isWarReadyScoutPlan(withOa(watchingLive, "approaching")),
  true,
  "approaching OA stays in war universe"
);

// --- excluded: missed + watching ---
const missedWatching = withOa(plan({ id: "PLAN-003", ticker: "AMD", status: "watching" }), "missed");
assert.equal(isWarReadyScoutPlan(missedWatching), false, "missed + watching → excluido");

// --- excluded: superseded + ready ---
const supersededReady = withOa(plan({ id: "PLAN-004", ticker: "INTC", status: "ready" }), "superseded");
assert.equal(isWarReadyScoutPlan(supersededReady), false, "superseded OA + ready → excluido");

// --- excluded: replacedByPlanId ---
const replaced = plan({
  id: "PLAN-005",
  status: "watching",
  replacedByPlanId: "PLAN-099",
});
assert.equal(isWarReadyScoutPlan(replaced), false, "replacedByPlanId → excluido");

// --- excluded: outcome recorded ---
const withOutcome = plan({
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
assert.equal(isWarReadyScoutPlan(withOutcome), false, "outcome recorded → excluido");
assert.equal(isClosedScoutLearningUnit(withOutcome), true);

// --- expired pending outcome: out of war, still reviewable ---
const expiredPending = plan({
  id: "PLAN-EXP",
  status: "expired",
});
assert.equal(isWarReadyScoutPlan(expiredPending), false, "expired → fuera de guerra");
assert.equal(planNeedsStrategyReview(expiredPending), true, "expired permanece en review");

// --- sync repair: out of war, stays in repair ---
const syncRepair = plan({
  id: "PLAN-006",
  status: "watching",
  outcome: {
    ...baseOutcome({
      planId: "PLAN-006",
      outcomeKind: "unexecuted_plan_loss",
      entryReached: true,
      stopReachedBeforeTarget: true,
      nonExecutionReason: "order_not_staged",
      theoreticalResultR: -1,
    }),
    learningSyncStatus: "failed",
    learningSyncError: "simulated",
  },
});
assert.equal(isWarReadyScoutPlan(syncRepair), false, "sync repair → fuera de guerra");
assert.equal(planNeedsLearningSyncRepair(syncRepair), true, "sync repair permanece en repair");

// --- consumers share the same gate ---
const universe = [
  watchingLive,
  readyLive,
  missedWatching,
  supersededReady,
  replaced,
  withOutcome,
  expiredPending,
  syncRepair,
];
const war = universe.filter(isWarReadyScoutPlan);
assert.deepEqual(
  war.map((p) => p.id).sort(),
  ["PLAN-010", "PLAN-011"],
  "war set is only live watching/ready"
);
assert.equal(countActivePlans(universe), 2);

const monetary = buildActiveScoutMonetaryRows(universe);
assert.ok(monetary.every((r) => r.planId === "PLAN-010" || r.planId === "PLAN-011"));

const prospects = buildTradeProspects(universe);
assert.ok(prospects.every((p) => p.planId === "PLAN-010" || p.planId === "PLAN-011"));
assert.ok(!prospects.some((p) => p.planId === "PLAN-003"));
assert.ok(!prospects.some((p) => p.planId === "PLAN-004"));
assert.ok(!prospects.some((p) => p.planId === "PLAN-006"));

console.log("test-war-universe-16-04: ok");
