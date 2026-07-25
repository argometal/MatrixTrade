/**
 * CURSOR-MTA-PLAN-OUTCOME-LEARNING-001
 * Run: npm run test:plan-outcome-learning
 */
import assert from "node:assert/strict";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import { validatePlanOutcomeProposal } from "../lib/plan-outcome-validate";
import { computeLearningPlanAggregates } from "../lib/learning-plan-aggregates";
import {
  getAllowedApplyBlocksForNeedsAttentionTask,
  getNeedsAttentionSnapshotSupport,
} from "../lib/needs-attention-ai";
import { planNeedsStrategyReview } from "../lib/plan-helpers";
import { AUTOMATIC_EXECUTION_ENABLED } from "../lib/plan-outcome-types";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";
import type { MafExperiment } from "../lib/maf-types";
import { deriveLearningOutcomeKindFromPlan } from "../lib/learning-outcome";

assert.equal(AUTOMATIC_EXECUTION_ENABLED, false);

// ---------------------------------------------------------------------------
// Apply contract
// ---------------------------------------------------------------------------
{
  const sample = AI_BLOCK_SAMPLES["plan-outcome"];
  const parsed = parseTradingInboxPayload(sample as Record<string, unknown>);
  assert.ok(parsed);
  const v = validateProposalPayload(parsed!);
  assert.equal(v.ok, true, v.ok ? "" : (v as { errors: string[] }).errors.join("; "));
  const contract = buildApplySchemaContractText();
  assert.ok(contract.includes("plan-outcome"));
  assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("evaluate_expired_plan"), [
    "plan-outcome",
  ]);
  assert.equal(getNeedsAttentionSnapshotSupport("evaluate_expired_plan"), "SUPPORTED");
}

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------
{
  const bad = validatePlanOutcomeProposal({
    planId: "PLAN-001",
    status: "theoretical_loss",
    tradeExecuted: false,
    entryTriggered: false,
    stopTriggered: true,
    targetTriggered: false,
    theoreticalResultR: -1,
    realizedResultR: 0,
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
  });
  assert.equal(bad.ok, false);

  const realizedBad = validatePlanOutcomeProposal({
    planId: "PLAN-001",
    status: "theoretical_loss",
    tradeExecuted: false,
    entryTriggered: true,
    stopTriggered: true,
    targetTriggered: false,
    theoreticalResultR: -1,
    realizedResultR: -1,
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
  });
  assert.equal(realizedBad.ok, false);

  const ok = validatePlanOutcomeProposal({
    planId: "PLAN-001",
    status: "theoretical_loss",
    tradeExecuted: false,
    entryTriggered: true,
    stopTriggered: true,
    targetTriggered: false,
    theoreticalResultR: -1,
    realizedResultR: 0,
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
    notes: "Thesis failed; order not staged",
  });
  assert.equal(ok.ok, true);
}

// ---------------------------------------------------------------------------
// Aggregates A–E
// ---------------------------------------------------------------------------
{
  const basePlan = {
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
  } as TradePlan;

  // A — theoretical loss, no trade
  const planA: TradePlan = {
    ...basePlan,
    outcome: {
      planId: "PLAN-001",
      recordedAt: "2026-07-20T00:00:00.000Z",
      status: "theoretical_loss",
      tradeExecuted: false,
      entryTriggered: true,
      stopTriggered: true,
      targetTriggered: false,
      theoreticalResultR: -1,
      realizedResultR: 0,
      outcomeSource: "counterfactual_observation",
      evidenceStatus: "verified",
      evidenceRefs: [],
      updatedAt: "2026-07-20T00:00:00.000Z",
    },
  };
  assert.equal(deriveLearningOutcomeKindFromPlan(planA), "unexecuted_plan_loss");
  assert.equal(planNeedsStrategyReview(planA), false);

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
  const beforeR = computeLearningPlanAggregates({
    plans: [],
    trades: tradesBaseline,
    mafExperiments: [],
  }).realizedTradeR;

  const aggA = computeLearningPlanAggregates({
    plans: [planA],
    trades: tradesBaseline,
    mafExperiments: [],
  });
  assert.equal(aggA.theoreticalPlanLosses, 1);
  assert.equal(aggA.theoreticalPlanR, -1);
  assert.equal(aggA.triggeredPlansWithoutTrade, 1);
  assert.equal(aggA.realizedTradeR, beforeR);
  assert.equal(aggA.executionOmissionCount, 0, "no omission without MAF tag");
  assert.equal(aggA.thesisEvaluationCount, 0);

  // B — entry not triggered
  const planB: TradePlan = {
    ...basePlan,
    id: "PLAN-002",
    outcome: {
      planId: "PLAN-002",
      recordedAt: "2026-07-21T00:00:00.000Z",
      status: "entry_not_triggered",
      tradeExecuted: false,
      entryTriggered: false,
      stopTriggered: false,
      targetTriggered: false,
      theoreticalResultR: null,
      realizedResultR: 0,
      outcomeSource: "manual_review",
      evidenceStatus: "partial",
      evidenceRefs: [],
      updatedAt: "2026-07-21T00:00:00.000Z",
    },
  };
  const aggB = computeLearningPlanAggregates({
    plans: [planB],
    trades: [],
    mafExperiments: [],
  });
  assert.equal(aggB.untriggeredPlanCount, 1);
  assert.equal(aggB.theoreticalPlanLosses, 0);
  assert.equal(aggB.theoreticalPlanWins, 0);
  assert.equal(aggB.executionOmissionCount, 0);

  // C — real trade loss (realized R changes; no double count from plan)
  const tradeLoss: Trade = {
    id: "H011",
    ticker: "TEST",
    status: "closed",
    entry: 100,
    stop: 90,
    exit: 90,
    shares: 10,
    createdAt: "2026-06-01T00:00:00.000Z",
    closedAt: "2026-06-03T00:00:00.000Z",
  } as Trade;
  const planC: TradePlan = {
    ...basePlan,
    id: "PLAN-003",
    linkedTradeId: "H011",
    outcome: {
      planId: "PLAN-003",
      recordedAt: "2026-07-22T00:00:00.000Z",
      status: "theoretical_loss",
      tradeExecuted: true,
      entryTriggered: true,
      stopTriggered: true,
      targetTriggered: false,
      theoreticalResultR: -1,
      realizedResultR: -1,
      outcomeSource: "trade",
      evidenceStatus: "verified",
      evidenceRefs: [],
      updatedAt: "2026-07-22T00:00:00.000Z",
    },
  };
  const aggC = computeLearningPlanAggregates({
    plans: [planC],
    trades: [tradeLoss],
    mafExperiments: [],
  });
  assert.equal(aggC.theoreticalPlanLosses, 1);
  assert.ok(aggC.realizedTradeR < 0);
  assert.equal(aggC.triggeredPlansWithoutTrade, 0);

  // D — MAF thesis failure
  const maf: MafExperiment = {
    id: "MAF-TEST-001",
    planId: "PLAN-001",
    ticker: "TEST",
    status: "attributed",
    evidence: { fillStatus: "missed", sources: { plan: true } },
    attributions: [
      {
        component: "thesis_quality",
        classification: "failure",
        aiInterpretationConfidence: 80,
        reasoning: "Support 340–355 did not hold after trigger",
      },
      {
        component: "execution_quality",
        classification: "failure",
        tag: "approved-plan-not-staged",
        aiInterpretationConfidence: 70,
        reasoning: "Order was not staged",
      },
      {
        component: "trade_management_quality",
        classification: "not_applicable",
        aiInterpretationConfidence: 100,
        reasoning: "No fill",
      },
    ],
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    source: "attribution",
  };
  const aggD = computeLearningPlanAggregates({
    plans: [planA],
    trades: [],
    mafExperiments: [maf],
  });
  assert.equal(aggD.thesisEvaluationCount, 1);
  assert.equal(aggD.thesisFailureCount, 1);
  assert.equal(aggD.executionOmissionCount, 1);

  // E — plan metrics without MAF thesis
  const aggE = computeLearningPlanAggregates({
    plans: [planA],
    trades: [],
    mafExperiments: [],
  });
  assert.equal(aggE.evaluatedPlanCount, 1);
  assert.equal(aggE.thesisEvaluationCount, 0);
  assert.equal(aggE.thesisFailureCount, 0);
}

console.log("test-plan-outcome-learning-001: ok");
