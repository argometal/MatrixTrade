/**
 * Plan Outcome → LO → OBS durable sync reliability.
 * Run: npm run test:plan-outcome-learning-sync
 */
import assert from "node:assert/strict";
import {
  createMemoryPlansStore,
  __setPlansStoreForTests,
} from "../lib/plans-store";
import { __setLearningOutcomeStoreForTests } from "../lib/learning-outcome-store";
import {
  __setObservationsStoreForTests,
  createMemoryObservationsStore,
} from "../lib/observations-store";
import {
  __setPlanOutcomeSyncTestHooks,
  reconcilePlanOutcomeLearning,
  sanitizeLearningSyncError,
  syncPlanOutcomeLearning,
  verifyPlanOutcomeLearningLinks,
} from "../lib/plan-outcome-learning-sync";
import { persistPlanOutcome } from "../lib/plan-outcome";
import { buildPlanAttentionItems } from "../lib/plan-attention";
import {
  classifyNeedsAttentionTaskType,
  buildNeedsAttentionTaskId,
  getAllowedApplyBlocksForNeedsAttentionTask,
  getNeedsAttentionCompletionCondition,
} from "../lib/needs-attention-ai";
import { computeScoutLearningAggregates } from "../lib/learning-scout-aggregates";
import { getLearningOutcomes } from "../lib/learning-outcome-store";
import { getObservations } from "../lib/observation-store";
import { getPlanById } from "../lib/plans";
import { AUTOMATIC_EXECUTION_ENABLED } from "../lib/plan-outcome-types";
import type { TradePlan } from "../lib/plan-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import { verifyApplyPersistence } from "../lib/apply-verify";
import type { TradingInboxPayload } from "../lib/bridge";

assert.equal(AUTOMATIC_EXECUTION_ENABLED, false);

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-001",
    ticker: "NFLX",
    status: "expired",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 348,
    stopPrice: 320,
    targetPrice: 430,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function resetStores(seedPlans: TradePlan[] = []) {
  __setPlanOutcomeSyncTestHooks(null);
  __setPlansStoreForTests(createMemoryPlansStore(seedPlans));
  __setLearningOutcomeStoreForTests([]);
  __setObservationsStoreForTests(createMemoryObservationsStore(), "memory");
}

function uplOutcome(
  planId: string,
  sync?: Partial<NonNullable<TradePlan["outcome"]>>
): NonNullable<TradePlan["outcome"]> {
  return {
    planId,
    recordedAt: "2026-07-20T00:00:00.000Z",
    status: "theoretical_loss",
    outcomeKind: "unexecuted_plan_loss",
    tradeExecuted: false,
    entryTriggered: true,
    stopTriggered: true,
    targetTriggered: false,
    entryReached: true,
    stopReachedBeforeTarget: true,
    targetReachedBeforeStop: false,
    nonExecutionReason: "order_not_staged",
    theoreticalResultR: -1,
    realizedResultR: 0,
    realizedPnL: 0,
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
    evidenceRefs: [],
    updatedAt: "2026-07-20T00:00:00.000Z",
    learningSyncStatus: "pending",
    ...sync,
  };
}

async function main() {
  // Sanitize
  {
    const msg = sanitizeLearningSyncError(
      new Error("fail api_key=supersecret token=abc stack\n  at foo")
    );
    assert.ok(!msg.includes("supersecret"));
    assert.ok(!msg.includes("\n"));
  }

  // Needs Attention contract
  {
    assert.equal(
      classifyNeedsAttentionTaskType("plan-outcome-sync-PLAN-001"),
      "sync_plan_outcome_learning"
    );
    assert.equal(
      buildNeedsAttentionTaskId("plan-outcome-sync-PLAN-001"),
      "ATTN-SYNC-PLAN-OUTCOME-PLAN-001"
    );
    assert.deepEqual(
      getAllowedApplyBlocksForNeedsAttentionTask("sync_plan_outcome_learning"),
      []
    );
    assert.match(
      getNeedsAttentionCompletionCondition("sync_plan_outcome_learning"),
      /learningSyncStatus=complete/
    );
  }

  // -------------------------------------------------------------------------
  // A — Plan outcome + successful LO/OBS
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({ outcome: uplOutcome("PLAN-001") });
    resetStores([plan]);
    const sync = await syncPlanOutcomeLearning("PLAN-001");
    assert.equal(sync.ok, true, sync.errors?.join("; "));
    const reloaded = await getPlanById("PLAN-001");
    assert.equal(reloaded?.outcome?.learningSyncStatus, "complete");
    assert.ok(reloaded?.outcome?.learningOutcomeId);
    assert.ok(reloaded?.outcome?.observationId);

    const los = await getLearningOutcomes();
    const obs = await getObservations();
    assert.equal(los.length, 1);
    assert.equal(los[0].kind, "unexecuted_plan_loss");
    assert.equal(los[0].tradeId, undefined);
    assert.equal(los[0].realizedR, 0);
    assert.equal(los[0].counterfactualR, -1);
    assert.equal(los[0].lifecycleStatus, "concluded");
    assert.equal(obs.length, 1);
    assert.equal(obs[0].learningOutcomeId, los[0].id);
    assert.equal(los[0].observationId, obs[0].id);

    const verify = verifyPlanOutcomeLearningLinks(reloaded!, los[0], obs[0]);
    assert.equal(verify.ok, true);

    const attn = buildPlanAttentionItems([reloaded!], los, obs);
    assert.ok(!attn.some((i) => i.id === "plan-outcome-sync-PLAN-001"));
    assert.ok(!attn.some((i) => i.id === "plan-review-PLAN-001"));

    const applyVerify = await verifyApplyPersistence({
      type: "plan-outcome",
      proposal: { planId: "PLAN-001" },
    } as TradingInboxPayload);
    assert.equal(applyVerify.ok, true, applyVerify.detail);
  }

  // -------------------------------------------------------------------------
  // B — LO write fails → failed status + repair attention + partial persist path
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({
      id: "PLAN-002",
      outcome: uplOutcome("PLAN-002"),
    });
    resetStores([plan]);
    __setPlanOutcomeSyncTestHooks({
      failLoWrite: new Error("simulated LO write failure"),
    });
    const sync = await syncPlanOutcomeLearning("PLAN-002");
    assert.equal(sync.ok, false);
    const reloaded = await getPlanById("PLAN-002");
    assert.equal(reloaded?.outcome?.recordedAt, "2026-07-20T00:00:00.000Z");
    assert.equal(reloaded?.outcome?.learningSyncStatus, "failed");
    assert.match(reloaded?.outcome?.learningSyncError ?? "", /simulated LO write failure/);

    const los = await getLearningOutcomes();
    const obs = await getObservations();
    assert.equal(los.length, 0);
    const attn = buildPlanAttentionItems([reloaded!], los, obs);
    assert.ok(attn.some((i) => i.id === "plan-outcome-sync-PLAN-002"));
    assert.ok(!attn.some((i) => i.id === "plan-review-PLAN-002"));

    const applyVerify = await verifyApplyPersistence({
      type: "plan-outcome",
      proposal: { planId: "PLAN-002" },
    } as TradingInboxPayload);
    assert.equal(applyVerify.ok, false);
    __setPlanOutcomeSyncTestHooks(null);
  }

  // -------------------------------------------------------------------------
  // C — OBS write fails; retry completes without duplicate LO
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({
      id: "PLAN-003",
      outcome: uplOutcome("PLAN-003"),
    });
    resetStores([plan]);
    __setPlanOutcomeSyncTestHooks({
      failObsWrite: new Error("simulated OBS write failure"),
    });
    const fail = await syncPlanOutcomeLearning("PLAN-003");
    assert.equal(fail.ok, false);
    let los = await getLearningOutcomes();
    assert.equal(los.length, 1); // LO may exist
    assert.equal((await getObservations()).length, 0);
    assert.equal((await getPlanById("PLAN-003"))?.outcome?.learningSyncStatus, "failed");

    __setPlanOutcomeSyncTestHooks(null);
    const retry = await syncPlanOutcomeLearning("PLAN-003");
    assert.equal(retry.ok, true, retry.errors?.join("; "));
    los = await getLearningOutcomes();
    const obs = await getObservations();
    assert.equal(los.length, 1);
    assert.equal(obs.length, 1);
    assert.equal((await getPlanById("PLAN-003"))?.outcome?.learningSyncStatus, "complete");
  }

  // -------------------------------------------------------------------------
  // D — Retry same plan: one LO, one OBS, metrics once
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({
      id: "PLAN-004",
      outcome: uplOutcome("PLAN-004"),
    });
    resetStores([plan]);
    assert.equal((await syncPlanOutcomeLearning("PLAN-004")).ok, true);
    assert.equal((await syncPlanOutcomeLearning("PLAN-004")).ok, true);
    const los = await getLearningOutcomes();
    const obs = await getObservations();
    assert.equal(los.length, 1);
    assert.equal(obs.length, 1);
    const scout = computeScoutLearningAggregates({ learningOutcomes: los });
    assert.equal(scout.unexecutedPlanLossCount, 1);
    assert.equal(scout.counterfactualScoutR, -1);
  }

  // -------------------------------------------------------------------------
  // E — Existing MAF link preserved
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({
      id: "PLAN-005",
      outcome: uplOutcome("PLAN-005"),
    });
    resetStores([plan]);
    assert.equal((await syncPlanOutcomeLearning("PLAN-005")).ok, true);
    const { upsertLearningOutcome } = await import("../lib/learning-outcome-store");
    let lo = (await getLearningOutcomes())[0];
    lo = {
      ...lo,
      mafExperimentId: "MAF-NFLX-001",
      lifecycleStatus: "concluded",
      updatedAt: new Date().toISOString(),
    };
    await upsertLearningOutcome(lo);
    assert.equal((await syncPlanOutcomeLearning("PLAN-005")).ok, true);
    const again = (await getLearningOutcomes())[0];
    assert.equal(again.mafExperimentId, "MAF-NFLX-001");
    assert.equal(again.id, lo.id);
  }

  // -------------------------------------------------------------------------
  // F — Legacy plan outcome without sync status
  // -------------------------------------------------------------------------
  {
    const completeLegacy = basePlan({
      id: "PLAN-006",
      outcome: {
        ...uplOutcome("PLAN-006"),
        learningSyncStatus: undefined,
      },
    });
    const lo: LearningOutcome = {
      id: "LO-NFLX-006",
      kind: "unexecuted_plan_loss",
      ticker: "NFLX",
      planId: "PLAN-006",
      realizedR: 0,
      counterfactualR: -1,
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      lifecycleStatus: "concluded",
      observationId: "OBS-NFLX-006",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      source: "plan_outcome",
    };
    const obs = {
      id: "OBS-NFLX-006",
      planId: "PLAN-006",
      ticker: "NFLX",
      status: "concluded" as const,
      startedAt: "2026-07-20T00:00:00.000Z",
      endsAt: "2026-10-18T00:00:00.000Z",
      durationDays: 90,
      learningOutcomeId: "LO-NFLX-006",
      createdAt: "2026-07-20T00:00:00.000Z",
      lastUpdatedAt: "2026-07-20T00:00:00.000Z",
    };
    const vOk = verifyPlanOutcomeLearningLinks(completeLegacy, lo, obs);
    assert.equal(vOk.ok, true);
    assert.equal(vOk.effectiveStatus, "complete");

    const pendingLegacy = basePlan({
      id: "PLAN-007",
      outcome: {
        recordedAt: "2026-07-20T00:00:00.000Z",
        outcomeKind: "unexecuted_plan_loss",
        tradeExecuted: false,
        status: "theoretical_loss",
        theoreticalResultR: -1,
        realizedResultR: 0,
        evidenceRefs: [],
        updatedAt: "2026-07-20T00:00:00.000Z",
      },
    });
    const vPending = verifyPlanOutcomeLearningLinks(pendingLegacy, undefined, undefined);
    assert.equal(vPending.ok, false);
    assert.equal(vPending.effectiveStatus, "pending");

    const rows = reconcilePlanOutcomeLearning({
      plans: [completeLegacy, pendingLegacy],
      learningOutcomes: [lo],
      observations: [obs],
    });
    assert.equal(rows.find((r) => r.planId === "PLAN-006")?.needsRepair, false);
    assert.equal(rows.find((r) => r.planId === "PLAN-007")?.needsRepair, true);
  }

  // -------------------------------------------------------------------------
  // G — duplicate_creation excluded LO; no Scout metric contribution
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({
      id: "PLAN-011",
      outcome: {
        planId: "PLAN-011",
        recordedAt: "2026-07-20T00:00:00.000Z",
        status: "inconclusive",
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
        updatedAt: "2026-07-20T00:00:00.000Z",
        learningSyncStatus: "pending",
      },
    });
    resetStores([plan]);
    const sync = await syncPlanOutcomeLearning("PLAN-011");
    assert.equal(sync.ok, true, sync.errors?.join("; "));
    const los = await getLearningOutcomes();
    const obs = await getObservations();
    assert.equal(los.length, 1);
    assert.equal(los[0].kind, "duplicate_creation");
    assert.equal(los[0].excludedFromMetrics, true);
    assert.equal(obs.length, 0);
    const scout = computeScoutLearningAggregates({ learningOutcomes: los });
    assert.equal(scout.evaluatedScoutCount, 0);
    assert.equal(scout.unexecutedPlanLossCount, 0);
    assert.equal(scout.counterfactualScoutR, 0);

    const applyVerify = await verifyApplyPersistence({
      type: "plan-outcome",
      proposal: { planId: "PLAN-011", outcomeKind: "duplicate_creation" },
    } as TradingInboxPayload);
    assert.equal(applyVerify.ok, true, applyVerify.detail);
  }

  // Partial failure message via persist (LO fail after outcome write)
  {
    const plan = basePlan({ id: "PLAN-008", outcome: undefined });
    resetStores([plan]);
    __setPlanOutcomeSyncTestHooks({
      failLoWrite: new Error("persist LO boom"),
    });
    // Avoid getTrades dependency issues by seeding outcome then syncing — already covered in B.
    // Exercise persist path: plan without outcome.
    const result = await persistPlanOutcome({
      planId: "PLAN-008",
      status: "theoretical_loss",
      outcomeKind: "unexecuted_plan_loss",
      tradeExecuted: false,
      entryTriggered: true,
      stopTriggered: true,
      targetTriggered: false,
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      nonExecutionReason: "order_not_staged",
      theoreticalResultR: -1,
      realizedResultR: 0,
      realizedPnL: 0,
      outcomeSource: "counterfactual_observation",
      evidenceStatus: "verified",
      uplContract: true,
    });
    assert.equal(result.partialFailure, true);
    assert.ok(
      result.errors?.some((e) =>
        e.includes("Plan outcome persisted; Learning synchronization failed")
      )
    );
    const reloaded = await getPlanById("PLAN-008");
    assert.ok(reloaded?.outcome?.recordedAt);
    assert.equal(reloaded?.outcome?.learningSyncStatus, "failed");
    __setPlanOutcomeSyncTestHooks(null);
  }

  // Cleanup overrides
  __setPlansStoreForTests(null);
  __setLearningOutcomeStoreForTests(null);
  __setObservationsStoreForTests(null, null);
  __setPlanOutcomeSyncTestHooks(null);

  console.log("test-plan-outcome-learning-sync: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
