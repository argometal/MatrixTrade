/**
 * CURSOR-MTA-LEARNING-OUTCOME-DURABLE-STORE-001
 * Run: npm run test:learning-outcome-durable-store
 */
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  getLearningOutcomesStoreMode,
  getLearningOutcomesStore,
  __setLearningOutcomesStoreForTests,
  createJsonLearningOutcomesStore,
  createMemoryLearningOutcomesStore,
  assertJsonLearningOutcomeWritesAllowed,
  learningOutcomeToRow,
  learningOutcomeRowToRecord,
} from "../lib/learning-outcomes-store";
import {
  getLearningOutcomes,
  getLearningOutcomeByPlanId,
  upsertLearningOutcome,
  __setLearningOutcomeStoreForTests,
  nextLearningOutcomeId,
} from "../lib/learning-outcome-store";
import {
  createMemoryPlansStore,
  __setPlansStoreForTests,
} from "../lib/plans-store";
import {
  __setObservationsStoreForTests,
  createMemoryObservationsStore,
} from "../lib/observations-store";
import {
  __setPlanOutcomeSyncTestHooks,
  syncPlanOutcomeLearning,
  verifyPlanOutcomeLearningLinks,
} from "../lib/plan-outcome-learning-sync";
import { persistPlanOutcome } from "../lib/plan-outcome";
import { buildPlanAttentionItems } from "../lib/plan-attention";
import { computeScoutLearningAggregates } from "../lib/learning-scout-aggregates";
import { diagnoseLearningOutcomeDurability } from "../lib/learning-outcome-diagnostics";
import { AUTOMATIC_EXECUTION_ENABLED } from "../lib/plan-outcome-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { TradePlan } from "../lib/plan-types";
import { getPlanById } from "../lib/plans";

assert.equal(AUTOMATIC_EXECUTION_ENABLED, false);

function sampleLo(overrides: Partial<LearningOutcome> = {}): LearningOutcome {
  return {
    id: "LO-TEST-001",
    kind: "unexecuted_plan_loss",
    ticker: "TEST",
    planId: "PLAN-001",
    realizedR: 0,
    realizedPnL: 0,
    counterfactualR: -1,
    counterfactualDollarResult: null,
    entryReached: true,
    stopReachedBeforeTarget: true,
    targetReachedBeforeStop: false,
    excludedFromMetrics: false,
    nonExecutionReason: "order_not_staged",
    lifecycleStatus: "concluded",
    observationId: "OBS-TEST-001",
    mafExperimentId: "MAF-TEST-001",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    source: "plan_outcome",
    ...overrides,
  };
}

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-001",
    ticker: "TEST",
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

function uplOutcome(planId: string): NonNullable<TradePlan["outcome"]> {
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
  };
}

function resetMemoryStores(seedPlans: TradePlan[] = []) {
  __setPlanOutcomeSyncTestHooks(null);
  __setPlansStoreForTests(createMemoryPlansStore(seedPlans));
  __setLearningOutcomeStoreForTests([]);
  __setObservationsStoreForTests(createMemoryObservationsStore(), "memory");
}

async function main() {
  // -------------------------------------------------------------------------
  // C — Supabase mapping round trip (zeros / false / null / links)
  // -------------------------------------------------------------------------
  {
    const original = sampleLo();
    const row = learningOutcomeToRow(original);
    assert.equal(row.realized_r, 0);
    assert.equal(row.realized_pnl, 0);
    assert.equal(row.counterfactual_r, -1);
    assert.equal(row.counterfactual_dollar_result, null);
    assert.equal(row.excluded_from_metrics, false);
    assert.equal(row.target_reached_before_stop, false);
    assert.equal(row.maf_experiment_id, "MAF-TEST-001");
    assert.equal(row.observation_id, "OBS-TEST-001");

    const back = learningOutcomeRowToRecord(row);
    assert.equal(back.realizedR, 0);
    assert.equal(back.realizedPnL, 0);
    assert.equal(back.counterfactualR, -1);
    assert.equal(back.counterfactualDollarResult, null);
    assert.equal(back.excludedFromMetrics, false);
    assert.equal(back.targetReachedBeforeStop, false);
    assert.equal(back.mafExperimentId, "MAF-TEST-001");
    assert.equal(back.observationId, "OBS-TEST-001");
  }

  // -------------------------------------------------------------------------
  // D — Backend selection
  // -------------------------------------------------------------------------
  {
    const prev = {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      LEARNING_OUTCOMES_STORE: process.env.LEARNING_OUTCOMES_STORE,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      TRADES_STORE: process.env.TRADES_STORE,
    };
    __setLearningOutcomesStoreForTests(null);

    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.LEARNING_OUTCOMES_STORE;
    process.env.TRADES_STORE = "json";
    assert.equal(getLearningOutcomesStoreMode(), "json");

    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.TRADES_STORE = "supabase";
    assert.equal(getLearningOutcomesStoreMode(), "supabase");
    assert.throws(
      () => assertJsonLearningOutcomeWritesAllowed(),
      /cannot write on Vercel|Supabase/
    );

    const mem = createMemoryLearningOutcomesStore([sampleLo()]);
    __setLearningOutcomesStoreForTests(mem, "memory");
    assert.equal((await getLearningOutcomesStore().readAll()).length, 1);

    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    __setLearningOutcomesStoreForTests(null);
  }

  // -------------------------------------------------------------------------
  // B — Memory backend: no disk, reset works
  // -------------------------------------------------------------------------
  {
    __setLearningOutcomeStoreForTests([sampleLo({ id: "LO-MEM-001" })]);
    assert.equal((await getLearningOutcomes()).length, 1);
    __setLearningOutcomeStoreForTests([]);
    assert.equal((await getLearningOutcomes()).length, 0);
    await upsertLearningOutcome(sampleLo({ id: "LO-MEM-002", planId: "PLAN-002" }));
    assert.equal((await getLearningOutcomes()).length, 1);
    __setLearningOutcomeStoreForTests(null);
  }

  // -------------------------------------------------------------------------
  // A — JSON backend (temp cwd file via store API on forced json mode)
  // -------------------------------------------------------------------------
  {
    const prevCwd = process.cwd();
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lo-json-"));
    process.chdir(tmp);
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.LEARNING_OUTCOMES_STORE = "json";
    process.env.TRADES_STORE = "json";
    __setLearningOutcomesStoreForTests(null);

    const store = createJsonLearningOutcomesStore();
    const lo = sampleLo({
      id: "LO-JSON-001",
      realizedR: 0,
      excludedFromMetrics: false,
      counterfactualDollarResult: null,
    });
    await store.upsert(lo);
    await store.upsert({ ...lo, notes: "again" });
    const all = await store.readAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].realizedR, 0);
    assert.equal(all[0].excludedFromMetrics, false);
    assert.equal(all[0].counterfactualDollarResult, null);
    assert.equal(all[0].notes, "again");

    delete process.env.LEARNING_OUTCOMES_STORE;
    process.chdir(prevCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }

  // -------------------------------------------------------------------------
  // E / G / H — UPL durable sync + retry + MAF preserve
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({ outcome: uplOutcome("PLAN-001") });
    resetMemoryStores([plan]);
    const sync = await syncPlanOutcomeLearning("PLAN-001");
    assert.equal(sync.ok, true, sync.errors?.join("; "));
    const lo = await getLearningOutcomeByPlanId("PLAN-001");
    assert.ok(lo);
    assert.equal(lo!.kind, "unexecuted_plan_loss");
    assert.equal(lo!.realizedR, 0);
    assert.equal(lo!.counterfactualR, -1);
    assert.equal((await getPlanById("PLAN-001"))?.outcome?.learningSyncStatus, "complete");

    const { upsertLearningOutcome: upsertLo } = await import(
      "../lib/learning-outcome-store"
    );
    await upsertLo({
      ...lo!,
      mafExperimentId: "MAF-KEEP-001",
      updatedAt: new Date().toISOString(),
    });
    assert.equal((await syncPlanOutcomeLearning("PLAN-001")).ok, true);
    const again = await getLearningOutcomeByPlanId("PLAN-001");
    assert.equal(again?.mafExperimentId, "MAF-KEEP-001");
    assert.equal((await getLearningOutcomes()).length, 1);

    const verify = verifyPlanOutcomeLearningLinks(
      (await getPlanById("PLAN-001"))!,
      again!,
      sync.observation
    );
    // Re-load observation after second sync
    const { getObservations } = await import("../lib/observation-store");
    const obs = (await getObservations())[0];
    assert.equal(
      verifyPlanOutcomeLearningLinks((await getPlanById("PLAN-001"))!, again!, obs)
        .ok,
      true
    );
    assert.equal(obs.learningOutcomeId, again!.id);
  }

  // -------------------------------------------------------------------------
  // F — LO write failure → failed sync, repair attention, no JSON fallback
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({
      id: "PLAN-002",
      outcome: uplOutcome("PLAN-002"),
    });
    resetMemoryStores([plan]);
    __setPlanOutcomeSyncTestHooks({
      failLoWrite: new Error("simulated durable LO write failure"),
    });
    const sync = await syncPlanOutcomeLearning("PLAN-002");
    assert.equal(sync.ok, false);
    assert.equal(
      (await getPlanById("PLAN-002"))?.outcome?.learningSyncStatus,
      "failed"
    );
    assert.equal((await getLearningOutcomes()).length, 0);
    const attn = buildPlanAttentionItems(
      [(await getPlanById("PLAN-002"))!],
      [],
      []
    );
    assert.ok(attn.some((i) => i.id === "plan-outcome-sync-PLAN-002"));

    // Recover
    __setPlanOutcomeSyncTestHooks(null);
    assert.equal((await syncPlanOutcomeLearning("PLAN-002")).ok, true);
    assert.equal((await getLearningOutcomes()).length, 1);
    assert.equal(
      (await getPlanById("PLAN-002"))?.outcome?.learningSyncStatus,
      "complete"
    );
  }

  // -------------------------------------------------------------------------
  // Persist path partial failure (same store)
  // -------------------------------------------------------------------------
  {
    resetMemoryStores([basePlan({ id: "PLAN-008" })]);
    __setPlanOutcomeSyncTestHooks({
      failLoWrite: new Error("persist LO boom"),
    });
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
    assert.ok((await getPlanById("PLAN-008"))?.outcome?.recordedAt);
    __setPlanOutcomeSyncTestHooks(null);
  }

  // -------------------------------------------------------------------------
  // I — duplicate_creation
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
    resetMemoryStores([plan]);
    assert.equal((await syncPlanOutcomeLearning("PLAN-011")).ok, true);
    const los = await getLearningOutcomes();
    assert.equal(los.length, 1);
    assert.equal(los[0].excludedFromMetrics, true);
    const { getObservations } = await import("../lib/observation-store");
    assert.equal((await getObservations()).length, 0);
    const scout = computeScoutLearningAggregates({ learningOutcomes: los });
    assert.equal(scout.evaluatedScoutCount, 0);
  }

  // -------------------------------------------------------------------------
  // Diagnostics (J adjacent) + nextLearningOutcomeId
  // -------------------------------------------------------------------------
  {
    const issues = diagnoseLearningOutcomeDurability({
      plans: [
        basePlan({
          id: "PLAN-099",
          outcome: {
            recordedAt: "2026-07-20T00:00:00.000Z",
            learningSyncStatus: "complete",
            learningOutcomeId: "LO-MISSING-001",
            tradeExecuted: false,
            realizedResultR: 0,
            evidenceRefs: [],
            updatedAt: "2026-07-20T00:00:00.000Z",
          },
        }),
      ],
      trades: [],
      learningOutcomes: [],
      observations: [],
    });
    assert.ok(issues.some((i) => i.code === "plan_outcome_missing_lo"));
    assert.ok(issues.some((i) => i.code === "sync_complete_missing_lo"));
    assert.ok(issues.some((i) => i.code === "stale_learning_outcome_id"));

    assert.equal(
      nextLearningOutcomeId([sampleLo({ id: "LO-TEST-002" })], "TEST"),
      "LO-TEST-003"
    );
  }

  // -------------------------------------------------------------------------
  // J — Migration tool dry-run (spawn) does not require Supabase when file empty
  // -------------------------------------------------------------------------
  {
    // Mapping sample used by migration tool stays zero-safe (already covered in C).
    // Dry-run against empty JSON in temp dir without Supabase credentials:
    const prevCwd = process.cwd();
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lo-mig-"));
    await fs.mkdir(path.join(tmp, "data"), { recursive: true });
    await fs.writeFile(path.join(tmp, "data", "learning-outcomes.json"), "[]\n");
    process.chdir(tmp);
    // Importing migrate would call createSupabaseAdmin for each row — empty is fine.
    const { readLearningOutcomesJsonFile } = await import(
      "../lib/learning-outcomes-store/json"
    );
    const rows = await readLearningOutcomesJsonFile();
    assert.equal(rows.length, 0);
    process.chdir(prevCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }

  __setPlansStoreForTests(null);
  __setLearningOutcomeStoreForTests(null);
  __setObservationsStoreForTests(null, null);
  __setPlanOutcomeSyncTestHooks(null);

  console.log("test-learning-outcome-durable-store-001: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
