/**
 * Contaminated Plan DELETE — unit tests (memory stores).
 * Run: npx tsx tools/test-contaminated-plan-delete.ts
 */
import assert from "node:assert/strict";
import {
  CONTAMINATED_PLAN_DELETE_CONFIRMATION,
  deleteContaminatedPlan,
} from "../lib/contaminated-plan-delete";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import {
  __setLearningOutcomesStoreForTests,
  createMemoryLearningOutcomesStore,
} from "../lib/learning-outcomes-store";
import { __setTradesStoreForTests, createMemoryTradesStore } from "../lib/trades-json";
import type { TradePlan } from "../lib/plan-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";

function dupPlan(id: string): TradePlan {
  return {
    id,
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    playbookId: "expectancy-asymmetry",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    plannedRR: 5.6,
    outcome: {
      planId: id,
      recordedAt: "2026-08-16T09:06:42.252Z",
      outcomeKind: "duplicate_creation",
      tradeExecuted: false,
      entryTriggered: null,
      stopTriggered: null,
      targetTriggered: null,
      theoreticalResultR: null,
      realizedResultR: 0,
      outcomeSource: "manual_review",
      evidenceStatus: "partial",
      evidenceRefs: [],
      updatedAt: "2026-08-16T09:06:42.252Z",
    },
    createdAt: "2026-07-25T10:56:11.642Z",
    updatedAt: "2026-08-16T09:06:42.252Z",
  } as TradePlan;
}

function keepPlan(): TradePlan {
  return {
    id: "PLAN-010",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    playbookId: "expectancy-asymmetry",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    plannedRR: 5.6,
    createdAt: "2026-07-25T10:53:39.228Z",
    updatedAt: "2026-07-25T10:53:39.336Z",
  } as TradePlan;
}

async function withStores<T>(
  plans: TradePlan[],
  los: LearningOutcome[],
  fn: () => Promise<T>
): Promise<T> {
  __setPlansStoreForTests(createMemoryPlansStore(plans));
  __setLearningOutcomesStoreForTests(createMemoryLearningOutcomesStore(los));
  __setTradesStoreForTests(createMemoryTradesStore([]));
  try {
    return await fn();
  } finally {
    __setPlansStoreForTests(null);
    __setLearningOutcomesStoreForTests(null);
    __setTradesStoreForTests(null);
  }
}

async function run() {
  // Refuse without confirmation
  await withStores([keepPlan(), dupPlan("PLAN-011")], [], async () => {
    const bad = await deleteContaminatedPlan({
      planId: "PLAN-011",
      confirmation: "nope",
      reason: "cleanup contaminated duplicate",
    });
    assert.equal(bad.ok, false);
  });

  // Refuse non-duplicate
  await withStores([keepPlan()], [], async () => {
    const bad = await deleteContaminatedPlan({
      planId: "PLAN-010",
      confirmation: CONTAMINATED_PLAN_DELETE_CONFIRMATION,
      reason: "cleanup contaminated duplicate",
    });
    assert.equal(bad.ok, false);
  });

  // Delete 011 + exclusive LO; keep 010 and shared thesis id
  const lo011: LearningOutcome = {
    id: "LO-NFLX-001",
    kind: "duplicate_creation",
    ticker: "NFLX",
    planId: "PLAN-011",
    realizedR: 0,
    excludedFromMetrics: true,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-08-16T09:06:42.252Z",
    updatedAt: "2026-08-16T09:06:42.252Z",
  };
  await withStores(
    [keepPlan(), dupPlan("PLAN-011"), dupPlan("PLAN-012")],
    [
      lo011,
      {
        ...lo011,
        id: "LO-NFLX-002",
        planId: "PLAN-012",
      },
    ],
    async () => {
      const a = await deleteContaminatedPlan({
        planId: "PLAN-011",
        confirmation: CONTAMINATED_PLAN_DELETE_CONFIRMATION,
        reason: "erroneous contaminated duplicate of PLAN-010",
      });
      assert.equal(a.ok, true);
      if (!a.ok) return;
      assert.deepEqual(a.deletedLearningOutcomeIds, ["LO-NFLX-001"]);

      const b = await deleteContaminatedPlan({
        planId: "PLAN-012",
        confirmation: CONTAMINATED_PLAN_DELETE_CONFIRMATION,
        reason: "erroneous contaminated duplicate of PLAN-010",
      });
      assert.equal(b.ok, true);

      const { getPlans } = await import("../lib/plans");
      const { getLearningOutcomes } = await import("../lib/learning-outcome-store");
      const plans = await getPlans();
      const los = await getLearningOutcomes();
      assert.equal(plans.some((p) => p.id === "PLAN-010"), true);
      assert.equal(plans.some((p) => p.id === "PLAN-011"), false);
      assert.equal(plans.some((p) => p.id === "PLAN-012"), false);
      assert.equal(los.some((lo) => lo.planId === "PLAN-011"), false);
      assert.equal(los.some((lo) => lo.planId === "PLAN-012"), false);
      assert.equal(
        plans.filter((p) => ["PLAN-010", "PLAN-011", "PLAN-012"].includes(p.id))
          .length,
        1
      );
    }
  );

  console.log("test-contaminated-plan-delete: PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
