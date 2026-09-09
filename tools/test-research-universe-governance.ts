/**
 * Research universe governance + descriptive statistics readiness.
 * Run: npx tsx tools/test-research-universe-governance.ts
 */
import assert from "node:assert/strict";
import {
  descriptiveAverage,
  descriptiveMedian,
  descriptiveProportion,
  descriptiveRange,
} from "../lib/descriptive-statistics";
import {
  buildCaseSpineResearchUniverse,
  buildCheckpointResearchUniverse,
  buildParticipationResearchUniverse,
  buildSequenceResearchUniverse,
} from "../lib/research-universe";
import { computeOpportunityParticipationComparison } from "../lib/opportunity-participation-comparison";
import { computeOpportunitySequenceComparison } from "../lib/opportunity-sequence-comparison";
import { buildInsightsCaseSpineView } from "../lib/insights-case-spine-view";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { MarketRealityCaseWindow } from "../lib/market-reality-types";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

assert.equal(descriptiveAverage([1, 2, 3]), 2);
assert.equal(descriptiveMedian([1, 2, 3, 4]), 2.5);
assert.equal(descriptiveProportion(1, 4), 0.25);
assert.equal(descriptiveProportion(1, 0), null);
assert.deepEqual(descriptiveRange([4, 1, 9]), { min: 1, max: 9 });

const participationUniverse = buildParticipationResearchUniverse({
  eligibleOpportunityCount: 2,
  excludedOpportunityCount: 1,
  unavailableOpportunityCount: 3,
  eligibleWindowLabel: "window-bounded fixture",
});
assert.equal(participationUniverse.n, 2);
assert.equal(participationUniverse.unitOfAnalysis, "non_executed_modern_case_path");
assert.equal(participationUniverse.claimLevel, "descriptive");
assert.equal(participationUniverse.observationWindow.windowBounded, true);
assert.match(participationUniverse.denominatorNote, /checkpoint/i);

const checkpointUniverse = buildCheckpointResearchUniverse({
  thresholdR: 0.5,
  reachedCount: 5,
  observationWindowEligibleCount: 4,
});
assert.equal(checkpointUniverse.unitOfAnalysis, "checkpoint_within_opportunity_path");
assert.equal(checkpointUniverse.n, 4);
assert.equal(checkpointUniverse.excluded, 1);
assert.match(checkpointUniverse.denominatorNote, /independent trades/i);

const sequenceUniverse = buildSequenceResearchUniverse({
  eligibleOpportunityCount: 1,
  duplicateZeroWeightCount: 2,
  indeterminateLineageCount: 1,
  summaryNote: "sequence note",
});
assert.equal(sequenceUniverse.unitOfAnalysis, "opportunity_sequence_with_trades");
assert.equal(sequenceUniverse.excluded, 2);
assert.equal(sequenceUniverse.unavailable, 1);

const caseUniverse = buildCaseSpineResearchUniverse({
  independentEconomicCaseCount: 1,
  rawCaseRowCount: 3,
});
assert.equal(caseUniverse.n, 1);
assert.equal(caseUniverse.excluded, 2);
assert.equal(caseUniverse.unitOfAnalysis, "independent_economic_case");

function spineRow(
  planId: string,
  independent: boolean
): InsightsCaseRow {
  return {
    planId,
    caseId: planId,
    ticker: "NFLX",
    date: "2026-07-25T10:53:39.336Z",
    playbookId: "expectancy-asymmetry",
    stockThesisId: "ST-NFLX-001",
    caseOrigin: "modern",
    independentEconomicObservation: independent,
    participation: "no_entry",
    verdict: "wait",
    family: "B",
    noEntryDiagnosis: "INDETERMINATE",
    equationId: `EQ-${planId}`,
    decisionQuality: "INDETERMINATE",
    executionQuality: "not_applicable",
    reality: "INDETERMINATE",
    outcomeLabel: independent ? null : "duplicate_creation",
    loKind: independent ? null : "duplicate_creation",
    realizedR: 0,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    lifecycle: {
      status: "INCOMPLETE",
      summary: "",
      evaluativeCompleteness: "INCOMPLETE",
      blockingLabels: ["T0"],
      requirements: [],
    },
    missingInputs: ["t0_freeze"],
    diagnosisReason: "fixture",
    evidenceSummary: "",
    caseHref: `/mxt/scout/case?plan=${planId}`,
    diagnosis: {
      planId,
      classification: { kind: "no_entry", value: "INDETERMINATE" },
      equationId: `EQ-${planId}`,
      inputsUsed: [],
      missingInputs: ["t0_freeze"],
      reason: "fixture",
    },
  };
}

const caseView = buildInsightsCaseSpineView([
  spineRow("PLAN-010", true),
  spineRow("PLAN-011", false),
  spineRow("PLAN-012", false),
]);
assert.ok(caseView.researchUniverse);
assert.equal(caseView.researchUniverse!.n, 1);
assert.equal(caseView.researchUniverse!.excluded, 2);
assert.equal(caseView.cards.totalCases.numerator, 1);

const plans: TradePlan[] = [
  {
    id: "PLAN-010",
    ticker: "NFLX",
    playbookId: "expectancy-asymmetry",
    stockThesisId: "ST-NFLX-001",
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
    createdAt: "2026-07-25T10:53:39.228Z",
    updatedAt: "2026-07-25T10:53:39.336Z",
  } as TradePlan,
  {
    id: "PLAN-011",
    ticker: "NFLX",
    playbookId: "expectancy-asymmetry",
    stockThesisId: "ST-NFLX-001",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    plannedRR: 5.6,
    outcome: {
      planId: "PLAN-011",
      recordedAt: "2026-08-16T09:06:42.252Z",
      outcomeKind: "duplicate_creation",
      tradeExecuted: false,
      entryTriggered: null,
      stopTriggered: null,
      targetTriggered: null,
      theoreticalResultR: null,
      realizedResultR: 0,
      outcomeSource: "manual_review",
      evidenceStatus: "verified",
      evidenceRefs: [],
      updatedAt: "2026-08-16T09:06:42.252Z",
    },
    createdAt: "2026-07-25T10:56:11.642Z",
    updatedAt: "2026-08-16T09:06:42.252Z",
  } as TradePlan,
];

const learningOutcomes: LearningOutcome[] = [
  {
    id: "LO-011",
    kind: "duplicate_creation",
    ticker: "NFLX",
    planId: "PLAN-011",
    realizedR: 0,
    excludedFromMetrics: true,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-08-16T09:06:42.252Z",
    updatedAt: "2026-08-16T09:06:42.252Z",
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
      {
        timestamp: "2026-07-25T13:30:00.000Z",
        open: 61,
        high: 64,
        low: 61,
        close: 63,
        volume: 1,
      },
      {
        timestamp: "2026-08-25T13:30:00.000Z",
        open: 80,
        high: 82.46,
        low: 79.28,
        close: 81,
        volume: 1,
      },
    ],
  },
];

const caseSpine = [
  spineRow("PLAN-010", true),
  spineRow("PLAN-011", false),
];

const participation = computeOpportunityParticipationComparison({
  source: {
    plans,
    trades: [] as Trade[],
    learningOutcomes,
    caseSpine,
    realityWindows,
  },
});

assert.equal(participation.researchUniverse.n, 1);
assert.equal(participation.researchUniverse.claimLevel, "descriptive");
assert.equal(
  participation.researchUniverse.unitOfAnalysis,
  "non_executed_modern_case_path"
);
assert.ok(participation.checkpointAggregates[0]?.researchUniverse);
assert.equal(
  participation.checkpointAggregates[0]?.researchUniverse.unitOfAnalysis,
  "checkpoint_within_opportunity_path"
);
assert.equal(
  typeof participation.checkpointAggregates[0]?.noReturnObservedProportion,
  "number"
);
// Checkpoint proportions are descriptive counts within window — not recommendation text.
assert.doesNotMatch(
  JSON.stringify(participation.researchUniverse),
  /recommend|should enter|chase threshold/i
);

const sequence = computeOpportunitySequenceComparison({
  source: {
    plans,
    trades: [],
    learningOutcomes,
    caseSpine,
  },
});
assert.equal(sequence.researchUniverse.n, 0);
assert.equal(sequence.researchUniverse.excluded, 1);
assert.equal(
  sequence.researchUniverse.unitOfAnalysis,
  "opportunity_sequence_with_trades"
);

const ui = readFileSync(
  join(__dirname, "../app/components/insights-preview/PreviewPipelinePerformance.tsx"),
  "utf8"
);
assert.match(ui, /data-research-universe="participation"/);
assert.match(ui, /data-research-universe="sequence"/);
assert.doesNotMatch(ui, /expectancy recommendation|chase rule/i);

console.log("test-research-universe-governance: PASS");
