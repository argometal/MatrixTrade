import assert from "node:assert/strict";
import { buildCaseSnapshotModel } from "../lib/case-snapshot";
import { buildInsightsCaseSpine } from "../lib/insights-case-spine";
import { buildInsightsSnapshotModel } from "../lib/insights-snapshot";
import { __setImprovementHypothesesStoreForTests } from "../lib/improvement-hypotheses-store";
import { __setLearningOutcomeStoreForTests } from "../lib/learning-outcome-store";
import { resolveLearningOutcomeForPlan } from "../lib/learning-outcome-resolve";
import { setMarketRealityWindowsForTests } from "../lib/market-reality-store";
import { __setMafExperimentsStoreForTests } from "../lib/maf-experiments-store";
import { __setObservationsStoreForTests } from "../lib/observations-store";
import { createMemoryPlansStore, __setPlansStoreForTests } from "../lib/plans-store";
import { __setStockThesesStoreForTests, createMemoryStockThesesStore } from "../lib/stock-theses-store";
import { setThesisT0StoreForTests, createMemoryThesisT0Store } from "../lib/thesis-t0-store";
import { __setTradesStoreForTests, createMemoryTradesStore } from "../lib/trades-json";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { MafExperiment } from "../lib/maf-types";
import type { ObservationRecord } from "../lib/observation-types";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";

const thesis: StockThesis = {
  id: "ST-TSLA-001",
  ticker: "TSLA",
  status: "watching",
  version: 1,
  style: "swing",
  thesis: "TSLA thesis",
  historicalAnalysis: [],
  levels: { primaryZone: { low: 340, high: 355 }, targets: [430] },
  riskRules: { minimumRR: 3, invalidation: "Weekly close below 320" },
  currentHypothesis: "Wait for 348 print",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

const plan001: TradePlan = {
  id: "PLAN-001",
  ticker: "TSLA",
  stockThesisId: "ST-TSLA-001",
  playbookId: "weekly-breakout",
  status: "failed",
  analysisTimeframes: ["1D"],
  entryTimeframe: "1D",
  plannedEntry: 348,
  originalEntry: 348,
  stopPrice: 320,
  targetPrice: 430,
  plannedRR: 4.1,
  validFrom: "2026-07-10T00:00:00.000Z",
  validUntil: "2026-07-17T23:59:59.000Z",
  decision: {
    id: "DEC-PLAN-001",
    verdict: "wait",
    challenges: [],
    decidedAt: "2026-07-10T18:00:00.000Z",
  },
  decisionHistory: [],
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-09-07T00:00:00.000Z",
} as unknown as TradePlan;

const freeze001: ThesisT0Freeze = {
  id: "T0-PLAN-001",
  stockThesisId: "ST-TSLA-001",
  t0: "2026-07-10T18:00:00.000Z",
  evaluationHorizonEndsAt: "2026-07-17T23:59:59.000Z",
  evaluationHorizonDays: 7,
  evaluationHorizonOverride: false,
  beliefFingerprint: "fp-001",
  planIds: ["PLAN-001"],
  stock: {
    stockThesisId: "ST-TSLA-001",
    stockThesisVersion: 1,
    thesis: thesis.thesis,
    currentHypothesis: thesis.currentHypothesis,
    levels: thesis.levels,
    riskRules: thesis.riskRules,
  },
  decision: {
    decisionId: "DEC-PLAN-001",
    decidedAt: "2026-07-10T18:00:00.000Z",
    verdict: "wait",
    reasoning: "wait for entry",
    challenges: [],
    decidedBy: "human",
  },
  plan: {
    planId: "PLAN-001",
    plannedEntry: 348,
    originalEntry: 348,
    stopPrice: 320,
    targetPrice: 430,
    plannedRR: 2.928571,
    layeredEntry: null,
    executionInstruction: "wait for 348 print",
    validFrom: "2026-07-10T00:00:00.000Z",
    maximumEntryProxy: 348,
    playbookId: "weekly-breakout",
  },
  confidence: "verified",
  status: "expired_inconclusive",
  t1: "2026-07-17T23:59:59.000Z",
  createdAt: "2026-09-07T00:00:00.000Z",
  updatedAt: "2026-09-07T00:00:00.000Z",
  recordKind: "corrected",
};

const tradeLinkedLo: LearningOutcome = {
  id: "LO-TSLA-001",
  kind: "unexecuted_plan_loss",
  ticker: "TSLA",
  planId: "PLAN-001",
  tradeId: "H001",
  playbookId: "weekly-breakout",
  observationId: "OBS-TSLA-001",
  mafExperimentId: "MAF-TSLA-001",
  counterfactualR: -1,
  realizedR: 0,
  lifecycleStatus: "concluded",
  source: "plan_outcome",
  createdAt: "2026-09-07T00:00:00.000Z",
  updatedAt: "2026-09-07T00:00:00.000Z",
};

const canonicalLo: LearningOutcome = {
  ...tradeLinkedLo,
  id: "LO-TSLA-002",
  tradeId: undefined,
  observationId: "OBS-TSLA-002",
  mafExperimentId: "MAF-TSLA-002",
};

const canonicalObs: ObservationRecord = {
  id: "OBS-TSLA-002",
  planId: "PLAN-001",
  learningOutcomeId: "LO-TSLA-002",
  ticker: "TSLA",
  status: "concluded",
  startedAt: "2026-07-10T18:00:00.000Z",
  observationKind: "plan_counterfactual_observation",
  entryTriggered: true,
  targetTriggered: false,
  stopTriggered: true,
  firstTerminalEvent: "stop",
  endsAt: "2026-07-17T23:59:59.000Z",
  durationDays: 7,
  createdAt: "2026-09-07T00:00:00.000Z",
  lastUpdatedAt: "2026-09-07T00:00:00.000Z",
} as unknown as ObservationRecord;

const canonicalMaf: MafExperiment = {
  id: "MAF-TSLA-002",
  planId: "PLAN-001",
  playbookId: "weekly-breakout",
  ticker: "TSLA",
  status: "concluded",
  evidence: { fillStatus: "unknown", sources: { plan: true } },
  attributions: [
    {
      component: "timing_quality",
      classification: "failure",
      aiInterpretationConfidence: 70,
      reasoning: "timing drag",
      evidenceRefs: [],
    },
  ],
  primaryDragComponent: "timing_quality",
  createdAt: "2026-09-07T00:00:00.000Z",
  updatedAt: "2026-09-07T00:00:00.000Z",
  source: "attribution",
};

async function buildModel() {
  const caseSpine = await buildInsightsCaseSpine();
  const row = caseSpine.find((item) => item.planId === "PLAN-001");
  assert.ok(row, "PLAN-001 case row should exist");
  const model = buildInsightsSnapshotModel({
    pipelineInput: {
      learningOutcomes: await import("../lib/learning-outcome-store").then((m) => m.getLearningOutcomes()),
      plans: await import("../lib/plans").then((m) => m.getPlans()),
      trades: await import("../lib/storage").then((m) => m.getTrades()),
      observations: await import("../lib/observation-store").then((m) => m.getObservations()),
      mafExperiments: await import("../lib/maf-store").then((m) => m.getMafExperiments()),
    },
    caseSpine,
    focusPlanId: "PLAN-001",
  });
  assert.ok(model.focus, "PLAN-001 focus should exist");
  return { row: row!, focus: model.focus!, caseSnapshot: await buildCaseSnapshotModel("PLAN-001") };
}

async function main() {
  try {
    __setPlansStoreForTests(createMemoryPlansStore([plan001]));
    __setTradesStoreForTests(createMemoryTradesStore([]));
    __setStockThesesStoreForTests(createMemoryStockThesesStore([thesis]));
    __setImprovementHypothesesStoreForTests([]);
    setMarketRealityWindowsForTests([]);

    setThesisT0StoreForTests(createMemoryThesisT0Store([freeze001]));
    __setLearningOutcomeStoreForTests([tradeLinkedLo, canonicalLo]);
    __setObservationsStoreForTests({
      readAll: async () => [canonicalObs],
      upsert: async () => undefined,
    });
    __setMafExperimentsStoreForTests([canonicalMaf]);

    const plan = await import("../lib/plans").then((m) => m.getPlanById("PLAN-001"));
    const trades = await import("../lib/storage").then((m) => m.getTrades());
    const los = await import("../lib/learning-outcome-store").then((m) => m.getLearningOutcomes());
    const resolvedLo = resolveLearningOutcomeForPlan({
      plan: plan!,
      learningOutcomes: los,
      trades,
    });
    assert.equal(resolvedLo?.id, "LO-TSLA-002");

    const full = await buildModel();
    assert.equal(full.row.t0Available, true);
    assert.equal(full.row.t0RecordKind, "corrected");
    assert.equal(full.row.lifecycle.status, "COMPLETE");
    assert.equal(full.row.lifecycle.blockingLabels.length, 0);
    assert.equal(full.focus.learningOutcomeId, "LO-TSLA-002");
    assert.equal(full.focus.observationId, "OBS-TSLA-002");
    assert.equal(full.focus.mafExperimentId, "MAF-TSLA-002");
    assert.equal(full.caseSnapshot?.thesisCase.freeze?.id, "T0-PLAN-001");
    assert.equal(full.caseSnapshot?.learningOutcome?.id, "LO-TSLA-002");
    assert.equal(full.caseSnapshot?.observation?.id, "OBS-TSLA-002");
    assert.equal(full.caseSnapshot?.maf?.id, "MAF-TSLA-002");

    setThesisT0StoreForTests(createMemoryThesisT0Store([]));
    const noFreeze = await buildModel();
    assert.equal(noFreeze.row.t0Available, false);
    assert.equal(noFreeze.row.t0RecordKind ?? null, null);
    assert.equal(noFreeze.row.lifecycle.status, "INCOMPLETE");
    assert.ok(noFreeze.row.lifecycle.blockingLabels.includes("T0"));
    assert.equal(noFreeze.focus.t0Available, false);
    assert.equal(noFreeze.focus.t0RecordKind ?? null, null);
    assert.equal(noFreeze.caseSnapshot?.thesisCase.freeze ?? null, null);

    setThesisT0StoreForTests(createMemoryThesisT0Store([freeze001]));
    __setLearningOutcomeStoreForTests([]);
    __setObservationsStoreForTests({
      readAll: async () => [],
      upsert: async () => undefined,
    });
    __setMafExperimentsStoreForTests([]);
    const noDerived = await buildModel();
    assert.equal(noDerived.row.loKind ?? null, null);
    assert.equal(noDerived.row.mafAttribution ?? null, null);
    assert.equal(noDerived.focus.learningOutcomeId, null);
    assert.equal(noDerived.focus.observationId, null);
    assert.equal(noDerived.focus.mafExperimentId, null);
    assert.equal(noDerived.caseSnapshot?.learningOutcome ?? null, null);
    assert.equal(noDerived.caseSnapshot?.observation ?? null, null);
    assert.equal(noDerived.caseSnapshot?.maf ?? null, null);

    console.log("test-canonical-case-lineage: PASS");
  } finally {
    __setPlansStoreForTests(null);
    __setTradesStoreForTests(null);
    __setStockThesesStoreForTests(null);
    __setLearningOutcomeStoreForTests(null);
    __setObservationsStoreForTests(null);
    __setMafExperimentsStoreForTests(null);
    __setImprovementHypothesesStoreForTests(null);
    setThesisT0StoreForTests(null);
    setMarketRealityWindowsForTests(null);
  }
}

void main();
