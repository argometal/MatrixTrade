/**
 * Prompt #8 — Thesis T0 freeze + evaluation horizon.
 * Run: npx tsx tools/test-thesis-t0-horizon.ts
 */
import assert from "node:assert/strict";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import {
  buildThesisT0Freeze,
  classifyLegacyT0Confidence,
  closeThesisEpisode,
  computeBeliefFingerprint,
  ensureThesisT0OnScoutDecision,
  expireOpenEpisodesDue,
  isEvidenceKnowableAtT0,
} from "../lib/thesis-t0";
import { DEFAULT_THESIS_HORIZON_DAYS } from "../lib/thesis-t0-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";

function baseThesis(overrides: Partial<StockThesis> = {}): StockThesis {
  return {
    id: "ST-TEST-001",
    ticker: "TEST",
    status: "watching",
    version: 1,
    style: "swing",
    thesis: "Bullish continuation above zone",
    historicalAnalysis: [],
    levels: { majorSupport: 100, majorResistance: 120, primaryZone: { low: 102, high: 108 } },
    riskRules: { minimumRR: 2, invalidation: "Daily close below 98" },
    currentHypothesis: "Buyers defending primary zone",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-001",
    ticker: "TEST",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 105,
    stopPrice: 98,
    targetPrice: 120,
    plannedRR: 2.1,
    stockThesisId: "ST-TEST-001",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function decide(plan: TradePlan, verdict: "wait" | "go" | "no" = "wait") {
  return appendDecision(plan, {
    verdict,
    decisionConfidence: 70,
    challenges: ["Need location confirmation"],
    reasoning: "Zone not yet defended",
    decidedBy: "human",
  });
}

async function run() {
  setThesisT0StoreForTests(createMemoryThesisT0Store());

  // A — T0 creation on first committed decision
  {
    const thesis = baseThesis();
    const decided = decide(basePlan());
    assert.ok(!decided.errors?.length, decided.errors?.join("; "));
    const { freeze, created } = await ensureThesisT0OnScoutDecision({
      plan: decided.plan,
      thesis,
    });
    assert.equal(created, true);
    assert.ok(freeze);
    assert.equal(freeze!.decision?.decisionId, decided.plan.decision!.id);
    assert.equal(freeze!.t0, decided.plan.decision!.decidedAt);
    assert.equal(freeze!.stock.thesis, thesis.thesis);
    assert.equal(freeze!.plan.plannedEntry, 105);
    assert.equal(freeze!.status, "open");
    console.log("A T0 creation: ok");
  }

  // B — Stock File mutation does not rewrite freeze
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const thesis = baseThesis();
    const decided = decide(basePlan());
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: decided.plan,
      thesis,
    });
    const mutated = baseThesis({
      version: 9,
      thesis: "MUTATED LATER",
      currentHypothesis: "Hindsight hypothesis",
      levels: { majorSupport: 1 },
    });
    const again = await ensureThesisT0OnScoutDecision({
      plan: decide(decided.plan, "go").plan,
      thesis: mutated,
    });
    assert.equal(again.created, false);
    assert.equal(again.freeze!.id, freeze!.id);
    assert.equal(again.freeze!.stock.thesis, "Bullish continuation above zone");
    assert.equal(again.freeze!.stock.stockThesisVersion, 1);
    assert.notEqual(again.freeze!.stock.thesis, mutated.thesis);
    console.log("B immutability vs Stock File: ok");
  }

  // C — Later Scout decision keeps original T0
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const thesis = baseThesis();
    const first = decide(basePlan());
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: first.plan,
      thesis,
    });
    const t0 = freeze!.t0;
    const second = decide(first.plan, "go");
    const after = await ensureThesisT0OnScoutDecision({
      plan: second.plan,
      thesis,
    });
    assert.equal(after.freeze!.t0, t0);
    assert.equal(after.freeze!.decision?.decisionId, freeze!.decision?.decisionId);
    console.log("C later decision: ok");
  }

  // D — PLAN-002 links without rewriting T0 geometry of PLAN-001
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const thesis = baseThesis();
    const p1 = decide(basePlan({ id: "PLAN-001", plannedEntry: 105 }));
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: p1.plan,
      thesis,
    });
    const p2 = decide(
      basePlan({
        id: "PLAN-002",
        plannedEntry: 110,
        stopPrice: 100,
        replacesPlanId: "PLAN-001",
      }),
      "go"
    );
    const after = await ensureThesisT0OnScoutDecision({
      plan: p2.plan,
      thesis,
    });
    assert.equal(after.created, false);
    assert.equal(after.freeze!.plan.planId, "PLAN-001");
    assert.equal(after.freeze!.plan.plannedEntry, 105);
    assert.ok(after.freeze!.planIds.includes("PLAN-002"));
    assert.equal(after.freeze!.t0, freeze!.t0);
    console.log("D plan replacement: ok");
  }

  // E — late evidence not knowable at T0
  {
    const t0 = "2026-06-01T12:00:00.000Z";
    assert.equal(isEvidenceKnowableAtT0("2026-05-01T00:00:00.000Z", t0), true);
    assert.equal(isEvidenceKnowableAtT0("2026-06-01T12:00:00.000Z", t0), true);
    assert.equal(isEvidenceKnowableAtT0("2026-07-01T00:00:00.000Z", t0), false);
    console.log("E late evidence gate: ok");
  }

  // F — WAIT / no trade remains open/evaluable (no Trade required)
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const decided = decide(basePlan(), "wait");
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: decided.plan,
      thesis: baseThesis(),
    });
    assert.equal(freeze!.decision?.verdict, "wait");
    assert.equal(freeze!.status, "open");
    assert.ok(freeze!.evaluationHorizonEndsAt > freeze!.t0);
    console.log("F no-trade wait: ok");
  }

  // G — default horizon + override
  {
    const d = decide(basePlan());
    const defaultFreeze = buildThesisT0Freeze({
      plan: d.plan,
      decision: d.plan.decision!,
      thesis: baseThesis(),
    });
    assert.equal(defaultFreeze.evaluationHorizonDays, DEFAULT_THESIS_HORIZON_DAYS);
    assert.equal(defaultFreeze.evaluationHorizonOverride, false);

    const over = buildThesisT0Freeze({
      plan: d.plan,
      decision: d.plan.decision!,
      thesis: baseThesis(),
      evaluationHorizonDays: 30,
    });
    assert.equal(over.evaluationHorizonDays, 30);
    assert.equal(over.evaluationHorizonOverride, true);
    console.log("G horizon default/override: ok");
  }

  // H — expiry without resolution → expired_inconclusive
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const d = decide(basePlan());
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: d.plan,
      thesis: baseThesis(),
      evaluationHorizonDays: 1,
    });
    assert.ok(freeze);
    // Force past horizon
    const store = createMemoryThesisT0Store([
      {
        ...freeze!,
        evaluationHorizonEndsAt: "2020-01-02T00:00:00.000Z",
      },
    ]);
    setThesisT0StoreForTests(store);
    const expired = await expireOpenEpisodesDue({
      nowIso: "2020-01-03T00:00:00.000Z",
    });
    assert.equal(expired.length, 1);
    assert.equal(expired[0].status, "expired_inconclusive");
    assert.equal(expired[0].t1, "2020-01-02T00:00:00.000Z");
    console.log("H horizon expiry: ok");
  }

  // I — legacy confidence classes
  {
    assert.equal(
      classifyLegacyT0Confidence({
        hasCommittedDecision: true,
        hasContemporaneousStockSnapshot: true,
        hasPlanCreatedOrValidFrom: true,
      }),
      "verified"
    );
    assert.equal(
      classifyLegacyT0Confidence({
        hasCommittedDecision: true,
        hasContemporaneousStockSnapshot: false,
        hasPlanCreatedOrValidFrom: true,
      }),
      "partial"
    );
    assert.equal(
      classifyLegacyT0Confidence({
        hasCommittedDecision: false,
        hasContemporaneousStockSnapshot: false,
        hasPlanCreatedOrValidFrom: false,
      }),
      "unavailable"
    );
    const legacy = buildThesisT0Freeze({
      plan: basePlan({ decision: undefined }),
      decision: null,
      thesis: null,
    });
    assert.ok(
      legacy.confidence === "partial" || legacy.confidence === "unavailable"
    );
    console.log("I legacy confidence: ok");
  }

  // J — regression smoke: appendDecision + fingerprint still work; close API
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const plan = basePlan();
    const r = appendDecision(plan, {
      verdict: "no",
      decisionConfidence: 80,
      challenges: ["Structure broken"],
    });
    assert.ok(r.plan.decision);
    assert.equal(r.plan.decision!.verdict, "no");
    const fp = computeBeliefFingerprint({
      thesis: "a",
      currentHypothesis: "b",
      levels: {},
      riskRules: { minimumRR: 2, invalidation: "x" },
    });
    assert.equal(fp.length, 16);
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: r.plan,
      thesis: baseThesis(),
    });
    const closed = await closeThesisEpisode(freeze!.id, "closed_invalidated");
    assert.equal(closed!.status, "closed_invalidated");
    assert.ok(closed!.t1);
    console.log("J regression smoke: ok");
  }

  setThesisT0StoreForTests(null);
  console.log("test-thesis-t0-horizon: ok");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
