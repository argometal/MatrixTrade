/**
 * CURSOR-MTA-LEARNING-OUTCOME-DURABLE-STORE-001
 * + CURSOR-MTA-LO-DURABLE-STORE-REVIEW-FIX-001 integrity regressions
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
  mergeCanonicalLearningOutcome,
  compareLearningOutcomeFreshness,
  decideMigrationAction,
  matchRemoteCanonical,
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
import {
  diagnoseLearningOutcomeDurability,
  diagnoseMafLinkRegression,
} from "../lib/learning-outcome-diagnostics";
import { AUTOMATIC_EXECUTION_ENABLED } from "../lib/plan-outcome-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { ObservationRecord } from "../lib/observation-types";
import type { TradePlan } from "../lib/plan-types";
import { getPlanById } from "../lib/plans";

function sampleObs(
  overrides: Partial<ObservationRecord> = {}
): ObservationRecord {
  return {
    id: "OBS-TEST-001",
    ticker: "TEST",
    status: "open",
    startedAt: "2026-07-20T00:00:00.000Z",
    endsAt: "2026-07-27T00:00:00.000Z",
    durationDays: 7,
    createdAt: "2026-07-20T00:00:00.000Z",
    lastUpdatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

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
  // REVIEW A — conflict different IDs, same planId (preserve links)
  // -------------------------------------------------------------------------
  {
    const store = createMemoryLearningOutcomesStore([
      sampleLo({
        id: "LO-TSLA-009",
        ticker: "TSLA",
        planId: "PLAN-001",
        observationId: "OBS-PLAN-001",
        mafExperimentId: "MAF-001",
        updatedAt: "2026-07-25T15:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
    ]);
    const canonical = await store.upsert(
      sampleLo({
        id: "LO-TSLA-004",
        ticker: "TSLA",
        planId: "PLAN-001",
        observationId: undefined,
        mafExperimentId: undefined,
        updatedAt: "2026-07-25T16:00:00.000Z",
      })
    );
    assert.equal(canonical.id, "LO-TSLA-009");
    assert.equal(canonical.observationId, "OBS-PLAN-001");
    assert.equal(canonical.mafExperimentId, "MAF-001");
    assert.equal(canonical.createdAt, "2026-07-01T00:00:00.000Z");
    assert.equal(store.rows.length, 1);

    const merged = mergeCanonicalLearningOutcome(
      sampleLo({
        id: "LO-TSLA-009",
        planId: "PLAN-001",
        observationId: "OBS-PLAN-001",
        mafExperimentId: "MAF-001",
        updatedAt: "2026-07-25T15:00:00.000Z",
      }),
      sampleLo({
        id: "LO-TSLA-004",
        planId: "PLAN-001",
        observationId: undefined,
        mafExperimentId: undefined,
        updatedAt: "2026-07-25T16:00:00.000Z",
      })
    );
    assert.equal(merged.id, "LO-TSLA-009");
    assert.equal(merged.observationId, "OBS-PLAN-001");
    assert.equal(merged.mafExperimentId, "MAF-001");
  }

  // -------------------------------------------------------------------------
  // REVIEW B — older incoming row does not overwrite
  // -------------------------------------------------------------------------
  {
    const existing = sampleLo({
      id: "LO-TSLA-009",
      planId: "PLAN-001",
      observationId: "OBS-PLAN-001",
      mafExperimentId: "MAF-001",
      notes: "keep-me",
      updatedAt: "2026-07-25T16:00:00.000Z",
    });
    const store = createMemoryLearningOutcomesStore([existing]);
    const incoming = sampleLo({
      id: "LO-TSLA-004",
      planId: "PLAN-001",
      observationId: undefined,
      mafExperimentId: undefined,
      notes: "stale",
      updatedAt: "2026-07-25T15:00:00.000Z",
    });
    assert.equal(
      compareLearningOutcomeFreshness(existing, incoming),
      "existing_newer"
    );
    const returned = await store.upsert(incoming);
    assert.equal(returned.id, "LO-TSLA-009");
    assert.equal(returned.notes, "keep-me");
    assert.equal(returned.observationId, "OBS-PLAN-001");
    assert.equal(returned.mafExperimentId, "MAF-001");
    assert.equal(returned.updatedAt, "2026-07-25T16:00:00.000Z");
    assert.equal(store.rows.length, 1);

    const decision = decideMigrationAction({
      local: incoming,
      remote: existing,
      matchType: "plan_id",
    });
    assert.equal(decision.action, "skip_remote_newer");
    assert.equal(decision.skipped, true);
    assert.equal(decision.conflicts, true);
    assert.equal(decision.inserted, false);
  }

  // -------------------------------------------------------------------------
  // REVIEW C — same tradeId, different LO ids → one canonical Trade LO
  // -------------------------------------------------------------------------
  {
    const remote = sampleLo({
      id: "LO-TRADE-009",
      planId: "PLAN-T",
      tradeId: "TRD-001",
      kind: "executed_win",
      observationId: "OBS-T-001",
      mafExperimentId: "MAF-T-001",
      updatedAt: "2026-07-25T12:00:00.000Z",
    });
    const local = sampleLo({
      id: "LO-TRADE-004",
      planId: "PLAN-T",
      tradeId: "TRD-001",
      kind: "executed_win",
      observationId: undefined,
      mafExperimentId: undefined,
      realizedR: 1.5,
      updatedAt: "2026-07-25T13:00:00.000Z",
    });
    const match = matchRemoteCanonical(local, [remote]);
    assert.equal(match.matchType, "trade_id");
    const decision = decideMigrationAction({
      local,
      remote,
      matchType: match.matchType,
    });
    assert.equal(decision.action, "update_canonical_remote");
    assert.equal(decision.identityConflict, true);
    assert.equal(decision.inserted, false);
    assert.equal(decision.merged?.id, "LO-TRADE-009");

    const store = createMemoryLearningOutcomesStore([remote]);
    const canonical = await store.upsert(local);
    assert.equal(canonical.id, "LO-TRADE-009");
    assert.equal(canonical.tradeId, "TRD-001");
    assert.equal(canonical.observationId, "OBS-T-001");
    assert.equal(canonical.mafExperimentId, "MAF-T-001");
    assert.equal(canonical.realizedR, 1.5);
    assert.equal(store.rows.length, 1);
  }

  // -------------------------------------------------------------------------
  // REVIEW D — zero and false preservation
  // -------------------------------------------------------------------------
  {
    const existing = sampleLo({
      realizedR: 2,
      realizedPnL: 100,
      excludedFromMetrics: true,
      entryReached: true,
      updatedAt: "2026-07-25T10:00:00.000Z",
    });
    const incoming = sampleLo({
      realizedR: 0,
      realizedPnL: 0,
      excludedFromMetrics: false,
      entryReached: false,
      updatedAt: "2026-07-25T11:00:00.000Z",
    });
    const merged = mergeCanonicalLearningOutcome(existing, incoming);
    assert.equal(merged.realizedR, 0);
    assert.equal(merged.realizedPnL, 0);
    assert.equal(merged.excludedFromMetrics, false);
    assert.equal(merged.entryReached, false);

    const store = createMemoryLearningOutcomesStore([existing]);
    const saved = await store.upsert(incoming);
    assert.equal(saved.realizedR, 0);
    assert.equal(saved.realizedPnL, 0);
    assert.equal(saved.excludedFromMetrics, false);
    assert.equal(saved.entryReached, false);
  }

  // -------------------------------------------------------------------------
  // REVIEW E — intentional null clear policy
  // -------------------------------------------------------------------------
  {
    const existing = sampleLo({
      notes: "keep",
      counterfactualDollarResult: 42,
      nonExecutionReason: "order_not_staged",
      observationId: "OBS-KEEP",
      mafExperimentId: "MAF-KEEP",
      planId: "PLAN-KEEP",
      tradeId: undefined,
      stockThesisId: "ST-KEEP",
      playbookId: "PB-KEEP",
      lifecycleStatus: "concluded",
      source: "plan_outcome",
      updatedAt: "2026-07-25T10:00:00.000Z",
    });
    const incoming = {
      ...sampleLo({
        updatedAt: "2026-07-25T12:00:00.000Z",
      }),
      notes: null,
      counterfactualDollarResult: null,
      // Non-clearable nulls must not wipe protected fields
      nonExecutionReason: null,
      observationId: null,
      mafExperimentId: null,
      planId: null,
      stockThesisId: null,
      playbookId: null,
      lifecycleStatus: null,
      source: null,
    } as unknown as LearningOutcome;

    const merged = mergeCanonicalLearningOutcome(existing, incoming);
    assert.equal(merged.notes, undefined); // notes null → clear
    assert.equal(merged.counterfactualDollarResult, null); // clearable
    assert.equal(merged.nonExecutionReason, "order_not_staged");
    assert.equal(merged.observationId, "OBS-KEEP");
    assert.equal(merged.mafExperimentId, "MAF-KEEP");
    assert.equal(merged.planId, "PLAN-KEEP");
    assert.equal(merged.stockThesisId, "ST-KEEP");
    assert.equal(merged.playbookId, "PB-KEEP");
    assert.equal(merged.lifecycleStatus, "concluded");
    assert.equal(merged.source, "plan_outcome");
  }

  // -------------------------------------------------------------------------
  // REVIEW F — migration identity conflict counters
  // -------------------------------------------------------------------------
  {
    const local = sampleLo({
      id: "LO-TSLA-004",
      ticker: "TSLA",
      planId: "PLAN-001",
      observationId: undefined,
      mafExperimentId: undefined,
      updatedAt: "2026-07-25T16:00:00.000Z",
    });
    const remote = sampleLo({
      id: "LO-TSLA-009",
      ticker: "TSLA",
      planId: "PLAN-001",
      observationId: "OBS-PLAN-001",
      mafExperimentId: "MAF-001",
      updatedAt: "2026-07-25T15:00:00.000Z",
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    const match = matchRemoteCanonical(local, [remote]);
    assert.equal(match.matchType, "plan_id");
    assert.equal(match.row?.id, "LO-TSLA-009");

    // Dry-run semantics: local newer → intended update, not insert
    const newer = decideMigrationAction({
      local,
      remote,
      matchType: match.matchType,
    });
    assert.equal(newer.action, "update_canonical_remote");
    assert.equal(newer.inserted, false);
    assert.equal(newer.updated, true);
    assert.equal(newer.conflicts, true);
    assert.equal(newer.merged?.id, "LO-TSLA-009");
    assert.equal(newer.merged?.observationId, "OBS-PLAN-001");
    assert.equal(newer.merged?.mafExperimentId, "MAF-001");

    // Remote newer → skip / conflict / no insert
    const olderLocal = {
      ...local,
      updatedAt: "2026-07-25T14:00:00.000Z",
    };
    const skip = decideMigrationAction({
      local: olderLocal,
      remote,
      matchType: "plan_id",
    });
    assert.equal(skip.action, "skip_remote_newer");
    assert.equal(skip.skipped, true);
    assert.equal(skip.conflicts, true);
    assert.equal(skip.inserted, false);
    assert.equal(skip.updated, false);

    // Simulate dry-run counters for identity conflict (local newer)
    let inserted = 0;
    let updated = 0;
    let conflicts = 0;
    let skipped = 0;
    if (newer.conflicts) conflicts += 1;
    if (newer.skipped) skipped += 1;
    else if (newer.updated) updated += 1;
    else if (newer.inserted) inserted += 1;
    assert.equal(inserted, 0);
    assert.equal(conflicts, 1);
    assert.equal(updated, 1);

    // Apply path: memory store updates canonical id only
    const store = createMemoryLearningOutcomesStore([remote]);
    const applied = await store.upsert(newer.merged!);
    assert.equal(applied.id, "LO-TSLA-009");
    assert.equal(store.rows.length, 1);
  }

  // -------------------------------------------------------------------------
  // REVIEW G — memory backend outside tests throws; test override still works
  // -------------------------------------------------------------------------
  {
    const prev = {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV,
      LEARNING_OUTCOMES_STORE: process.env.LEARNING_OUTCOMES_STORE,
      TRADES_STORE: process.env.TRADES_STORE,
    };
    __setLearningOutcomesStoreForTests(null);

    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.LEARNING_OUTCOMES_STORE = "memory";
    process.env.NODE_ENV = "development";
    assert.throws(
      () => getLearningOutcomesStoreMode(),
      /allowed only in tests/
    );

    process.env.NODE_ENV = "production";
    assert.throws(
      () => getLearningOutcomesStoreMode(),
      /forbidden in production|allowed only in tests/
    );

    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    assert.throws(
      () => getLearningOutcomesStoreMode(),
      /forbidden on Vercel/
    );

    // Explicit test override works independently of env selection.
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
  // REVIEW H — repeated Plan Outcome sync preserves LO / OBS / MAF + one metric
  // -------------------------------------------------------------------------
  {
    const plan = basePlan({ outcome: uplOutcome("PLAN-001") });
    resetMemoryStores([plan]);
    const first = await syncPlanOutcomeLearning("PLAN-001");
    assert.equal(first.ok, true, first.errors?.join("; "));
    const lo1 = await getLearningOutcomeByPlanId("PLAN-001");
    assert.ok(lo1);
    await upsertLearningOutcome({
      ...lo1!,
      mafExperimentId: "MAF-KEEP-001",
      updatedAt: new Date().toISOString(),
    });
    const second = await syncPlanOutcomeLearning("PLAN-001");
    assert.equal(second.ok, true);
    const lo2 = await getLearningOutcomeByPlanId("PLAN-001");
    assert.equal(lo2?.id, lo1!.id);
    assert.equal(lo2?.mafExperimentId, "MAF-KEEP-001");
    assert.equal(lo2?.observationId, lo1!.observationId);
    assert.equal((await getLearningOutcomes()).length, 1);
    const scout = computeScoutLearningAggregates({
      learningOutcomes: await getLearningOutcomes(),
    });
    assert.equal(scout.evaluatedScoutCount, 1);
    assert.equal(lo2?.mafExperimentId, "MAF-KEEP-001");
    assert.equal(
      diagnoseMafLinkRegression(lo2!, lo2!),
      null,
      "repeated sync must not lose MAF link"
    );
    assert.ok(
      diagnoseMafLinkRegression(lo2!, {
        ...lo2!,
        mafExperimentId: undefined,
      }),
      "diagnostics detect MAF link loss"
    );
  }

  // -------------------------------------------------------------------------
  // D — Backend selection (json / supabase / override)
  // -------------------------------------------------------------------------
  {
    const prev = {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      LEARNING_OUTCOMES_STORE: process.env.LEARNING_OUTCOMES_STORE,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      TRADES_STORE: process.env.TRADES_STORE,
      NODE_ENV: process.env.NODE_ENV,
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
    const saved = await upsertLearningOutcome(
      sampleLo({ id: "LO-MEM-002", planId: "PLAN-002" })
    );
    assert.equal(saved.id, "LO-MEM-002");
    assert.equal((await getLearningOutcomes()).length, 1);
    __setLearningOutcomeStoreForTests(null);
  }

  // -------------------------------------------------------------------------
  // A — JSON backend
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
    await store.upsert({
      ...lo,
      notes: "again",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });
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
    assert.equal(
      (await getPlanById("PLAN-001"))?.outcome?.learningSyncStatus,
      "complete"
    );

    await upsertLearningOutcome({
      ...lo!,
      mafExperimentId: "MAF-KEEP-001",
      updatedAt: new Date().toISOString(),
    });
    assert.equal((await syncPlanOutcomeLearning("PLAN-001")).ok, true);
    const again = await getLearningOutcomeByPlanId("PLAN-001");
    assert.equal(again?.mafExperimentId, "MAF-KEEP-001");
    assert.equal((await getLearningOutcomes()).length, 1);

    const { getObservations } = await import("../lib/observation-store");
    const obs = (await getObservations())[0];
    assert.equal(
      verifyPlanOutcomeLearningLinks(
        (await getPlanById("PLAN-001"))!,
        again!,
        obs
      ).ok,
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

    __setPlanOutcomeSyncTestHooks(null);
    assert.equal((await syncPlanOutcomeLearning("PLAN-002")).ok, true);
    assert.equal((await getLearningOutcomes()).length, 1);
    assert.equal(
      (await getPlanById("PLAN-002"))?.outcome?.learningSyncStatus,
      "complete"
    );
  }

  // -------------------------------------------------------------------------
  // Persist path partial failure
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
  // Diagnostics
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

    const multi = diagnoseLearningOutcomeDurability({
      plans: [
        basePlan({
          id: "PLAN-001",
          outcome: {
            recordedAt: "2026-07-20T00:00:00.000Z",
            learningOutcomeId: "LO-A",
            tradeExecuted: false,
            realizedResultR: 0,
            evidenceRefs: [],
            updatedAt: "2026-07-20T00:00:00.000Z",
          },
        }),
      ],
      trades: [],
      learningOutcomes: [
        sampleLo({ id: "LO-A", planId: "PLAN-001" }),
        sampleLo({ id: "LO-B", planId: "PLAN-001" }),
        sampleLo({
          id: "LO-T1",
          planId: "PLAN-X",
          tradeId: "TRD-1",
          kind: "executed_win",
        }),
        sampleLo({
          id: "LO-T2",
          planId: "PLAN-X",
          tradeId: "TRD-1",
          kind: "executed_win",
        }),
        sampleLo({
          id: "LO-OBS",
          planId: "PLAN-OBS",
          observationId: "OBS-MISSING",
        }),
      ],
      observations: [
        sampleObs({
          id: "OBS-LINK",
          planId: "PLAN-OBS",
          learningOutcomeId: "LO-OBS",
        }),
      ],
      localLearningOutcomes: [
        sampleLo({
          id: "LO-STALE",
          planId: "PLAN-001",
          updatedAt: "2026-07-20T00:00:00.000Z",
        }),
      ],
    });
    // Fix plan_outcome_lo_id_mismatch: plan points LO-A but canonical first may be LO-A
    // Duplicate plan/trade + stale obs + local identity conflict
    assert.ok(multi.some((i) => i.code === "duplicate_lo_plan"));
    assert.ok(multi.some((i) => i.code === "duplicate_lo_trade"));
    assert.ok(multi.some((i) => i.code === "lo_stale_observation_id"));
    assert.ok(multi.some((i) => i.code === "local_remote_identity_conflict"));

    // Bidirectional OBS mismatch
    const bi = diagnoseLearningOutcomeDurability({
      plans: [],
      trades: [],
      learningOutcomes: [
        sampleLo({
          id: "LO-BI",
          planId: "PLAN-BI",
          observationId: "OBS-OTHER",
        }),
      ],
      observations: [
        sampleObs({
          id: "OBS-BI",
          planId: "PLAN-BI",
          learningOutcomeId: "LO-BI",
        }),
      ],
    });
    assert.ok(bi.some((i) => i.code === "obs_lo_bidirectional_mismatch"));

    // plan outcome id differs from canonical
    const mismatch = diagnoseLearningOutcomeDurability({
      plans: [
        basePlan({
          id: "PLAN-001",
          outcome: {
            recordedAt: "2026-07-20T00:00:00.000Z",
            learningOutcomeId: "LO-WRONG",
            tradeExecuted: false,
            realizedResultR: 0,
            evidenceRefs: [],
            updatedAt: "2026-07-20T00:00:00.000Z",
          },
        }),
      ],
      trades: [],
      learningOutcomes: [sampleLo({ id: "LO-CANON", planId: "PLAN-001" })],
      observations: [],
    });
    assert.ok(mismatch.some((i) => i.code === "plan_outcome_lo_id_mismatch"));
    assert.ok(mismatch.some((i) => i.code === "stale_learning_outcome_id"));

    assert.equal(
      nextLearningOutcomeId([sampleLo({ id: "LO-TEST-002" })], "TEST"),
      "LO-TEST-003"
    );
  }

  // -------------------------------------------------------------------------
  // J — empty JSON migration source
  // -------------------------------------------------------------------------
  {
    const prevCwd = process.cwd();
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lo-mig-"));
    await fs.mkdir(path.join(tmp, "data"), { recursive: true });
    await fs.writeFile(path.join(tmp, "data", "learning-outcomes.json"), "[]\n");
    process.chdir(tmp);
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
