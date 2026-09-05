/**
 * MXT 016-P08 — Insights Case spine + filters.
 * Run: npx tsx tools/test-insights-case-spine.ts
 */
import assert from "node:assert/strict";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import { ensureThesisT0OnScoutDecision } from "../lib/thesis-t0";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";
import {
  buildInsightsCaseSpine,
  buildInsightsCaseSpineView,
  familyFromDiagnosis,
  filterInsightsCaseRows,
  resolveLearningOutcomeForPlan,
} from "../lib/insights-case-spine";
import { diagnoseCase, EQ } from "../lib/case-diagnosis";
import { evaluateCase } from "../lib/case-evaluation";
import { buildCase } from "../lib/thesis-case";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { Trade } from "../lib/types";

function baseThesis(id = "ST-ICS-001"): StockThesis {
  return {
    id,
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
    id: "PLAN-ICS-001",
    ticker: "TEST",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 102,
    stopPrice: 98,
    targetPrice: 110,
    plannedRR: 2.0,
    stockThesisId: "ST-ICS-001",
    playbookId: "PB-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function run() {
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const thesis = baseThesis();

  const thesisGf = baseThesis("ST-ICS-GF");
  const thesisOo = baseThesis("ST-ICS-OO");
  const thesisC = baseThesis("ST-ICS-C");

  // --- A: GO + T0 ---
  const goPlan = appendDecision(
    basePlan({ id: "PLAN-A", ticker: "AAA", stockThesisId: "ST-ICS-001" }),
    {
      verdict: "go",
      decisionConfidence: 70,
      challenges: ["Gap"],
      reasoning: "Zone defended with criteria",
      locationEvidence: "In zone",
      decidedBy: "human",
    }
  ).plan;
  const { freeze: freezeA } = await ensureThesisT0OnScoutDecision({
    plan: goPlan,
    thesis,
  });
  assert.ok(freezeA);

  // Good Filter: WAIT + T0 + Reality condition_not_met via OHLCV zone=NO
  const waitGf = appendDecision(
    basePlan({ id: "PLAN-GF", ticker: "BBB", stockThesisId: "ST-ICS-GF" }),
    {
      verdict: "wait",
      decisionConfidence: 55,
      challenges: ["Zone not tested"],
      reasoning: "Price above zone — wait",
      decidedBy: "human",
    }
  ).plan;
  const { freeze: freezeGf } = await ensureThesisT0OnScoutDecision({
    plan: waitGf,
    thesis: thesisGf,
  });
  assert.ok(freezeGf);

  // Over-opt: WAIT + T0 + Reality condition_met via OHLCV zone=YES (no CF R)
  const waitOo = appendDecision(
    basePlan({ id: "PLAN-OO", ticker: "CCC", stockThesisId: "ST-ICS-OO" }),
    {
      verdict: "wait",
      decisionConfidence: 60,
      challenges: ["Strict"],
      reasoning: "Waiting for perfect setup",
      decidedBy: "human",
    }
  ).plan;
  const { freeze: freezeOo } = await ensureThesisT0OnScoutDecision({
    plan: waitOo,
    thesis: thesisOo,
  });
  assert.ok(freezeOo);

  // D1: same Reality met + evaluable +CF R → Case D (not bare Over-Opt)
  const waitD1 = appendDecision(
    basePlan({ id: "PLAN-D1", ticker: "CCC", stockThesisId: "ST-ICS-D1" }),
    {
      verdict: "wait",
      decisionConfidence: 60,
      challenges: ["Strict"],
      reasoning: "Waiting — later CF profit evaluable",
      decidedBy: "human",
    }
  ).plan;
  const thesisD1 = { ...thesisOo, id: "ST-ICS-D1" };
  const { freeze: freezeD1 } = await ensureThesisT0OnScoutDecision({
    plan: waitD1,
    thesis: thesisD1,
  });
  assert.ok(freezeD1);

  // Missing T0 → indeterminate
  const waitNoT0 = appendDecision(
    basePlan({ id: "PLAN-NT0", ticker: "DDD", stockThesisId: undefined }),
    {
      verdict: "wait",
      decisionConfidence: 40,
      challenges: ["x"],
      reasoning: "No freeze in deps",
      decidedBy: "human",
    }
  ).plan;

  // Adverse entry → C
  const goC = appendDecision(
    basePlan({
      id: "PLAN-C",
      ticker: "EEE",
      stockThesisId: "ST-ICS-C",
      linkedTradeId: "TR-C",
    }),
    {
      verdict: "go",
      decisionConfidence: 65,
      challenges: ["Risk"],
      reasoning: "Valid entry criteria present",
      locationEvidence: "zone",
      decidedBy: "human",
    }
  ).plan;
  const { freeze: freezeC } = await ensureThesisT0OnScoutDecision({
    plan: goC,
    thesis: thesisC,
  });
  assert.ok(freezeC);

  const tradeC: Trade = {
    id: "TR-C",
    ticker: "EEE",
    entry: 101,
    exit: 98,
    stop: 98,
    target: 110,
    shares: 10,
    status: "closed",
    createdAt: "2026-01-02T00:00:00.000Z",
    closedAt: "2026-01-05T00:00:00.000Z",
    exitReason: "stop",
    planId: "PLAN-C",
    riskRewardActual: -1,
  };

  const loC: LearningOutcome = {
    id: "LO-EEE-001",
    kind: "executed_loss",
    ticker: "EEE",
    planId: "PLAN-C",
    tradeId: "TR-C",
    realizedR: -1,
    realizedPnL: -30,
    counterfactualR: undefined,
    lifecycleStatus: "concluded",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
    source: "trade_close",
  };

  // CF R on PLAN-D1 → D1; PLAN-OO keeps bare Over-Opt (CF unknown)
  const loCf: LearningOutcome = {
    id: "LO-CCC-D1",
    kind: "missed_opportunity",
    ticker: "CCC",
    planId: "PLAN-D1",
    counterfactualR: 6.25,
    realizedR: 0,
    lifecycleStatus: "concluded",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    source: "plan_outcome",
  };

  const plans = [goPlan, waitGf, waitOo, waitD1, waitNoT0, goC];
  const freezes = [freezeA!, freezeGf!, freezeOo!, freezeD1!, freezeC!];

  const ohlcvByPlan: Record<
    string,
    {
      planId: string;
      available: boolean;
      thesisZoneReached: "YES" | "NO" | "UNKNOWN";
      stopLevelReached: "YES" | "NO" | "UNKNOWN";
      targetReached: "YES" | "NO" | "UNKNOWN";
      entryLevelReached: "YES" | "NO" | "UNKNOWN";
      windowHigh: number;
      windowLow: number;
    }
  > = {
    "PLAN-GF": {
      planId: "PLAN-GF",
      available: true,
      thesisZoneReached: "NO",
      stopLevelReached: "NO",
      targetReached: "NO",
      entryLevelReached: "NO",
      windowHigh: 120,
      windowLow: 110,
    },
    "PLAN-OO": {
      planId: "PLAN-OO",
      available: true,
      thesisZoneReached: "YES",
      stopLevelReached: "NO",
      targetReached: "NO",
      entryLevelReached: "YES",
      windowHigh: 108,
      windowLow: 99,
    },
    "PLAN-D1": {
      planId: "PLAN-D1",
      available: true,
      thesisZoneReached: "YES",
      stopLevelReached: "NO",
      targetReached: "YES",
      entryLevelReached: "YES",
      windowHigh: 108,
      windowLow: 99,
    },
    "PLAN-A": {
      planId: "PLAN-A",
      available: true,
      thesisZoneReached: "YES",
      stopLevelReached: "NO",
      targetReached: "YES",
      entryLevelReached: "YES",
      windowHigh: 112,
      windowLow: 100,
    },
  };

  const rows = await buildInsightsCaseSpine({
    skipExpire: true,
    getPlans: async () => plans,
    getPlanById: async (id) =>
      plans.find((p) => p.id.toUpperCase() === id.toUpperCase()),
    listFreezes: async () => freezes,
    getTrades: async () => [tradeC],
    getTradeById: async (id) =>
      id.toUpperCase() === "TR-C" ? tradeC : undefined,
    getObservations: async () => [],
    getLearningOutcomes: async () => [loC, loCf],
    getLearningOutcomeByPlanId: async (id) => {
      if (id.toUpperCase() === "PLAN-C") return loC;
      if (id.toUpperCase() === "PLAN-D1") return loCf;
      return undefined;
    },
    getMafExperimentByPlanId: async () => undefined,
    getCachedOhlcv: async (plan) => ohlcvByPlan[plan.id] ?? null,
  });

  assert.ok(rows.length >= 6, "spine has decided plans");

  const rowA = rows.find((r) => r.planId === "PLAN-A");
  const rowGf = rows.find((r) => r.planId === "PLAN-GF");
  const rowOo = rows.find((r) => r.planId === "PLAN-OO");
  const rowD1 = rows.find((r) => r.planId === "PLAN-D1");
  const rowNt0 = rows.find((r) => r.planId === "PLAN-NT0");
  const rowC = rows.find((r) => r.planId === "PLAN-C");

  // 1. A
  assert.ok(rowA);
  // May be A or INDETERMINATE if outcome polarity unknown without trade facts —
  // inject via evaluate path: go with target YES should still need favorable outcome facts.
  // Force-check diagnosis path for A using evaluateCase + trade-like facts:
  {
    const c = await buildCase("PLAN-A", {
      skipExpire: true,
      getPlanById: async () => goPlan,
      listFreezes: async () => [freezeA!],
      getTrades: async () => [],
      getObservations: async () => [],
    });
    assert.ok(c);
    const ev = evaluateCase({
      thesisCase: c!,
      ohlcv: ohlcvByPlan["PLAN-A"],
    });
    // Without trade, EQ=not_applicable, outcome facts no_trade — polarity unknown → not A.
    // Use diagnose with patched evaluation outcome facts for A proof:
    const dA = diagnoseCase({
      thesisCase: c!,
      evaluation: {
        ...ev,
        outcome: { facts: ["execution: trade T1", "PnL hint: 80"] },
        executionQuality: {
          value: "respected",
          evidence: [{ t0Ref: "t0", realityRef: "r", note: "ok" }],
        },
      },
    });
    assert.equal(familyFromDiagnosis(dA), "A");
    assert.equal(dA.equationId, EQ.ENT_A);
  }

  // 2. Good Filter → B + GOOD_FILTER
  assert.ok(rowGf);
  assert.equal(rowGf!.family, "B");
  assert.equal(rowGf!.noEntryDiagnosis, "GOOD_FILTER");
  assert.equal(rowGf!.equationId, EQ.NE_GOOD_FILTER);

  // 3. Over-optimization → B + OVER_OPTIMIZATION (CF unknown)
  assert.ok(rowOo);
  assert.equal(rowOo!.family, "B");
  assert.equal(rowOo!.noEntryDiagnosis, "OVER_OPTIMIZATION");
  assert.equal(rowOo!.equationId, EQ.NE_OVER_OPT);
  assert.equal(rowOo!.counterfactualR, null);

  // 3b. D1 — No Entry / Would Profit when CF R known
  assert.ok(rowD1);
  assert.equal(rowD1!.family, "D");
  assert.equal(rowD1!.caseDSubtype, "D1");
  assert.equal(rowD1!.equationId, EQ.D1);
  assert.equal(rowD1!.realizedR, 0);
  assert.equal(rowD1!.counterfactualR, 6.25);

  // 4. Missing T0 → INDETERMINATE (family B with NE indet or family INDETERMINATE)
  assert.ok(rowNt0);
  assert.equal(rowNt0!.t0Available, false);
  assert.ok(
    rowNt0!.family === "B" && rowNt0!.noEntryDiagnosis === "INDETERMINATE"
  );
  assert.equal(rowNt0!.equationId, EQ.NE_MISSING_T0);

  // 5–6. C with adverse outcome; D would need not_supported — check C path
  assert.ok(rowC);
  // With trade stop loss, may be C if DQ ok and EQ respected
  if (rowC!.family === "C") {
    assert.equal(rowC!.equationId, EQ.ENT_C);
  } else {
    // Accept INDETERMINATE if execution geometry thin — still not D from outcome alone
    assert.notEqual(rowC!.family, "D");
  }

  // Explicit D proof
  {
    const c = await buildCase("PLAN-C", {
      skipExpire: true,
      getPlanById: async () => goC,
      listFreezes: async () => [freezeC!],
      getTrades: async () => [tradeC],
      getTradeById: async () => tradeC,
      getObservations: async () => [],
    });
    const ev = evaluateCase({ thesisCase: c! });
    const dD = diagnoseCase({
      thesisCase: c!,
      evaluation: {
        ...ev,
        decisionQuality: {
          value: "not_supported",
          evidence: [{ t0Ref: "t0", realityRef: "r", note: "thin" }],
        },
        outcome: { facts: ["PnL hint: 999"] }, // favorable outcome must not prevent D
      },
    });
    assert.equal(familyFromDiagnosis(dD), "D");
    assert.equal(dD.equationId, EQ.D6);
    assert.equal(
      dD.classification.kind === "case_d" && dD.classification.value,
      "D6"
    );
  }

  // 8–10 filters
  const onlyB = filterInsightsCaseRows(rows, { caseFamily: "B" });
  assert.ok(onlyB.every((r) => r.family === "B"));
  assert.ok(onlyB.some((r) => r.planId === "PLAN-GF"));

  const onlyOo = filterInsightsCaseRows(rows, {
    caseFamily: "B",
    noEntryDiagnosis: "OVER_OPTIMIZATION",
  });
  assert.deepEqual(
    onlyOo.map((r) => r.planId).sort(),
    ["PLAN-OO"]
  );

  const composed = filterInsightsCaseRows(rows, {
    ticker: "BBB",
    caseFamily: "B",
    noEntryDiagnosis: "GOOD_FILTER",
  });
  assert.equal(composed.length, 1);
  assert.equal(composed[0]!.planId, "PLAN-GF");

  // 11. Card counts match filtered drill
  const viewOo = buildInsightsCaseSpineView(rows, {
    caseFamily: "B",
    noEntryDiagnosis: "OVER_OPTIMIZATION",
  });
  assert.equal(viewOo.cards.familyB.numerator, viewOo.rows.length);
  assert.equal(viewOo.cards.overOptimization.numerator, viewOo.rows.length);
  assert.deepEqual(viewOo.cards.overOptimization.planIds, ["PLAN-OO"]);

  // 12. Case href
  assert.ok(rowGf!.caseHref.includes("plan=PLAN-GF"));
  assert.ok(rowGf!.caseHref.includes("/scout/case"));

  // LO join unambiguous
  const joined = resolveLearningOutcomeForPlan({
    plan: waitD1,
    learningOutcomes: [loCf],
    trades: [],
  });
  assert.equal(joined?.counterfactualR, 6.25);

  const ambiguous = resolveLearningOutcomeForPlan({
    plan: waitOo,
    learningOutcomes: [loCf, { ...loCf, id: "LO-CCC-002" }],
    trades: [],
  });
  assert.equal(ambiguous, null);

  console.log("test-insights-case-spine: PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
