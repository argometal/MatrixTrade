/**
 * MXT 017-P13 — historical Case recovery (no fabricated T0).
 * Run: npx tsx tools/test-mxt-017-historical-recovery.ts
 */
import assert from "node:assert/strict";
import {
  buildHistoricalCaseAttribution,
  isHistoricalTradeCandidate,
} from "../lib/historical-case-attribution";
import type { Trade } from "../lib/types";
import { diagnoseCase } from "../lib/case-diagnosis";
import { evaluateCase } from "../lib/case-evaluation";
import { buildCase } from "../lib/thesis-case";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
} from "../lib/thesis-t0-store";
import { ensureThesisT0OnScoutDecision } from "../lib/thesis-t0";
import { buildInsightsCaseSpine } from "../lib/insights-case-spine";

const AMZN_NOTE =
  "The intent was to enter on the decline. Entry was not near a sufficiently strong structural location; price swept the stops. Later corrections occurred, but R/location quality was poor. These trades were pre-MXT.";

function amznH001(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "H001",
    ticker: "AMZN",
    status: "closed",
    entry: 240,
    stop: 230,
    target: 270,
    exit: 225.9,
    shares: 8,
    direction: "long",
    riskRewardPlanned: 3,
    riskRewardActual: -1.41,
    qualityEntry: 2,
    mistakes: ["fomo", "chased"],
    lesson: "Wait for weekly close above resistance",
    actionItem: "No entries on earnings week",
    planHistoricallyAbsent: true,
    playbookHistoricallyAbsent: true,
    reviewedAt: "2026-02-01T00:00:00.000Z",
    createdAt: "2025-11-01T00:00:00.000Z",
    closedAt: "2025-11-05T00:00:00.000Z",
    ...overrides,
  };
}

async function run() {
  delete process.env.MXT_READ_ONLY;
  delete process.env.TRADES_STORE;

  // 1) Historical attribution for AMZN H001
  const trade = amznH001();
  assert.equal(isHistoricalTradeCandidate(trade), true);
  const hist = buildHistoricalCaseAttribution({
    trade,
    reconstructionNote: AMZN_NOTE,
    stockThesisReconstructed: true,
  });
  assert.equal(hist.fabricatedT0, false);
  assert.equal(hist.t0Status, "absent_pre_mxt");
  assert.ok(
    hist.components.some((c) => c.component === "entry_quality"),
    "entry_quality expected"
  );
  assert.ok(
    hist.components.some((c) => c.component === "zone_quality"),
    "zone_quality from reconstruction location language"
  );
  for (const c of hist.components) {
    if (c.component === "entry_quality" || c.component === "zone_quality") {
      assert.equal(c.provenance, "reconstructed");
    }
  }
  assert.ok(
    hist.unsupportedConclusions.some((u) =>
      u.toLowerCase().includes("scout")
    )
  );
  assert.ok(
    hist.unsupportedConclusions.some((u) => u.toLowerCase().includes("t0"))
  );
  assert.ok(!/verified t0/i.test(hist.summary));
  assert.equal(
    hist.evidence.find((e) => /205|210/.test(e.value)),
    undefined
  );

  // 2) Modern Case with T0 retains diagnoseCase behavior
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const thesis: StockThesis = {
    id: "ST-MOD-1",
    ticker: "TEST",
    status: "watching",
    version: 1,
    style: "swing",
    thesis: "modern",
    historicalAnalysis: [],
    levels: { primaryZone: { low: 10, high: 12 } },
    riskRules: { minimumRR: 2, invalidation: "Close below 9" },
    currentHypothesis: "hyp",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  let plan: TradePlan = {
    id: "PLAN-MOD-1",
    ticker: "TEST",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 11,
    stopPrice: 9,
    targetPrice: 15,
    plannedRR: 2,
    stockThesisId: "ST-MOD-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const decided = appendDecision(plan, {
    verdict: "wait",
    decisionConfidence: 70,
    challenges: ["Zone"],
    reasoning: "Wait",
    decidedBy: "human",
  });
  assert.ok(decided.plan);
  plan = decided.plan!;
  const freeze = await ensureThesisT0OnScoutDecision({ plan, thesis });
  assert.equal(freeze.status, "created");

  const modernCase = await buildCase("PLAN-MOD-1", {
    getPlanById: async () => plan,
    skipExpire: true,
  });
  assert.ok(modernCase);
  assert.equal(modernCase!.t0Evidence.available, true);
  const modernEval = evaluateCase({ thesisCase: modernCase! });
  const modernDx = diagnoseCase({
    thesisCase: modernCase!,
    evaluation: modernEval,
  });
  assert.notEqual(modernDx.equationId, "HIST-ATTRIBUTION");
  assert.ok(String(modernDx.equationId).startsWith("EQ-016A"));

  // 3) Spine includes historical trade with attribution; modern row unchanged class
  const spine = await buildInsightsCaseSpine({
    getPlans: async () => [plan],
    getTrades: async () => [trade],
    getLearningOutcomes: async () => [],
    getMafExperiments: async () => [],
    getCachedOhlcv: async () => null,
    historicalReconstructionNotes: { H001: AMZN_NOTE },
    skipExpire: true,
    getPlanById: async (id: string) => (id === plan.id ? plan : undefined),
  });

  const histRow = spine.find((r) => r.caseId === "H001");
  assert.ok(histRow, "H001 must appear in spine");
  assert.equal(histRow!.caseOrigin, "historical_trade");
  assert.equal(histRow!.family, "INDETERMINATE");
  assert.equal(histRow!.t0Available, false);
  assert.equal(histRow!.equationId, "HIST-ATTRIBUTION");
  assert.ok(histRow!.historicalAttribution);
  assert.equal(histRow!.historicalAttribution!.fabricatedT0, false);
  assert.ok(
    histRow!.historicalAttribution!.components.some(
      (c) => c.component === "entry_quality"
    )
  );

  const modernRow = spine.find((r) => r.planId === "PLAN-MOD-1");
  assert.ok(modernRow);
  assert.equal(modernRow!.caseOrigin, "modern");
  assert.notEqual(modernRow!.equationId, "HIST-ATTRIBUTION");

  console.log("PASS tools/test-mxt-017-historical-recovery.ts");
  console.log(
    "AMZN H001 components:",
    hist.components.map((c) => `${c.component}/${c.provenance}/${c.band}`).join(", ")
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
