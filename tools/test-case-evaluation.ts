/**
 * MXT 016-P04 — Case Evaluation lanes + T0 criteria freeze.
 * Fixtures only — does not write real MXT JSON stores.
 * Run: npx tsx tools/test-case-evaluation.ts
 */
import assert from "node:assert/strict";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import {
  ensureThesisT0OnScoutDecision,
  planOnlyThesisAnchor,
} from "../lib/thesis-t0";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";
import { buildCase, type BuildCaseDeps } from "../lib/thesis-case";
import { evaluateCase } from "../lib/case-evaluation";
import type { CaseOhlcvEvidence } from "../lib/case-evaluation-types";

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
    id: "PLAN-CE-001",
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

function decide(
  plan: TradePlan,
  input: Parameters<typeof appendDecision>[1]
) {
  return appendDecision(plan, input);
}

function makeDeps(input: {
  plans: TradePlan[];
  freezes: ThesisT0Freeze[];
  trades?: Trade[];
  learningByPlan?: Record<string, LearningOutcome>;
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
    getObservations: async () => [],
    getLearningOutcomeByPlanId: async (planId) =>
      input.learningByPlan?.[planId.toUpperCase()] ??
      input.learningByPlan?.[planId],
    getMafExperimentByPlanId: async () => undefined,
  };
}

function lo(
  planId: string,
  kind: LearningOutcome["kind"],
  extra: Partial<LearningOutcome> = {}
): LearningOutcome {
  return {
    id: `LO-${planId}-${kind}`,
    kind,
    ticker: "TEST",
    planId,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...extra,
  };
}

function tradeFixture(overrides: Partial<Trade> & { id: string; planId: string }): Trade {
  return {
    ticker: "TEST",
    status: "closed",
    direction: "long",
    entry: 105,
    stop: 98,
    target: 120,
    shares: 1,
    createdAt: "2026-01-02T00:00:00.000Z",
    openedAt: "2026-01-02T00:00:00.000Z",
    closedAt: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

async function seedGoWithCriteria(planOverrides: Partial<TradePlan> = {}) {
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const thesis = baseThesis();
  const decided = decide(basePlan(planOverrides), {
    verdict: "go",
    decisionConfidence: 72,
    thesisQuality: 70,
    opportunityQuality: 68,
    challenges: ["Gap risk through entry"],
    reasoning: "Zone defended; layered entry authorized",
    planningRisk: { support: "primary zone", rr: "2.1R" },
    executionRisk: { late: "no chase above 105" },
    locationEvidence: "Price in 102-108 zone",
    decidedBy: "human",
  });
  assert.ok(!decided.errors?.length, decided.errors?.join("; "));
  const { freeze, created } = await ensureThesisT0OnScoutDecision({
    plan: decided.plan,
    thesis,
  });
  assert.equal(created, true);
  assert.ok(freeze);
  assert.equal(freeze!.decision?.decisionConfidence, 72);
  assert.equal(freeze!.decision?.locationEvidence, "Price in 102-108 zone");
  assert.ok(freeze!.decision?.planningRisk);
  return { plan: decided.plan, freeze: freeze!, thesis };
}

async function run() {
  // A — GO + profit: profit does NOT auto-set Decision Quality to supported
  {
    const { plan, freeze } = await seedGoWithCriteria({
      id: "PLAN-A",
      linkedTradeId: "TR-A",
    });
    const thin = decide(basePlan({ id: "PLAN-A-THIN", linkedTradeId: "TR-A2" }), {
      verdict: "go",
      decisionConfidence: 50,
      challenges: ["placeholder"],
      reasoning: undefined,
      decidedBy: "human",
    });
    assert.ok(!thin.errors?.length, thin.errors?.join("; "));
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const thinEnsured = await ensureThesisT0OnScoutDecision({
      plan: thin.plan,
      thesis: baseThesis({ id: "ST-THIN" }),
    });
    assert.ok(thinEnsured.freeze);
    const thinFreeze = thinEnsured.freeze!;
    // Force empty criteria on freeze body for not_supported contrast
    const emptyCriteriaFreeze: ThesisT0Freeze = {
      ...thinFreeze,
      stock: {
        ...thinFreeze.stock,
        currentHypothesis: null,
        levels: null,
        riskRules: null,
        thesis: null,
      },
      decision: {
        ...thinFreeze.decision!,
        reasoning: null,
        challenges: [],
        planningRisk: null,
        executionRisk: null,
        locationEvidence: null,
        confirmationEvidence: null,
        confirmationCost: null,
        decisionConfidence: null,
        opportunityQuality: null,
        thesisQuality: null,
      },
    };

    const richWin = await buildCase(
      plan.id,
      makeDeps({
        plans: [{ ...plan, linkedTradeId: "TR-A" }],
        freezes: [freeze],
        trades: [
          tradeFixture({
            id: "TR-A",
            planId: plan.id,
            entry: 105,
            exit: 120,
            exitReason: "target",
            riskRewardActual: 2.1,
          }),
        ],
        learningByPlan: {
          [plan.id]: lo(plan.id, "executed_win", { realizedR: 2.1 }),
        },
      })
    );
    const thinWin = await buildCase(
      thin.plan.id,
      makeDeps({
        plans: [thin.plan],
        freezes: [emptyCriteriaFreeze],
        trades: [
          tradeFixture({
            id: "TR-A2",
            planId: thin.plan.id,
            entry: 105,
            exit: 120,
            exitReason: "target",
            riskRewardActual: 2.1,
          }),
        ],
        learningByPlan: {
          [thin.plan.id]: lo(thin.plan.id, "executed_win", { realizedR: 2.1 }),
        },
      })
    );
    assert.ok(richWin && thinWin);
    const eRich = evaluateCase({ thesisCase: richWin });
    const eThin = evaluateCase({ thesisCase: thinWin });
    assert.equal(eRich.decisionQuality.value, "supported");
    assert.equal(eThin.decisionQuality.value, "not_supported");
    assert.ok(
      eRich.outcome.facts.some((f) => /executed_win|trade/i.test(f))
    );
    assert.notEqual(
      eThin.decisionQuality.value,
      "supported",
      "Profit must not force Decision Quality supported"
    );
    console.log("A GO+profit isolation: ok");
  }

  // B — WAIT + unfavorable path: no-entry does NOT auto good decision
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const decided = decide(basePlan({ id: "PLAN-B" }), {
      verdict: "wait",
      decisionConfidence: 40,
      challenges: ["placeholder"],
      reasoning: undefined,
      decidedBy: "human",
    });
    assert.ok(!decided.errors?.length);
    const ensured = await ensureThesisT0OnScoutDecision({
      plan: decided.plan,
      thesis: baseThesis(),
    });
    assert.ok(ensured.freeze);
    const emptyFreeze: ThesisT0Freeze = {
      ...ensured.freeze!,
      stock: {
        ...ensured.freeze!.stock,
        thesis: null,
        currentHypothesis: null,
        levels: null,
        riskRules: null,
      },
      decision: {
        ...ensured.freeze!.decision!,
        reasoning: null,
        challenges: [],
        planningRisk: null,
        locationEvidence: null,
        confirmationEvidence: null,
        confirmationCost: null,
        decisionConfidence: null,
        opportunityQuality: null,
        thesisQuality: null,
        executionRisk: null,
      },
    };
    const c = await buildCase(
      decided.plan.id,
      makeDeps({
        plans: [decided.plan],
        freezes: [emptyFreeze],
        learningByPlan: {
          [decided.plan.id]: lo(decided.plan.id, "unexecuted_plan_loss"),
        },
      })
    );
    const e = evaluateCase({
      thesisCase: c!,
      ohlcv: {
        planId: decided.plan.id,
        available: true,
        thesisZoneReached: "NO",
        stopLevelReached: "YES",
        targetReached: "NO",
        entryLevelReached: "NO",
        windowHigh: 110,
        windowLow: 95,
      },
    });
    assert.equal(e.executionQuality.value, "not_applicable");
    assert.notEqual(e.decisionQuality.value, "supported");
    assert.equal(e.decisionQuality.value, "not_supported");
    console.log("B WAIT+unfavorable isolation: ok");
  }

  // C — GO + stop respected + loss: loss ≠ bad Decision Quality; Execution respected
  {
    const { plan, freeze } = await seedGoWithCriteria({
      id: "PLAN-C",
      linkedTradeId: "TR-C",
    });
    const c = await buildCase(
      plan.id,
      makeDeps({
        plans: [plan],
        freezes: [freeze],
        trades: [
          tradeFixture({
            id: "TR-C",
            planId: plan.id,
            entry: 104.5,
            exit: 98,
            exitReason: "stop",
            riskRewardActual: -1,
          }),
        ],
        learningByPlan: {
          [plan.id]: lo(plan.id, "executed_loss", { realizedR: -1 }),
        },
      })
    );
    const e = evaluateCase({ thesisCase: c! });
    assert.equal(e.decisionQuality.value, "supported");
    assert.equal(e.executionQuality.value, "respected");
    assert.ok(e.outcome.facts.some((f) => /executed_loss|R hint/i.test(f)));
    console.log("C GO+stop+loss isolation: ok");
  }

  // D — GO + execution outside geometry → violated; DQ independent
  {
    const { plan, freeze } = await seedGoWithCriteria({
      id: "PLAN-D",
      linkedTradeId: "TR-D",
      plannedEntry: 105,
      layeredEntry: {
        executionMethod: "layered_limits",
        limits: [
          { price: 105, allocationPercent: 50 },
          { price: 104, allocationPercent: 50 },
        ],
        noChase: true,
        status: "planned",
        firstLimitPrice: 105,
      },
    });
    assert.equal(freeze.plan.maximumEntryProxy, 105);
    const c = await buildCase(
      plan.id,
      makeDeps({
        plans: [plan],
        freezes: [freeze],
        trades: [
          tradeFixture({
            id: "TR-D",
            planId: plan.id,
            entry: 108.5,
            exit: 120,
            exitReason: "target",
            riskRewardActual: 1.5,
          }),
        ],
        learningByPlan: {
          [plan.id]: lo(plan.id, "executed_win"),
        },
      })
    );
    const e = evaluateCase({ thesisCase: c! });
    assert.equal(e.executionQuality.value, "violated");
    assert.equal(e.decisionQuality.value, "supported");
    console.log("D chase violation: ok");
  }

  // E — WAIT + favorable Reality does NOT auto not_supported
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const decided = decide(basePlan({ id: "PLAN-E" }), {
      verdict: "wait",
      decisionConfidence: 65,
      challenges: ["Pullback may never arrive"],
      reasoning: "Price extended above primary zone — wait for 102-108",
      planningRisk: { support: "zone not tested" },
      decidedBy: "human",
    });
    const { freeze } = await ensureThesisT0OnScoutDecision({
      plan: decided.plan,
      thesis: baseThesis(),
    });
    const c = await buildCase(
      decided.plan.id,
      makeDeps({
        plans: [decided.plan],
        freezes: [freeze!],
        learningByPlan: {
          [decided.plan.id]: lo(decided.plan.id, "missed_opportunity"),
        },
      })
    );
    const ohlcv: CaseOhlcvEvidence = {
      planId: decided.plan.id,
      available: true,
      thesisZoneReached: "YES",
      stopLevelReached: "NO",
      targetReached: "YES",
      entryLevelReached: "YES",
      windowHigh: 125,
      windowLow: 103,
    };
    const e = evaluateCase({ thesisCase: c!, ohlcv });
    assert.equal(e.decisionQuality.value, "supported");
    assert.notEqual(e.decisionQuality.value, "not_supported");
    assert.equal(e.realityRelationship.value, "condition_met");
    assert.ok(e.outcome.facts.some((f) => /missed_opportunity/.test(f)));
    console.log("E WAIT+favorable isolation: ok");
  }

  // F — Missing T0 → Decision Quality INDETERMINATE (no hindsight)
  {
    const decided = decide(basePlan({ id: "PLAN-F" }), {
      verdict: "go",
      decisionConfidence: 80,
      challenges: ["x"],
      reasoning: "Would look supported if frozen",
      decidedBy: "human",
    });
    const c = await buildCase(
      decided.plan.id,
      makeDeps({ plans: [decided.plan], freezes: [] })
    );
    const e = evaluateCase({ thesisCase: c! });
    assert.equal(e.decisionQuality.value, "INDETERMINATE");
    assert.ok(
      e.uncertainty.some((u) => /T0|hindsight|freeze/i.test(u))
    );
    assert.equal(c!.t0Evidence.available, false);
    console.log("F missing T0 INDETERMINATE: ok");
  }

  // Extra — Plan without stockThesisId still freezes (PLAN-ONLY anchor)
  {
    setThesisT0StoreForTests(createMemoryThesisT0Store());
    const decided = decide(
      basePlan({ id: "PLAN-NFLX", stockThesisId: undefined }),
      {
        verdict: "go",
        decisionConfidence: 71,
        challenges: ["Limits may miss"],
        reasoning: "Layered experiment",
        decidedBy: "human",
      }
    );
    const { freeze, created } = await ensureThesisT0OnScoutDecision({
      plan: decided.plan,
      thesis: null,
    });
    assert.equal(created, true);
    assert.ok(freeze);
    assert.equal(freeze!.stockThesisId, planOnlyThesisAnchor("PLAN-NFLX"));
    assert.equal(freeze!.confidence, "partial");
    assert.equal(freeze!.decision?.decisionConfidence, 71);
    console.log("PLAN-ONLY T0 write: ok");
  }

  // Orphan OHLCV for another plan must not attach
  {
    const { plan, freeze } = await seedGoWithCriteria({ id: "PLAN-ORPHAN" });
    const c = await buildCase(
      plan.id,
      makeDeps({ plans: [plan], freezes: [freeze] })
    );
    const e = evaluateCase({
      thesisCase: c!,
      ohlcv: {
        planId: "PLAN-OTHER",
        available: true,
        thesisZoneReached: "YES",
        stopLevelReached: "YES",
        targetReached: "YES",
        entryLevelReached: "YES",
        windowHigh: 200,
        windowLow: 50,
      },
    });
    assert.equal(e.realityRelationship.value, "INDETERMINATE");
    console.log("Orphan OHLCV rejected: ok");
  }

  console.log("\nAll case-evaluation tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
