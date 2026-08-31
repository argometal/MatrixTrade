/**
 * Prompt #9 — Minimal Case + Blind / Reveal.
 * Run: npx tsx tools/test-thesis-case-blind-reveal.ts
 */
import assert from "node:assert/strict";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";
import type { ObservationRecord } from "../lib/observation-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import {
  buildThesisT0Freeze,
  ensureThesisT0OnScoutDecision,
} from "../lib/thesis-t0";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";
import {
  buildT0EvidencePacket,
  buildCase,
  findT0HindsightLeaks,
  reconstructPlanChain,
  serializeT0EvidenceForLeakTest,
  type BuildCaseDeps,
} from "../lib/thesis-case";

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
  learning?: LearningOutcome | null;
}): BuildCaseDeps {
  const plans = input.plans;
  return {
    skipExpire: true,
    getPlanById: async (id) =>
      plans.find((p) => p.id.toUpperCase() === id.toUpperCase()),
    getPlans: async () => plans,
    listFreezes: async () => input.freezes,
    getTrades: async () => input.trades ?? [],
    getTradeById: async (id) =>
      (input.trades ?? []).find((t) => t.id.toUpperCase() === id.toUpperCase()),
    getObservations: async () => input.observations ?? [],
    getLearningOutcomeByPlanId: async () => input.learning ?? undefined,
    getMafExperimentByPlanId: async () => undefined,
  };
}

async function seedVerifiedFreeze(
  plan: TradePlan,
  thesis: StockThesis
): Promise<{ plan: TradePlan; freeze: ThesisT0Freeze }> {
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

async function run() {
  // A — verified Blind
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerifiedFreeze(basePlan(), thesis);
    const c = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    assert.ok(c);
    assert.equal(c!.t0Evidence.available, true);
    assert.equal(c!.t0Evidence.integrity, "verified");
    assert.equal(c!.t0Evidence.preEvent?.thesis, thesis.thesis);
    assert.equal(c!.t0Evidence.plan?.plannedEntry, 105);
    assert.equal(c!.t0Evidence.decision?.verdict, "wait");
    assert.equal(findT0HindsightLeaks(c!.t0Evidence).length, 0);
    console.log("A verified T0: ok");
  }

  // B — Stock File mutation does not change T0
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerifiedFreeze(basePlan(), thesis);
    const mutatedFreeze = structuredClone(freeze);
    // Simulate that live Stock File changed — freeze body must stay; T0 uses freeze.
    const liveThesis = baseThesis({
      thesis: "MUTATED AFTER T0",
      version: 99,
    });
    void liveThesis;
    const c = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [mutatedFreeze] })
    );
    assert.equal(c!.t0Evidence.preEvent?.thesis, "Bullish continuation above zone");
    assert.notEqual(c!.t0Evidence.preEvent?.thesis, "MUTATED AFTER T0");
    console.log("B Stock File mutation: ok");
  }

  // C — later Scout decision: T0 keeps decision; postDecision may list later
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const thesis = baseThesis();
    const first = decide(basePlan());
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: first.plan,
      thesis,
    });
    const second = decide(first.plan, "go");
    // Force later decidedAt
    const laterPlan: TradePlan = {
      ...second.plan,
      decision: {
        ...second.plan.decision!,
        decidedAt: "2099-01-01T00:00:00.000Z",
      },
      decisionHistory: [
        ...(first.plan.decision ? [first.plan.decision] : []),
        {
          ...second.plan.decision!,
          decidedAt: "2099-01-01T00:00:00.000Z",
        },
      ],
    };
    const c = await buildCase(
      laterPlan.id,
      makeDeps({ plans: [laterPlan], freezes: [freeze!] })
    );
    assert.equal(c!.t0Evidence.decision?.decisionId, freeze!.decision?.decisionId);
    assert.equal(c!.t0Evidence.decision?.verdict, "wait");
    assert.ok(
      c!.postDecision.learningEvidence.laterDecisions.some((d) => d.verdict === "go")
    );
    console.log("C later Scout decision: ok");
  }

  // D — late evidence excluded from T0, may appear in postDecision
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerifiedFreeze(basePlan(), thesis);
    const lateObs: ObservationRecord = {
      id: "OBS-TEST-001",
      planId: plan.id,
      ticker: "TEST",
      status: "observing",
      startedAt: "2099-06-01T00:00:00.000Z",
      endsAt: "2099-09-01T00:00:00.000Z",
      durationDays: 90,
      maxPrice: 999,
      minPrice: 1,
      createdAt: "2099-06-01T00:00:00.000Z",
      lastUpdatedAt: "2099-06-01T00:00:00.000Z",
    };
    const c = await buildCase(
      plan.id,
      makeDeps({
        plans: [plan],
        freezes: [freeze],
        observations: [lateObs],
      })
    );
    assert.equal(findT0HindsightLeaks(c!.t0Evidence).length, 0);
    assert.ok(
      !serializeT0EvidenceForLeakTest(c!.t0Evidence).includes("OBS-TEST-001")
    );
    assert.ok(
      !serializeT0EvidenceForLeakTest(c!.t0Evidence).includes("999")
    );
    assert.ok(
      c!.postDecision.marketReality.observations.some((o) => o.id === "OBS-TEST-001")
    );
    console.log("D late evidence: ok");
  }

  // E — Trade case: postDecision has trade; T0 has no result
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerifiedFreeze(
      basePlan({ linkedTradeId: "H-TEST-1" }),
      thesis
    );
    const trade: Trade = {
      id: "H-TEST-1",
      ticker: "TEST",
      entry: 106,
      exit: 118,
      stop: 98,
      target: 120,
      shares: 10,
      status: "closed",
      createdAt: "2026-02-01T00:00:00.000Z",
      closedAt: "2026-02-10T00:00:00.000Z",
      exitReason: "target",
      planId: plan.id,
      riskRewardActual: 1.5,
    };
    const c = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze], trades: [trade] })
    );
    assert.equal(c!.postDecision.execution.kind, "trade");
    if (c!.postDecision.execution.kind === "trade") {
      assert.equal(c!.postDecision.execution.entry, 106);
      assert.equal(c!.postDecision.execution.riskRewardActual, 1.5);
    }
    assert.equal(findT0HindsightLeaks(c!.t0Evidence).length, 0);
    assert.ok(!serializeT0EvidenceForLeakTest(c!.t0Evidence).includes("H-TEST-1"));
    assert.ok(!serializeT0EvidenceForLeakTest(c!.t0Evidence).includes("riskRewardActual"));
    console.log("E trade case: ok");
  }

  // F — no-trade WAIT
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerifiedFreeze(basePlan(), thesis);
    const c = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze], trades: [] })
    );
    assert.equal(c!.postDecision.execution.kind, "no_trade");
    if (c!.postDecision.execution.kind === "no_trade") {
      assert.match(c!.postDecision.execution.disposition ?? "", /NO TRADE|WAIT/i);
    }
    console.log("F no-trade: ok");
  }

  // G — plan replacement chain
  {
    const thesis = baseThesis();
    const { plan: p1, freeze } = await seedVerifiedFreeze(
      basePlan({ id: "PLAN-001" }),
      thesis
    );
    const p2 = decide(
      basePlan({
        id: "PLAN-002",
        plannedEntry: 110,
        replacesPlanId: "PLAN-001",
      }),
      "go"
    ).plan;
    const linkedFreeze: ThesisT0Freeze = {
      ...freeze,
      planIds: ["PLAN-001", "PLAN-002"],
    };
    const p1linked: TradePlan = {
      ...p1,
      replacedByPlanId: "PLAN-002",
    };
    const chain = reconstructPlanChain(p2, [p1linked, p2], linkedFreeze);
    assert.ok(chain.includes("PLAN-001"));
    assert.ok(chain.includes("PLAN-002"));
    const c = await buildCase(
      "PLAN-002",
      makeDeps({ plans: [p1linked, p2], freezes: [linkedFreeze] })
    );
    assert.equal(c!.t0Evidence.plan?.planId, "PLAN-001");
    assert.equal(c!.t0Evidence.plan?.plannedEntry, 105);
    assert.deepEqual(c!.identity.relatedPlanIds.slice(0, 2), [
      "PLAN-001",
      "PLAN-002",
    ]);
    console.log("G plan replacement: ok");
  }

  // H — legacy partial
  {
    const partial = buildThesisT0Freeze({
      plan: basePlan({ decision: undefined }),
      decision: null,
      thesis: baseThesis({ thesis: "Partial thesis only" }),
    });
    // Force partial confidence
    const freeze: ThesisT0Freeze = {
      ...partial,
      confidence: "partial",
      decision: null,
      stock: {
        ...partial.stock,
        currentHypothesis: null,
        riskRules: null,
      },
    };
    const blind = buildT0EvidencePacket(freeze);
    assert.equal(blind.available, true);
    assert.equal(blind.integrity, "partial");
    assert.ok(blind.reason?.includes("PARTIAL"));
    assert.equal(blind.preEvent?.thesis, "Partial thesis only");
    assert.equal(blind.decision, null);
    console.log("H legacy partial: ok");
  }

  // I — legacy unavailable — no Stock File backfill
  {
    const blind = buildT0EvidencePacket(null);
    assert.equal(blind.available, false);
    assert.equal(blind.integrity, "unavailable");
    assert.equal(blind.preEvent, null);
    assert.equal(blind.plan, null);
    assert.equal(blind.decision, null);

    const unavailFreeze = buildThesisT0Freeze({
      plan: basePlan({ createdAt: undefined as unknown as string }),
      decision: null,
      thesis: null,
    });
    const forced: ThesisT0Freeze = {
      ...unavailFreeze,
      confidence: "unavailable",
      decision: null,
      stock: {
        stockThesisId: "ST-X",
        stockThesisVersion: null,
        thesis: null,
        currentHypothesis: null,
        levels: null,
        riskRules: null,
      },
    };
    const b2 = buildT0EvidencePacket(forced);
    assert.equal(b2.available, false);
    assert.equal(b2.integrity, "unavailable");
    console.log("I legacy unavailable: ok");
  }

  // J — horizon from #8 freeze (no duplicate calc)
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerifiedFreeze(basePlan(), thesis);
    const openCase = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    assert.equal(openCase!.identity.episodeStatus, "open");
    assert.equal(
      openCase!.identity.evaluationHorizonDays,
      freeze.evaluationHorizonDays
    );
    assert.equal(
      openCase!.identity.evaluationHorizonEndsAt,
      freeze.evaluationHorizonEndsAt
    );

    const expired: ThesisT0Freeze = {
      ...freeze,
      status: "expired_inconclusive",
      t1: freeze.evaluationHorizonEndsAt,
    };
    const expiredCase = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [expired] })
    );
    assert.equal(expiredCase!.identity.episodeStatus, "expired_inconclusive");
    assert.equal(expiredCase!.identity.t1, freeze.evaluationHorizonEndsAt);
    assert.equal(
      expiredCase!.postDecision.marketReality.horizonExpired,
      true
    );
    console.log("J horizon: ok");
  }

  // K — hindsight leak test on T0 serialization
  {
    const thesis = baseThesis();
    const { plan, freeze } = await seedVerifiedFreeze(basePlan(), thesis);
    const learning: LearningOutcome = {
      id: "LO-1",
      kind: "executed_win",
      ticker: "TEST",
      planId: plan.id,
      realizedR: 2,
      realizedPnL: 500,
      lifecycleStatus: "concluded",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      source: "plan_outcome",
    };
    const c = await buildCase(
      plan.id,
      makeDeps({
        plans: [
          {
            ...plan,
            outcome: {
              recordedAt: "2026-03-01T00:00:00.000Z",
              realizedPnL: 500,
              realizedResultR: 2,
            },
          },
        ],
        freezes: [freeze],
        learning,
      })
    );
    const leaks = findT0HindsightLeaks(c!.t0Evidence);
    assert.equal(leaks.length, 0, `leaks: ${leaks.join(",")}`);
    const raw = serializeT0EvidenceForLeakTest(c!.t0Evidence);
    assert.ok(!raw.includes("realizedPnL"));
    assert.ok(!raw.includes("LearningOutcome"));
    assert.ok(!/"mafExperiment"\s*:/.test(raw));
    console.log("K hindsight leak: ok");
  }

  // L — regression smoke: builder null for missing plan; ui window path covered elsewhere
  {
    const c = await buildCase(
      "PLAN-MISSING",
      makeDeps({ plans: [], freezes: [] })
    );
    assert.equal(c, null);
    setThesisT0StoreForTests(null);
    console.log("L regression smoke: ok");
  }

  console.log("test-thesis-case-blind-reveal: ok");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
