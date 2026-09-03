/**
 * MXT 016-P05 — Learning Overview aggregation.
 * Fixtures only. Run: npx tsx tools/test-learning-overview.ts
 */
import assert from "node:assert/strict";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import { ensureThesisT0OnScoutDecision } from "../lib/thesis-t0";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";
import {
  buildLearningOverview,
  participationFromVerdict,
} from "../lib/learning-overview";
import type { BuildCaseDeps } from "../lib/thesis-case";

function baseThesis(): StockThesis {
  return {
    id: "ST-LO-001",
    ticker: "TEST",
    status: "watching",
    version: 1,
    style: "swing",
    thesis: "Test thesis",
    historicalAnalysis: [],
    levels: { primaryZone: { low: 100, high: 105 } },
    riskRules: { minimumRR: 2, invalidation: "Close below 98" },
    currentHypothesis: "Wait for zone",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-LO-001",
    ticker: "TEST",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 102,
    stopPrice: 98,
    targetPrice: 110,
    plannedRR: 2,
    stockThesisId: "ST-LO-001",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeDeps(input: {
  plans: TradePlan[];
  freezes: ThesisT0Freeze[];
}): BuildCaseDeps & {
  getPlans: () => Promise<TradePlan[]>;
  getCachedOhlcv: () => Promise<null>;
} {
  return {
    skipExpire: true,
    getPlans: async () => input.plans,
    getPlanById: async (id) =>
      input.plans.find((p) => p.id.toUpperCase() === id.toUpperCase()),
    listFreezes: async () => input.freezes,
    getTrades: async () => [],
    getTradeById: async () => undefined,
    getObservations: async () => [],
    getLearningOutcomeByPlanId: async () => undefined,
    getMafExperimentByPlanId: async () => undefined,
    getCachedOhlcv: async () => null,
  };
}

async function run() {
  assert.equal(participationFromVerdict("go"), "entry");
  assert.equal(participationFromVerdict("wait"), "no_entry");
  assert.equal(participationFromVerdict("no"), "no_entry");
  assert.equal(participationFromVerdict("probe"), "probe");
  console.log("participation mapping: ok");

  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const thesis = baseThesis();

  const waitPlan = appendDecision(
    basePlan({ id: "PLAN-W", stockThesisId: "ST-LO-WAIT" }),
    {
      verdict: "wait",
      decisionConfidence: 60,
      challenges: ["Zone not tested"],
      reasoning: "Price above zone — wait",
      decidedBy: "human",
    }
  ).plan;

  const goFrozen = appendDecision(basePlan({ id: "PLAN-G" }), {
    verdict: "go",
    decisionConfidence: 70,
    challenges: ["Gap risk"],
    reasoning: "Zone defended",
    locationEvidence: "In zone",
    decidedBy: "human",
  }).plan;
  const { freeze } = await ensureThesisT0OnScoutDecision({
    plan: goFrozen,
    thesis,
  });
  assert.ok(freeze);

  const goNoT0 = appendDecision(basePlan({ id: "PLAN-G2", stockThesisId: undefined }), {
    verdict: "go",
    decisionConfidence: 55,
    challenges: ["x"],
    reasoning: "Go without freeze in deps",
    decidedBy: "human",
  }).plan;

  const undecided = basePlan({ id: "PLAN-OPEN" });

  const overview = await buildLearningOverview(
    makeDeps({
      plans: [waitPlan, goFrozen, goNoT0, undecided],
      freezes: [freeze!],
    })
  );

  assert.equal(overview.totalCases, 3, "only decided plans are cases");
  assert.equal(overview.entryCases, 2);
  assert.equal(overview.noEntryCases, 1);
  assert.equal(overview.probeCases, 0);

  // PLAN-G has freeze → supported-ish; PLAN-W and PLAN-G2 missing freeze in deps for W/G2
  // waitPlan has no freeze in freezes list → missing T0
  assert.ok(overview.missingT0Cases >= 1);
  assert.ok(overview.decisionQuality.INDETERMINATE >= 1);

  assert.equal(overview.noEntryDiagnosis.available, true);
  assert.ok(overview.diagnosis.available);
  assert.ok(overview.diagnosis.currentCondition.statement.length > 10);
  assert.ok(overview.allCases.every((r) => r.diagnosis != null));

  const ids = overview.allCases.map((r) => r.planId).sort();
  assert.deepEqual(ids, ["PLAN-G", "PLAN-G2", "PLAN-W"]);
  assert.ok(overview.allCases.every((r) => r.caseHref.includes("plan=")));

  // Counts describe universe; diagnosis equations are explicit — no invented Alta/High labels
  const raw = JSON.stringify(overview);
  assert.ok(!/"Alta"|"Media"|"Baja"/.test(raw));

  // Go with T0 should not force supported from profit — no LO; still countable
  const goRow = overview.allCases.find((r) => r.planId === "PLAN-G");
  assert.ok(goRow);
  assert.equal(goRow!.t0Available, true);
  assert.notEqual(goRow!.decisionQuality, "INDETERMINATE");

  const missing = overview.allCases.find((r) => r.planId === "PLAN-W");
  assert.equal(missing!.decisionQuality, "INDETERMINATE");

  console.log("learning overview aggregation: ok");
  console.log("All learning-overview tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
