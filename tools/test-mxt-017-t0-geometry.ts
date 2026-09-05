/**
 * MXT 017 — frozen geometry preferred over live Thesis/Plan.
 * Run: npx tsx tools/test-mxt-017-t0-geometry.ts
 */
import assert from "node:assert/strict";
import {
  geometryForCaseEvaluation,
  geometryFromThesisT0Freeze,
} from "../lib/market-reality";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import { isMxtReadOnlyMode } from "../lib/mxt-readonly";
import {
  ensureThesisT0OnScoutDecision,
  buildThesisT0Freeze,
} from "../lib/thesis-t0";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";
import { appendDecision } from "../lib/scout-decision";

function freezeStub(): ThesisT0Freeze {
  return {
    id: "T0-TEST-1",
    stockThesisId: "ST-1",
    t0: "2026-01-01T00:00:00.000Z",
    evaluationHorizonEndsAt: "2026-04-01T00:00:00.000Z",
    evaluationHorizonDays: 90,
    evaluationHorizonOverride: false,
    beliefFingerprint: null,
    planIds: ["PLAN-1"],
    stock: {
      stockThesisId: "ST-1",
      stockThesisVersion: 1,
      thesis: "frozen thesis",
      currentHypothesis: "hyp",
      levels: { primaryZone: { low: 100, high: 105 } },
      riskRules: { minimumRR: 2, invalidation: "Close below 98" },
    },
    decision: {
      decisionId: "D1",
      decidedAt: "2026-01-01T00:00:00.000Z",
      verdict: "wait",
      reasoning: "wait zone",
      challenges: ["Zone not ready"],
      decidedBy: "human",
    },
    plan: {
      planId: "PLAN-1",
      plannedEntry: 102,
      stopPrice: 98,
      targetPrice: 110,
      plannedRR: 2,
      layeredEntry: null,
      executionInstruction: null,
      validFrom: null,
      maximumEntryProxy: null,
      playbookId: "PB-FROZEN",
    },
    confidence: "verified",
    status: "open",
    t1: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function run() {
  const freeze = freezeStub();
  const gFreeze = geometryFromThesisT0Freeze(freeze);
  assert.equal(gFreeze.supportLow, 100);
  assert.equal(gFreeze.supportHigh, 105);
  assert.equal(gFreeze.stop, 98);
  assert.equal(gFreeze.target, 110);

  const livePlan: TradePlan = {
    id: "PLAN-1",
    ticker: "TEST",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 200,
    stopPrice: 190,
    targetPrice: 250,
    plannedRR: 5,
    stockThesisId: "ST-1",
    playbookId: "PB-LIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
  const liveThesis: StockThesis = {
    id: "ST-1",
    ticker: "TEST",
    status: "watching",
    version: 9,
    style: "swing",
    thesis: "mutated later",
    historicalAnalysis: [],
    levels: { primaryZone: { low: 500, high: 600 } },
    riskRules: { minimumRR: 3, invalidation: "changed" },
    currentHypothesis: "new hyp",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };

  const preferred = geometryForCaseEvaluation({
    freeze,
    plan: livePlan,
    thesis: liveThesis,
  });
  assert.equal(preferred.supportLow, 100, "must use freeze zone, not live 500");
  assert.equal(preferred.stop, 98, "must use freeze stop, not live 190");
  assert.equal(preferred.target, 110, "must use freeze target, not live 250");

  const fallback = geometryForCaseEvaluation({
    freeze: null,
    plan: livePlan,
    thesis: liveThesis,
  });
  assert.equal(fallback.supportLow, 500);
  assert.equal(fallback.stop, 190);

  // Readonly ensure must not throw and must report skipped_readonly
  const prevRo = process.env.MXT_READ_ONLY;
  const prevStore = process.env.TRADES_STORE;
  process.env.MXT_READ_ONLY = "1";
  assert.equal(isMxtReadOnlyMode(), true);
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const decided = appendDecision(livePlan, {
    verdict: "wait",
    decisionConfidence: 60,
    challenges: ["Test"],
    reasoning: "readonly skip",
    decidedBy: "human",
  });
  assert.ok(decided.plan);
  const skipped = await ensureThesisT0OnScoutDecision({ plan: decided.plan! });
  assert.equal(skipped.status, "skipped_readonly");
  assert.equal(skipped.created, false);
  if (prevRo === undefined) delete process.env.MXT_READ_ONLY;
  else process.env.MXT_READ_ONLY = prevRo;
  if (prevStore === undefined) delete process.env.TRADES_STORE;
  else process.env.TRADES_STORE = prevStore;

  // Writable memory path creates freeze with playbookId
  delete process.env.MXT_READ_ONLY;
  delete process.env.TRADES_STORE;
  assert.equal(isMxtReadOnlyMode(), false);
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const created = await ensureThesisT0OnScoutDecision({
    plan: decided.plan!,
    thesis: liveThesis,
  });
  assert.equal(created.status, "created");
  assert.ok(created.freeze);
  assert.equal(created.freeze!.plan.playbookId, "PB-LIVE");
  assert.equal(created.freeze!.stock.levels?.primaryZone?.low, 500);

  // Immutability: second call does not rewrite body when open
  const again = await ensureThesisT0OnScoutDecision({
    plan: {
      ...decided.plan!,
      plannedEntry: 999,
      playbookId: "PB-CHANGED",
    },
    thesis: {
      ...liveThesis,
      levels: { primaryZone: { low: 1, high: 2 } },
    },
  });
  assert.equal(again.status, "already_open");
  assert.equal(again.freeze!.plan.plannedEntry, created.freeze!.plan.plannedEntry);
  assert.equal(again.freeze!.plan.playbookId, "PB-LIVE");

  // buildThesisT0Freeze includes playbook
  const built = buildThesisT0Freeze({
    plan: decided.plan!,
    decision: decided.plan!.decision!,
    thesis: liveThesis,
  });
  assert.equal(built.plan.playbookId, "PB-LIVE");

  console.log("PASS tools/test-mxt-017-t0-geometry.ts");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
