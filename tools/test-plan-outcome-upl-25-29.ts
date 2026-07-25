/**
 * CURSOR-MTA-PLAN-OUTCOME-UPL-25-29
 * Run: npm run test:plan-outcome-upl
 */
import assert from "node:assert/strict";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import { validatePlanOutcomeProposal } from "../lib/plan-outcome-validate";
import {
  deriveUnexecutedPlanLossServerValues,
  validateUnexecutedPlanLossEligibility,
} from "../lib/plan-outcome-derive";
import { computeScoutLearningAggregates } from "../lib/learning-scout-aggregates";
import { computeLearningPlanAggregates } from "../lib/learning-plan-aggregates";
import {
  getAllowedApplyBlocksForNeedsAttentionTask,
  getNeedsAttentionSnapshotSupport,
} from "../lib/needs-attention-ai";
import { planNeedsStrategyReview } from "../lib/plan-helpers";
import { deriveLearningOutcomeKindFromPlan } from "../lib/learning-outcome";
import type { TradePlan } from "../lib/plan-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { Trade } from "../lib/types";
import type { MafExperiment } from "../lib/maf-types";
import { buildProposalSketch } from "../lib/proposal-sketch";

const VALID_UPL = {
  planId: "PLAN-001",
  outcomeKind: "unexecuted_plan_loss",
  entryReached: true,
  stopReachedBeforeTarget: true,
  targetReachedBeforeStop: false,
  nonExecutionReason: "order_not_staged",
  notes: "Entry reached; stop before target; order not staged.",
};

// ---------------------------------------------------------------------------
// Contract wired
// ---------------------------------------------------------------------------
{
  const sample = AI_BLOCK_SAMPLES["plan-outcome"] as {
    proposal: { outcomeKind?: string };
  };
  assert.equal(sample.proposal.outcomeKind, "unexecuted_plan_loss");
  const parsed = parseTradingInboxPayload(
    AI_BLOCK_SAMPLES["plan-outcome"] as Record<string, unknown>
  );
  assert.ok(parsed);
  const v = validateProposalPayload(parsed!);
  assert.equal(v.ok, true, v.ok ? "" : (v as { errors: string[] }).errors.join("; "));
  const contract = buildApplySchemaContractText();
  assert.ok(contract.includes("plan-outcome"));
  assert.ok(contract.includes("counterfactualR is server-derived"));
  assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("evaluate_expired_plan"), [
    "plan-outcome",
  ]);
  assert.equal(getNeedsAttentionSnapshotSupport("evaluate_expired_plan"), "SUPPORTED");
  const sketch = buildProposalSketch(parsed!);
  assert.ok(sketch.fields.some((f) => f.label === "Counterfactual R (server)"));
}

// ---------------------------------------------------------------------------
// A — Valid unexecuted plan loss (validation + derivation + metrics)
// ---------------------------------------------------------------------------
{
  const ok = validatePlanOutcomeProposal(VALID_UPL);
  assert.equal(ok.ok, true);
  if (!ok.ok) throw new Error("expected ok");
  assert.equal(ok.value.outcomeKind, "unexecuted_plan_loss");
  assert.equal(ok.value.theoreticalResultR, -1);
  assert.equal(ok.value.realizedResultR, 0);
  assert.equal(ok.value.realizedPnL, 0);
  assert.equal(ok.value.tradeExecuted, false);

  // AI-supplied counterfactualR ignored / rejected if wrong
  const aiR = validatePlanOutcomeProposal({
    ...VALID_UPL,
    counterfactualR: -2,
  });
  assert.equal(aiR.ok, false);

  const plan: TradePlan = {
    id: "PLAN-001",
    ticker: "TEST",
    status: "expired",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 348,
    stopPrice: 320,
    targetPrice: 430,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    outcome: {
      planId: "PLAN-001",
      recordedAt: "2026-07-20T00:00:00.000Z",
      status: "theoretical_loss",
      outcomeKind: "unexecuted_plan_loss",
      tradeExecuted: false,
      entryTriggered: true,
      stopTriggered: true,
      targetTriggered: false,
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      nonExecutionReason: "order_not_staged",
      theoreticalResultR: -1,
      realizedResultR: 0,
      realizedPnL: 0,
      counterfactualDollarResult: null,
      outcomeSource: "counterfactual_observation",
      evidenceStatus: "verified",
      evidenceRefs: [],
      updatedAt: "2026-07-20T00:00:00.000Z",
    },
  };

  assert.equal(deriveLearningOutcomeKindFromPlan(plan), "unexecuted_plan_loss");
  assert.equal(planNeedsStrategyReview(plan), false);

  const elig = validateUnexecutedPlanLossEligibility(plan, {
    entryReached: true,
    stopReachedBeforeTarget: true,
    targetReachedBeforeStop: false,
    nonExecutionReason: "order_not_staged",
  });
  assert.equal(elig.ok, true);

  const lo: LearningOutcome = {
    id: "LO-TEST-001",
    kind: "unexecuted_plan_loss",
    ticker: "TEST",
    planId: "PLAN-001",
    realizedR: 0,
    realizedPnL: 0,
    counterfactualR: -1,
    counterfactualDollarResult: null,
    entryReached: true,
    stopReachedBeforeTarget: true,
    targetReachedBeforeStop: false,
    nonExecutionReason: "order_not_staged",
    lifecycleStatus: "concluded",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    source: "plan_outcome",
  };

  const tradesBaseline: Trade[] = [
    {
      id: "H010",
      ticker: "OTHER",
      status: "closed",
      entry: 100,
      stop: 90,
      exit: 95,
      shares: 1,
      createdAt: "2026-06-01T00:00:00.000Z",
      closedAt: "2026-06-02T00:00:00.000Z",
    } as Trade,
  ];
  const beforeTradeR = computeLearningPlanAggregates({
    plans: [],
    trades: tradesBaseline,
    mafExperiments: [],
  }).realizedTradeR;

  const scout = computeScoutLearningAggregates({
    learningOutcomes: [lo],
    plans: [plan],
    mafExperiments: [],
  });
  assert.equal(scout.unexecutedPlanLossCount, 1);
  assert.equal(scout.counterfactualScoutR, -1);
  assert.equal(scout.triggeredPlansWithoutTrade, 1);
  assert.equal(scout.evaluatedScoutCount, 1);
  assert.equal(scout.thesisFailureCount, 0);

  const afterTradeR = computeLearningPlanAggregates({
    plans: [plan],
    trades: tradesBaseline,
    mafExperiments: [],
  }).realizedTradeR;
  assert.equal(afterTradeR, beforeTradeR);
}

// ---------------------------------------------------------------------------
// B — Missing entry evidence
// ---------------------------------------------------------------------------
{
  const bad = validatePlanOutcomeProposal({
    ...VALID_UPL,
    entryReached: false,
  });
  assert.equal(bad.ok, false);
}

// ---------------------------------------------------------------------------
// C — Contradictory event order
// ---------------------------------------------------------------------------
{
  const bad = validatePlanOutcomeProposal({
    ...VALID_UPL,
    stopReachedBeforeTarget: false,
  });
  assert.equal(bad.ok, false);

  const bad2 = validatePlanOutcomeProposal({
    ...VALID_UPL,
    targetReachedBeforeStop: true,
  });
  assert.equal(bad2.ok, false);
}

// ---------------------------------------------------------------------------
// D — Existing Trade linked
// ---------------------------------------------------------------------------
{
  const plan: TradePlan = {
    id: "PLAN-001",
    ticker: "TEST",
    status: "expired",
    linkedTradeId: "H001",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 348,
    stopPrice: 320,
    targetPrice: 430,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
  const elig = validateUnexecutedPlanLossEligibility(
    plan,
    {
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      nonExecutionReason: "order_not_staged",
    },
    { linkedTradeIds: ["H001"] }
  );
  assert.equal(elig.ok, false);
}

// ---------------------------------------------------------------------------
// E — Missing authorized risk amount → dollar unavailable
// ---------------------------------------------------------------------------
{
  const plan: TradePlan = {
    id: "PLAN-001",
    ticker: "TEST",
    status: "expired",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 348,
    stopPrice: 320,
    targetPrice: 430,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
  const v = deriveUnexecutedPlanLossServerValues(plan);
  assert.equal(v.realizedR, 0);
  assert.equal(v.realizedPnL, 0);
  assert.equal(v.counterfactualR, -1);
  assert.equal(v.counterfactualDollarResult, null);

  const withRisk: TradePlan = {
    ...plan,
    layeredEntry: {
      status: "active",
      sizingMode: "risk_percent",
      authorizedRiskAmount: 250,
      limits: [],
      executionMethod: "layered_limits",
      noChase: true,
    } as NonNullable<TradePlan["layeredEntry"]>,
  };
  const v2 = deriveUnexecutedPlanLossServerValues(withRisk);
  assert.equal(v2.counterfactualDollarResult, -250);
}

// ---------------------------------------------------------------------------
// F — Duplicate Apply (idempotent validation of same shape) + no double LO metrics
// ---------------------------------------------------------------------------
{
  const lo: LearningOutcome = {
    id: "LO-TEST-001",
    kind: "unexecuted_plan_loss",
    ticker: "TEST",
    planId: "PLAN-001",
    realizedR: 0,
    counterfactualR: -1,
    entryReached: true,
    lifecycleStatus: "concluded",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    source: "plan_outcome",
  };
  // Single LO row even if Apply re-accepted — metrics count LOs once.
  const scout = computeScoutLearningAggregates({
    learningOutcomes: [lo],
    mafExperiments: [],
  });
  assert.equal(scout.unexecutedPlanLossCount, 1);
  assert.equal(scout.counterfactualScoutR, -1);
}

// ---------------------------------------------------------------------------
// G — MAF not yet accepted → thesis metrics unchanged
// ---------------------------------------------------------------------------
{
  const lo: LearningOutcome = {
    id: "LO-TEST-002",
    kind: "unexecuted_plan_loss",
    ticker: "TEST",
    planId: "PLAN-002",
    counterfactualR: -1,
    entryReached: true,
    lifecycleStatus: "concluded",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    source: "plan_outcome",
  };
  const scout = computeScoutLearningAggregates({
    learningOutcomes: [lo],
    mafExperiments: [],
  });
  assert.equal(scout.unexecutedPlanLossCount, 1);
  assert.equal(scout.thesisEvaluationCount, 0);
  assert.equal(scout.thesisFailureCount, 0);
}

// ---------------------------------------------------------------------------
// H — Accepted MAF thesis failure later
// ---------------------------------------------------------------------------
{
  const lo: LearningOutcome = {
    id: "LO-TEST-003",
    kind: "unexecuted_plan_loss",
    ticker: "TEST",
    planId: "PLAN-003",
    counterfactualR: -1,
    entryReached: true,
    lifecycleStatus: "concluded",
    mafExperimentId: "MAF-TEST-001",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    source: "plan_outcome",
  };
  const maf: MafExperiment = {
    id: "MAF-TEST-001",
    ticker: "TEST",
    planId: "PLAN-003",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    attributions: [
      {
        component: "thesis_quality",
        classification: "failure",
        aiInterpretationConfidence: 80,
        reasoning: "Support thesis failed after entry",
      },
    ],
  } as MafExperiment;
  const scout = computeScoutLearningAggregates({
    learningOutcomes: [lo],
    mafExperiments: [maf],
  });
  assert.equal(scout.unexecutedPlanLossCount, 1);
  assert.equal(scout.counterfactualScoutR, -1);
  assert.equal(scout.thesisEvaluationCount, 1);
  assert.equal(scout.thesisFailureCount, 1);
}

// ---------------------------------------------------------------------------
// I — Duplicate creation excluded from metrics
// ---------------------------------------------------------------------------
{
  const dup = validatePlanOutcomeProposal({
    planId: "PLAN-011",
    outcomeKind: "duplicate_creation",
    notes: "Clone of PLAN-010",
  });
  assert.equal(dup.ok, true);

  const lo: LearningOutcome = {
    id: "LO-TEST-011",
    kind: "duplicate_creation",
    ticker: "TEST",
    planId: "PLAN-011",
    excludedFromMetrics: true,
    lifecycleStatus: "concluded",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    source: "plan_outcome",
  };
  const scout = computeScoutLearningAggregates({
    learningOutcomes: [lo],
    mafExperiments: [],
  });
  assert.equal(scout.evaluatedScoutCount, 0);
  assert.equal(scout.unexecutedPlanLossCount, 0);
  assert.equal(scout.counterfactualScoutR, 0);
}

// Nonzero realized without trade rejected
{
  const bad = validatePlanOutcomeProposal({
    ...VALID_UPL,
    realizedR: -1,
  });
  assert.equal(bad.ok, false);
}

console.log("test-plan-outcome-upl-25-29: ok");
