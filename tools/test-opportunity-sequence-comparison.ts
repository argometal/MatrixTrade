import assert from "node:assert/strict";
import { computeOpportunitySequenceComparison } from "../lib/opportunity-sequence-comparison";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";

const plans: TradePlan[] = [
  {
    id: "PLAN-A1",
    ticker: "TSLA",
    stockThesisId: "ST-TSLA-001",
    playbookId: "pb-trend",
    status: "failed",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 95,
    targetPrice: 115,
    plannedRR: 3,
    supportLevel: 99,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "PLAN-A2",
    ticker: "TSLA",
    stockThesisId: "ST-TSLA-001",
    playbookId: "pb-trend",
    status: "failed",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 95,
    targetPrice: 115,
    plannedRR: 3,
    replacesPlanId: "PLAN-A1",
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: "PLAN-A3",
    ticker: "TSLA",
    stockThesisId: "ST-TSLA-001",
    playbookId: "pb-trend",
    status: "failed",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 98,
    stopPrice: 93,
    targetPrice: 116,
    plannedRR: 3.6,
    replacesPlanId: "PLAN-A2",
    familyBAssessment: {
      state: "preferred_entry_available",
      trendIntegrity: "intact",
      extension: "moderate",
      pullbackQuality: "preferred",
      participationCase: "preferred",
      evidenceFor: [],
      evidenceAgainst: [],
      unresolved: [],
    },
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "PLAN-B1",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    playbookId: "pb-growth",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    plannedRR: 5.6,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "PLAN-B2",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    playbookId: "pb-growth",
    status: "failed",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 65,
    stopPrice: 60,
    targetPrice: 90,
    plannedRR: 5,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "PLAN-DUP",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    playbookId: "pb-growth",
    status: "failed",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 65,
    stopPrice: 60,
    targetPrice: 90,
    plannedRR: 5,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: "PLAN-C1",
    ticker: "AMZN",
    stockThesisId: "ST-AMZN-001",
    playbookId: "pb-mean",
    status: "failed",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 200,
    stopPrice: 190,
    targetPrice: 230,
    plannedRR: 3,
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
  },
];

plans[0]!.replacedByPlanId = "PLAN-A2";
plans[1]!.replacedByPlanId = "PLAN-A3";

const trades: Trade[] = [
  {
    id: "H-A1",
    ticker: "TSLA",
    planId: "PLAN-A1",
    entry: 100,
    stop: 95,
    shares: 10,
    status: "closed",
    createdAt: "2026-09-01T10:00:00.000Z",
    openedAt: "2026-09-01T10:00:00.000Z",
    closedAt: "2026-09-01T15:00:00.000Z",
    riskRewardActual: -1,
    playbookId: "pb-trend",
  },
  {
    id: "H-A2",
    ticker: "TSLA",
    planId: "PLAN-A2",
    entry: 100,
    stop: 95,
    shares: 10,
    status: "closed",
    createdAt: "2026-09-02T10:00:00.000Z",
    openedAt: "2026-09-02T10:00:00.000Z",
    closedAt: "2026-09-02T15:00:00.000Z",
    riskRewardActual: -1,
    playbookId: "pb-trend",
  },
  {
    id: "H-A3",
    ticker: "TSLA",
    planId: "PLAN-A3",
    entry: 98,
    stop: 93,
    shares: 10,
    status: "closed",
    createdAt: "2026-09-03T10:00:00.000Z",
    openedAt: "2026-09-03T10:00:00.000Z",
    closedAt: "2026-09-03T15:00:00.000Z",
    riskRewardActual: 3,
    playbookId: "pb-trend",
  },
  {
    id: "H-C1",
    ticker: "AMZN",
    planId: "PLAN-C1",
    entry: 200,
    stop: 190,
    shares: 10,
    status: "closed",
    createdAt: "2026-09-05T10:00:00.000Z",
    openedAt: "2026-09-05T10:00:00.000Z",
    closedAt: "2026-09-05T15:00:00.000Z",
    riskRewardActual: 2,
    playbookId: "pb-mean",
  },
];

const learningOutcomes: LearningOutcome[] = [
  {
    id: "LO-DUP",
    kind: "duplicate_creation",
    ticker: "NFLX",
    planId: "PLAN-DUP",
    realizedR: 0,
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    excludedFromMetrics: true,
  },
];

const caseSpine: InsightsCaseRow[] = plans.map((plan) => ({
  planId: plan.id,
  caseId: plan.id,
  ticker: plan.ticker,
  date: plan.createdAt,
  playbookId: plan.playbookId ?? null,
  stockThesisId: plan.stockThesisId ?? null,
  caseOrigin: "modern",
  participation: "entry" as const,
  verdict: "go",
  family: "A",
  noEntryDiagnosis: null,
  equationId: `EQ-${plan.id}`,
  decisionQuality: "supported",
  executionQuality: "respected",
  reality: "condition_met",
  outcomeLabel: null,
  loKind: null,
  realizedR: null,
  realizedPnL: null,
  counterfactualR: null,
  t0Available: true,
  lifecycle: {
    status: "COMPLETE",
    summary: "",
    evaluativeCompleteness: "COMPLETE",
    blockingLabels: [],
    requirements: [],
  },
  missingInputs: [],
  diagnosisReason: "fixture",
  evidenceSummary: "",
  caseHref: `/mxt/scout/case?plan=${plan.id}`,
  diagnosis: {
    planId: plan.id,
    classification: { kind: "entry_family", value: "A" },
    equationId: `EQ-${plan.id}`,
    inputsUsed: [],
    missingInputs: [],
    reason: "fixture",
  },
}));

const view = computeOpportunitySequenceComparison({
  source: {
    plans,
    trades,
    learningOutcomes,
    caseSpine,
  },
});

assert.equal(view.eligibleOpportunityCount, 2);
assert.equal(view.actualAttemptCount, 4);
assert.equal(view.multiAttemptOpportunityCount, 1);
assert.equal(view.duplicateZeroWeightCount, 1);
assert.equal(view.indeterminateLineageCount, 1);
assert.equal(view.researchUniverse.n, 2);
assert.equal(view.researchUniverse.unitOfAnalysis, "opportunity_sequence_with_trades");
assert.equal(view.researchUniverse.claimLevel, "descriptive");

const tsla = view.rows.find((row) => row.opportunityKey === "PLAN-A1");
assert.ok(tsla);
assert.equal(tsla.actualAttemptCount, 3);
assert.equal(tsla.cumulativeActualRealizedR, 1);
assert.equal(tsla.sameGeometryAttemptCount, 1);
assert.equal(tsla.changedGeometryAttemptCount, 1);
assert.equal(tsla.supportEvidenceAvailable, true);
assert.equal(tsla.trendEvidenceAvailable, true);
assert.equal(tsla.attempts[0]?.geometryRelationToPrior, "first_attempt");
assert.equal(tsla.attempts[1]?.geometryRelationToPrior, "same_geometry");
assert.equal(tsla.attempts[2]?.geometryRelationToPrior, "changed_geometry");
assert.equal(tsla.attempts[0]?.cumulativeRealizedR, -1);
assert.equal(tsla.attempts[1]?.cumulativeRealizedR, -2);
assert.equal(tsla.attempts[2]?.cumulativeRealizedR, 1);

const amzn = view.rows.find((row) => row.opportunityKey === "PLAN-C1");
assert.ok(amzn);
assert.equal(amzn.actualAttemptCount, 1);
assert.equal(amzn.cumulativeActualRealizedR, 2);
assert.equal(amzn.attempts[0]?.geometryRelationToPrior, "first_attempt");

assert.equal(view.indeterminateLineage[0]?.ticker, "NFLX");
assert.deepEqual(view.indeterminateLineage[0]?.planIds, ["PLAN-B1", "PLAN-B2"]);

console.log("test-opportunity-sequence-comparison: PASS");
