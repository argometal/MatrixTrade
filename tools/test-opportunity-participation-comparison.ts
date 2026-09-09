import assert from "node:assert/strict";
import { computeOpportunityParticipationComparison } from "../lib/opportunity-participation-comparison";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { MarketRealityCaseWindow } from "../lib/market-reality-types";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";

const plans: TradePlan[] = [
  {
    id: "PLAN-010",
    ticker: "NFLX",
    playbookId: "expectancy-asymmetry",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    plannedRR: 5.6,
    decision: {
      id: "DEC-010",
      verdict: "wait",
      decisionConfidence: 50,
      challenges: [],
      decidedAt: "2026-07-25T10:53:39.336Z",
    },
    familyBAssessment: {
      state: "extended_no_chase",
      trendIntegrity: "intact",
      extension: "high",
      pullbackQuality: "shallow_valid",
      participationCase: "wait",
      evidenceFor: [],
      evidenceAgainst: [],
      unresolved: [],
    },
    createdAt: "2026-07-25T10:53:39.228Z",
    updatedAt: "2026-07-25T10:53:39.336Z",
  } as TradePlan,
  {
    id: "PLAN-011",
    ticker: "NFLX",
    playbookId: "expectancy-asymmetry",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    plannedRR: 5.6,
    createdAt: "2026-07-25T11:00:00.000Z",
    updatedAt: "2026-07-25T11:00:00.000Z",
  } as TradePlan,
  {
    id: "PLAN-EXEC",
    ticker: "AAPL",
    playbookId: "layered-entry",
    status: "entered",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 95,
    targetPrice: 115,
    plannedRR: 3,
    linkedTradeId: "H001",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
  } as TradePlan,
];

const learningOutcomes: LearningOutcome[] = [
  {
    id: "LO-010",
    kind: "missed_opportunity",
    ticker: "NFLX",
    planId: "PLAN-010",
    realizedR: 0,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  },
  {
    id: "LO-011",
    kind: "duplicate_creation",
    ticker: "NFLX",
    planId: "PLAN-011",
    realizedR: 0,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  },
  {
    id: "LO-EXEC",
    kind: "executed_win",
    ticker: "AAPL",
    planId: "PLAN-EXEC",
    tradeId: "H001",
    realizedR: 2,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  },
];

const caseSpine: InsightsCaseRow[] = [
  {
    planId: "PLAN-010",
    caseId: "PLAN-010",
    ticker: "NFLX",
    date: "2026-07-25T10:53:39.336Z",
    playbookId: "expectancy-asymmetry",
    stockThesisId: "ST-NFLX-001",
    caseOrigin: "modern",
    independentEconomicObservation: true,
    participation: "no_entry",
    verdict: "wait",
    family: "B",
    noEntryDiagnosis: "INDETERMINATE",
    equationId: "EQ-PLAN-010",
    decisionQuality: "INDETERMINATE",
    executionQuality: "not_applicable",
    reality: "INDETERMINATE",
    outcomeLabel: "missed_opportunity",
    loKind: "missed_opportunity",
    realizedR: 0,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    lifecycle: { status: "INCOMPLETE", summary: "", evaluativeCompleteness: "INCOMPLETE", blockingLabels: ["T0"], requirements: [] },
    missingInputs: ["t0_freeze"],
    diagnosisReason: "fixture",
    evidenceSummary: "",
    caseHref: "/mxt/scout/case?plan=PLAN-010",
    diagnosis: {
      planId: "PLAN-010",
      classification: { kind: "no_entry", value: "INDETERMINATE" },
      equationId: "EQ-PLAN-010",
      inputsUsed: [],
      missingInputs: ["t0_freeze"],
      reason: "fixture",
    },
  },
  {
    planId: "PLAN-011",
    caseId: "PLAN-011",
    ticker: "NFLX",
    date: "2026-07-25T11:00:00.000Z",
    playbookId: "expectancy-asymmetry",
    stockThesisId: "ST-NFLX-001",
    caseOrigin: "modern",
    independentEconomicObservation: false,
    participation: "no_entry",
    verdict: "wait",
    family: "B",
    noEntryDiagnosis: "INDETERMINATE",
    equationId: "EQ-PLAN-011",
    decisionQuality: "INDETERMINATE",
    executionQuality: "not_applicable",
    reality: "INDETERMINATE",
    outcomeLabel: "duplicate_creation",
    loKind: "duplicate_creation",
    realizedR: 0,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    lifecycle: { status: "INCOMPLETE", summary: "", evaluativeCompleteness: "INCOMPLETE", blockingLabels: ["T0"], requirements: [] },
    missingInputs: ["t0_freeze"],
    diagnosisReason: "fixture",
    evidenceSummary: "",
    caseHref: "/mxt/scout/case?plan=PLAN-011",
    diagnosis: {
      planId: "PLAN-011",
      classification: { kind: "no_entry", value: "INDETERMINATE" },
      equationId: "EQ-PLAN-011",
      inputsUsed: [],
      missingInputs: ["t0_freeze"],
      reason: "fixture",
    },
  },
];

const realityWindows: MarketRealityCaseWindow[] = [
  {
    id: "MRW-010",
    planId: "PLAN-010",
    ticker: "NFLX",
    timeframe: "1d",
    source: "fixture",
    decisionBoundaryAt: "2026-07-25T10:53:39.336Z",
    windowStart: "2026-07-25T10:53:39.336Z",
    windowEnd: "2026-08-31T10:53:39.336Z",
    windowKind: "retrospective_observation",
    retrievedAt: "2026-09-08T00:00:00.000Z",
    sessionNote: "fixture",
    bars: [
      { timestamp: "2026-07-25T13:30:00.000Z", open: 61, high: 64, low: 61, close: 63, volume: 1 },
      { timestamp: "2026-07-27T13:30:00.000Z", open: 64, high: 66, low: 65, close: 65, volume: 1 },
      { timestamp: "2026-08-25T13:30:00.000Z", open: 80, high: 82.46, low: 79.28, close: 81, volume: 1 },
    ],
  },
  {
    id: "MRW-011",
    planId: "PLAN-011",
    ticker: "NFLX",
    timeframe: "1d",
    source: "fixture",
    decisionBoundaryAt: "2026-07-25T11:00:00.000Z",
    windowStart: "2026-07-25T11:00:00.000Z",
    windowEnd: "2026-08-31T11:00:00.000Z",
    windowKind: "retrospective_observation",
    retrievedAt: "2026-09-08T00:00:00.000Z",
    sessionNote: "fixture",
    bars: [
      { timestamp: "2026-07-25T13:30:00.000Z", open: 61, high: 64, low: 61, close: 63, volume: 1 },
      { timestamp: "2026-07-27T13:30:00.000Z", open: 64, high: 66, low: 65, close: 65, volume: 1 },
      { timestamp: "2026-08-25T13:30:00.000Z", open: 80, high: 82.46, low: 79.28, close: 81, volume: 1 },
    ],
  },
];

const view = computeOpportunityParticipationComparison({
  source: {
    plans,
    trades: [{ id: "H001", ticker: "AAPL", entry: 100, stop: 95, shares: 10, status: "closed", createdAt: "2026-07-20T00:00:00.000Z" } as Trade],
    learningOutcomes,
    caseSpine,
    realityWindows,
  },
});

assert.equal(view.eligibleOpportunityCount, 1);
assert.equal(view.excludedOpportunityCount, 1);
assert.equal(view.unavailableOpportunityCount, 0);
assert.equal(view.researchUniverse.n, 1);
assert.equal(view.researchUniverse.claimLevel, "descriptive");
assert.equal(view.rows[0]?.planId, "PLAN-010");
assert.equal(view.rows[0]?.lateEntryGeometryAvailable, false);
assert.equal(view.rows[0]?.waitEvidenceAvailable, true);
assert.equal(view.rows[0]?.noParticipationObserved, true);
assert.equal(view.rows[0]?.actualOleParticipationObserved, false);
assert.equal(view.rows[0]?.familyBState, "extended_no_chase");
assert.equal(view.participationEvidence.layeredConfigurationCount, 0);
assert.equal(view.participationEvidence.actualOleParticipationCount, 0);
assert.equal(view.participationEvidence.actualOleTimingEvidenceCount, 0);
assert.equal(view.closures.fullVsOle.status, "INSUFFICIENT EVIDENCE");
assert.equal(view.closures.oleVsWait.status, "INSUFFICIENT EVIDENCE");
assert.equal(view.closures.earlyOleVsLate.status, "UNAVAILABLE");
assert.equal(view.closures.oleAfterDisplacement.status, "UNAVAILABLE");
assert.equal(view.closures.partialParticipationPullback.status, "UNAVAILABLE");
assert.equal(view.alternatives.fullParticipationEvidenceCount, 1);
assert.equal(view.alternatives.waitEvidenceCount, 1);
assert.equal(view.alternatives.oleEvidenceCount, 0);
assert.equal(view.alternatives.lateParticipationGeometryCount, 0);
assert.equal(view.excludedRows[0]?.planId, "PLAN-011");
assert.equal(view.excludedRows[0]?.exclusionReason, "duplicate_creation");
assert.equal(view.checkpointAggregates.length, 2);
assert.equal(view.checkpointAggregates[0]?.thresholdR, 0.5);
assert.equal(view.checkpointAggregates[0]?.reachedCount, 1);
assert.equal(view.checkpointAggregates[0]?.noReturnObservedCount, 1);

console.log("test-opportunity-participation-comparison: PASS");
