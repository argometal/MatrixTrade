/**
 * Prompt #10 — Edge Decomposition Engine tests.
 * Fixtures only — does not write to real MXT persistence.
 * Run: npx tsx tools/test-edge-decomposition.ts
 */
import assert from "node:assert/strict";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";
import type { ObservationRecord } from "../lib/observation-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import {
  ensureThesisT0OnScoutDecision,
  buildThesisT0Freeze,
} from "../lib/thesis-t0";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";
import { buildCase, type BuildCaseDeps } from "../lib/thesis-case";
import { decomposeEdge, decomposeEdgeForPlan } from "../lib/edge-decomposition";
import { readFileSync } from "node:fs";
import path from "node:path";

function baseThesis(overrides: Partial<StockThesis> = {}): StockThesis {
  return {
    id: "ST-TEST-001",
    ticker: "TEST",
    status: "watching",
    version: 1,
    style: "swing",
    thesis: "Bullish continuation above zone",
    historicalAnalysis: [],
    levels: {
      majorSupport: 100,
      majorResistance: 120,
      primaryZone: { low: 102, high: 108 },
    },
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

function makeDeps(input: {
  plans: TradePlan[];
  freezes: ThesisT0Freeze[];
  trades?: Trade[];
  observations?: ObservationRecord[];
}): BuildCaseDeps {
  return {
    skipExpire: true,
    getPlanById: async (id) =>
      input.plans.find((p) => p.id.toUpperCase() === id.toUpperCase()),
    getPlans: async () => input.plans,
    listFreezes: async () => input.freezes,
    getTrades: async () => input.trades ?? [],
    getTradeById: async (id) =>
      (input.trades ?? []).find((t) => t.id.toUpperCase() === id.toUpperCase()),
    getObservations: async () => input.observations ?? [],
    getLearningOutcomeByPlanId: async () => undefined,
    getMafExperimentByPlanId: async () => undefined,
  };
}

async function seedVerified(plan: TradePlan, thesis: StockThesis) {
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const decided = decide(plan);
  assert.ok(!decided.errors?.length);
  const { freeze, created } = await ensureThesisT0OnScoutDecision({
    plan: decided.plan,
    thesis,
  });
  assert.equal(created, true);
  assert.ok(freeze);
  return { plan: decided.plan, freeze: freeze! };
}

function assertNoGoodBad(obj: unknown) {
  const raw = JSON.stringify(obj);
  assert.ok(!/"label"\s*:\s*"(GOOD|BAD)"/i.test(raw));
  assert.ok(!/\bGOOD\b/.test(raw) || !/qualityScore|autoLabel/.test(raw));
  // Engine must not emit automatic quality labels
  assert.ok(!/"assessment"\s*:\s*"(good|bad)"/i.test(raw));
  assert.ok(!/"score"\s*:/.test(raw));
}

async function run() {
  // A — Valid Case decomposes deterministically
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerified(basePlan(), thesis);
    const deps = makeDeps({ plans: [plan], freezes: [freeze] });
    const d1 = await decomposeEdgeForPlan(plan.id, deps);
    const d2 = await decomposeEdgeForPlan(plan.id, deps);
    assert.ok(d1 && d2);
    assert.equal(JSON.stringify(d1), JSON.stringify(d2));
    assert.equal(d1!.thesis.evidenceAvailable, "available");
    assert.equal(d1!.thesis.variables.thesisText, thesis.thesis);
    assert.equal(d1!.controllable.plan.plannedEntry, 105);
    assert.equal(d1!.analyticalOrdering.controlFirst, true);
    console.log("A valid deterministic: ok");
  }

  // B — No-trade Case remains analytically valid
  {
    const { plan, freeze } = await seedVerified(basePlan(), baseThesis());
    const c = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    const d = decomposeEdge(c!);
    assert.equal(d.controllable.execution.kind, "no_trade");
    assert.ok(d.controllable.execution.disposition);
    assert.equal(d.outcome.variables.executionKind, "no_trade");
    console.log("B no-trade: ok");
  }

  // C — Missing reality → UNKNOWN / unavailable, not inference
  {
    const { plan, freeze } = await seedVerified(basePlan(), baseThesis());
    const d = await decomposeEdgeForPlan(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze], observations: [] })
    );
    assert.equal(d!.externalConditions.evidenceAvailable, "unavailable");
    assert.equal(d!.thesis.realityRelationship, "unknown");
    assert.equal(d!.externalConditions.variables.volatility, null);
    console.log("C missing reality: ok");
  }

  // D — Missing outcome → unavailable/partial, not invented R
  {
    const { plan, freeze } = await seedVerified(basePlan(), baseThesis());
    const d = await decomposeEdgeForPlan(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    assert.ok(
      d!.outcome.evidenceAvailable === "partial" ||
        d!.outcome.evidenceAvailable === "unavailable"
    );
    assert.equal(d!.outcome.variables.realizedPnL, null);
    assert.equal(d!.outcome.variables.planOutcomePresent, false);
    console.log("D missing outcome: ok");
  }

  // E — Unavailable T0 cannot fabricate thesis/control from Stock File
  {
    const plan = decide(basePlan()).plan;
    const d = await decomposeEdgeForPlan(
      plan.id,
      makeDeps({ plans: [plan], freezes: [] })
    );
    assert.ok(d);
    assert.equal(d!.integrity.freezeAvailable, false);
    assert.equal(d!.thesis.evidenceAvailable, "unavailable");
    assert.equal(d!.thesis.variables.thesisText, null);
    assert.equal(d!.controllable.evidenceAvailable, "unavailable");
    assert.equal(d!.controllable.plan.plannedEntry, null);
    assert.equal(d!.controllable.decision.verdict, null);
    // Execution may still show no_trade from Reveal
    assert.equal(d!.controllable.execution.kind, "no_trade");
    console.log("E unavailable T0: ok");
  }

  // F — Partial legacy remains explicitly partial
  {
    const partial = buildThesisT0Freeze({
      plan: basePlan({ decision: undefined }),
      decision: null,
      thesis: baseThesis(),
    });
    const freeze: ThesisT0Freeze = {
      ...partial,
      confidence: "partial",
      decision: {
        decisionId: "DEC-P",
        decidedAt: "2026-01-02T00:00:00.000Z",
        verdict: "wait",
        reasoning: "partial only",
        challenges: [],
        decidedBy: "human",
      },
    };
    const plan = decide(basePlan()).plan;
    const d = await decomposeEdgeForPlan(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    assert.equal(d!.integrity.confidence, "partial");
    assert.equal(d!.thesis.evidenceAvailable, "partial");
    assert.equal(d!.controllable.evidenceAvailable, "partial");
    console.log("F partial legacy: ok");
  }

  // G — Outcome does not rewrite thesis/decision assessment (Blind source)
  {
    const { plan, freeze } = await seedVerified(basePlan(), baseThesis());
    const withOutcome: TradePlan = {
      ...plan,
      outcome: {
        recordedAt: "2026-06-01T00:00:00.000Z",
        realizedResultR: -1,
        realizedPnL: -500,
        status: "theoretical_loss",
        tradeExecuted: true,
      },
    };
    const trade: Trade = {
      id: "H1",
      ticker: "TEST",
      entry: 106,
      exit: 90,
      stop: 98,
      shares: 10,
      status: "closed",
      createdAt: "2026-02-01T00:00:00.000Z",
      planId: plan.id,
    };
    const d = await decomposeEdgeForPlan(
      plan.id,
      makeDeps({
        plans: [{ ...withOutcome, linkedTradeId: "H1" }],
        freezes: [freeze],
        trades: [trade],
      })
    );
    assert.equal(d!.thesis.variables.thesisText, "Bullish continuation above zone");
    assert.equal(d!.controllable.decision.verdict, "wait");
    assert.equal(d!.controllable.plan.plannedEntry, 105);
    assert.equal(d!.outcome.variables.realizedResultR, -1);
    // Thesis layer not flipped to "bad" by loss
    assertNoGoodBad(d);
    console.log("G outcome does not rewrite thesis/decision: ok");
  }

  // H — No automatic GOOD/BAD labels
  {
    const { plan, freeze } = await seedVerified(basePlan(), baseThesis());
    const d = await decomposeEdgeForPlan(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    assertNoGoodBad(d);
    console.log("H no GOOD/BAD: ok");
  }

  // I — No persistence mutation (real freeze file stays empty array)
  {
    const freezePath = path.join(
      process.cwd(),
      "data",
      "thesis-t0-freezes.json"
    );
    const before = readFileSync(freezePath, "utf-8");
    const { plan, freeze } = await seedVerified(basePlan(), baseThesis());
    await decomposeEdgeForPlan(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    const after = readFileSync(freezePath, "utf-8");
    assert.equal(before, after);
    setThesisT0StoreForTests(null);
    console.log("I no persistence mutation: ok");
  }

  // Reality evidence present → relationship may leave unknown/insufficient, not fabricated score
  {
    const { plan, freeze } = await seedVerified(basePlan(), baseThesis());
    const obs: ObservationRecord = {
      id: "OBS-1",
      planId: plan.id,
      ticker: "TEST",
      status: "concluded",
      startedAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-06-01T00:00:00.000Z",
      durationDays: 90,
      targetReached: true,
      maxPrice: 125,
      minPrice: 100,
      createdAt: "2026-03-01T00:00:00.000Z",
      lastUpdatedAt: "2026-06-01T00:00:00.000Z",
    };
    const d = await decomposeEdgeForPlan(
      plan.id,
      makeDeps({
        plans: [plan],
        freezes: [freeze],
        observations: [obs],
      })
    );
    assert.equal(d!.externalConditions.evidenceAvailable, "available");
    assert.equal(d!.thesis.realityRelationship, "consistent");
    assert.equal(d!.externalConditions.variables.maxPrice, 125);
    console.log("A+ reality consistent path: ok");
  }

  setThesisT0StoreForTests(null);
  console.log("test-edge-decomposition: ok");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
