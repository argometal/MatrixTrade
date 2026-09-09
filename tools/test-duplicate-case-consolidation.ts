/**
 * Generic duplicate_creation integrity (synthetic fixtures).
 * If duplicate-marked rows exist, aggregates must not triple-count N.
 * Contaminated canonical rows are deleted separately (MXT 035) — this is not
 * a keep-for-audit consolidation contract.
 * Run: npx tsx tools/test-duplicate-case-consolidation.ts
 */
import assert from "node:assert/strict";
import {
  findDuplicateCreationLearningOutcome,
  isDuplicateCreationPlan,
  isDuplicateEconomicObservation,
  isIndependentEconomicObservation,
} from "../lib/duplicate-observation";
import {
  buildInsightsCaseSpineView,
  independentEconomicCaseRows,
} from "../lib/insights-case-spine-view";
import { aggregatePlaybookDiagnosis } from "../lib/insights-playbook-diagnosis";
import { computeLearningPlanAggregates } from "../lib/learning-plan-aggregates";
import { computeOpportunityParticipationComparison } from "../lib/opportunity-participation-comparison";
import { computeOpportunitySequenceComparison } from "../lib/opportunity-sequence-comparison";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { MarketRealityCaseWindow } from "../lib/market-reality-types";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";

function diagnosisStub(planId: string): InsightsCaseRow["diagnosis"] {
  return {
    planId,
    classification: { kind: "no_entry", value: "INDETERMINATE" },
    equationId: `EQ-${planId}`,
    inputsUsed: [],
    missingInputs: ["t0_freeze"],
    reason: "fixture",
  };
}

function lifecycleStub(): InsightsCaseRow["lifecycle"] {
  return {
    status: "INCOMPLETE",
    summary: "",
    evaluativeCompleteness: "INCOMPLETE",
    blockingLabels: ["T0"],
    requirements: [],
  };
}

const plan010: TradePlan = {
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
} as TradePlan;

const plan011: TradePlan = {
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
} as TradePlan;

const plan012: TradePlan = {
  id: "PLAN-012",
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
    planId: "PLAN-012",
    recordedAt: "2026-08-17T09:00:00.000Z",
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
    updatedAt: "2026-08-17T09:00:00.000Z",
  },
  createdAt: "2026-07-25T10:57:23.336Z",
  updatedAt: "2026-08-17T09:00:00.000Z",
} as TradePlan;

const learningOutcomes: LearningOutcome[] = [
  {
    id: "LO-NFLX-001",
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
  {
    id: "LO-NFLX-002",
    kind: "duplicate_creation",
    ticker: "NFLX",
    planId: "PLAN-012",
    realizedR: 0,
    excludedFromMetrics: true,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-08-17T09:00:00.000Z",
    updatedAt: "2026-08-17T09:00:00.000Z",
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
    outcomeLabel: null,
    loKind: null,
    realizedR: 0,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    lifecycle: lifecycleStub(),
    missingInputs: ["t0_freeze"],
    diagnosisReason: "fixture",
    evidenceSummary: "",
    caseHref: "/mxt/scout/case?plan=PLAN-010",
    diagnosis: diagnosisStub("PLAN-010"),
  },
  {
    planId: "PLAN-011",
    caseId: "PLAN-011",
    ticker: "NFLX",
    date: "2026-07-25T10:56:11.642Z",
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
    lifecycle: lifecycleStub(),
    missingInputs: ["t0_freeze"],
    diagnosisReason: "fixture",
    evidenceSummary: "",
    caseHref: "/mxt/scout/case?plan=PLAN-011",
    diagnosis: diagnosisStub("PLAN-011"),
  },
  {
    planId: "PLAN-012",
    caseId: "PLAN-012",
    ticker: "NFLX",
    date: "2026-07-25T10:57:23.336Z",
    playbookId: "expectancy-asymmetry",
    stockThesisId: "ST-NFLX-001",
    caseOrigin: "modern",
    independentEconomicObservation: false,
    participation: "no_entry",
    verdict: "wait",
    family: "B",
    noEntryDiagnosis: "INDETERMINATE",
    equationId: "EQ-PLAN-012",
    decisionQuality: "INDETERMINATE",
    executionQuality: "not_applicable",
    reality: "INDETERMINATE",
    outcomeLabel: "duplicate_creation",
    loKind: "duplicate_creation",
    realizedR: 0,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    lifecycle: lifecycleStub(),
    missingInputs: ["t0_freeze"],
    diagnosisReason: "fixture",
    evidenceSummary: "",
    caseHref: "/mxt/scout/case?plan=PLAN-012",
    diagnosis: diagnosisStub("PLAN-012"),
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

// 1) Helper semantics — no invented parent field required for exclusion
assert.equal(isDuplicateCreationPlan(plan011), true);
assert.equal(isDuplicateCreationPlan(plan012), true);
assert.equal(isDuplicateCreationPlan(plan010), false);
assert.equal(
  isDuplicateEconomicObservation({
    plan: plan011,
    learningOutcome: learningOutcomes[0],
  }),
  true
);
assert.equal(
  isIndependentEconomicObservation({ plan: plan010 }),
  true
);
assert.equal(
  findDuplicateCreationLearningOutcome("PLAN-011", learningOutcomes)?.id,
  "LO-NFLX-001"
);
assert.equal(
  findDuplicateCreationLearningOutcome("PLAN-010", learningOutcomes),
  null
);

// 2) If duplicate-marked rows are present in a spine input, they stay visible
//    in the raw row list but do not increase independent economic N.
const view = buildInsightsCaseSpineView(caseSpine, { ticker: "NFLX" });
assert.equal(view.rows.length, 3);

// 3) Independent economic N = 1 (PLAN-010 only)
const economic = independentEconomicCaseRows(view.rows);
assert.equal(economic.length, 1);
assert.equal(economic[0]?.planId, "PLAN-010");
assert.equal(view.cards.totalCases.numerator, 1);
assert.deepEqual(view.cards.totalCases.planIds, ["PLAN-010"]);
assert.equal(view.cards.familyB.numerator, 1);

// 4) Playbook diagnosis does not triple-count
const playbooks = aggregatePlaybookDiagnosis(caseSpine);
const nflxPb = playbooks.find((p) => p.playbookId === "expectancy-asymmetry");
assert.equal(nflxPb?.cases, 1);

// 5) Learning plan aggregates: duplicates excluded from evaluatedPlanCount
const planAggs = computeLearningPlanAggregates({
  plans: [plan010, plan011, plan012],
  trades: [] as Trade[],
  mafExperiments: [],
});
assert.equal(planAggs.evaluatedPlanCount, 0); // 010 has no outcome; 011/012 excluded
assert.equal(planAggs.theoreticalPlanR, 0);

// 6) Participation comparison: eligible N=1; duplicates do not create R
const participation = computeOpportunityParticipationComparison({
  source: {
    plans: [plan010, plan011, plan012],
    trades: [],
    learningOutcomes,
    caseSpine,
    realityWindows,
  },
});
assert.equal(participation.eligibleOpportunityCount, 1);
assert.equal(participation.rows[0]?.planId, "PLAN-010");
assert.equal(participation.rows[0]?.favorableDisplacementR != null, true);
assert.equal(participation.participationEvidence.noParticipationCount, 1);
// No Reality copied onto 011/012 — they are unavailable, not eligible clones
assert.equal(
  participation.unavailableOpportunityCount +
    participation.excludedOpportunityCount,
  2
);

// 7) Sequence accounting: duplicate zero-weight = 2; no fabricated multi-opportunity N
const sequence = computeOpportunitySequenceComparison({
  source: {
    plans: [plan010, plan011, plan012],
    trades: [],
    learningOutcomes,
    caseSpine,
  },
});
assert.equal(sequence.duplicateZeroWeightCount, 2);
assert.equal(sequence.eligibleOpportunityCount, 0); // no executed attempts
assert.equal(sequence.actualAttemptCount, 0);
// Without replace links, 010 alone is not an indeterminate multi-plan lineage
assert.equal(
  sequence.indeterminateLineage.some((g) =>
    g.planIds.includes("PLAN-011") || g.planIds.includes("PLAN-012")
  ),
  false
);

// 8) No Reality/T0 invented on duplicates — only PLAN-010 has a window in fixture
assert.equal(realityWindows.every((w) => w.planId === "PLAN-010"), true);
assert.equal(plan011.outcome?.realizedResultR, 0);
assert.equal(plan012.outcome?.realizedResultR, 0);

console.log("test-duplicate-case-consolidation: PASS");
