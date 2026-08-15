/**
 * PROMPT 29-02 — expired_window plan outcome ontology.
 * Run: npm run test:plan-outcome-expired-window
 */
import assert from "node:assert/strict";
import {
  createMemoryPlansStore,
  __setPlansStoreForTests,
} from "../lib/plans-store";
import { __setLearningOutcomeStoreForTests } from "../lib/learning-outcome-store";
import {
  __setObservationsStoreForTests,
  createMemoryObservationsStore,
} from "../lib/observations-store";
import { persistPlanOutcome, applyPlanOutcomeProposal } from "../lib/plan-outcome";
import { validatePlanOutcomeProposal } from "../lib/plan-outcome-validate";
import { validateExpiredWindowEligibility } from "../lib/plan-outcome-derive";
import { deriveLearningOutcomeKindFromPlan } from "../lib/learning-outcome";
import { getLearningOutcomes } from "../lib/learning-outcome-store";
import { getObservations } from "../lib/observation-store";
import { getPlanById } from "../lib/plans";
import { planNeedsStrategyReview } from "../lib/plan-helpers";
import { buildPlanAttentionItems } from "../lib/plan-attention";
import {
  classifyNeedsAttentionTaskType,
  getNeedsAttentionCompletionCondition,
} from "../lib/needs-attention-ai";
import { computeScoutLearningAggregates } from "../lib/learning-scout-aggregates";
import { isActiveLinkedScoutPlan } from "../lib/scout-plan-repair";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { buildMafEvidence } from "../lib/maf-evidence";
import {
  EXPIRED_WINDOW_EXPLANATION,
  PLAN_OUTCOME_KIND_LABELS,
  PLAN_OUTCOME_KINDS,
} from "../lib/plan-outcome-types";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

const STOCK_FILE_ID = "ST-NFLX-001";

function baseExpiredPlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-002",
    ticker: "NFLX",
    stockThesisId: STOCK_FILE_ID,
    status: "expired",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 130,
    validUntil: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    ...overrides,
  };
}

function resetStores(seedPlans: TradePlan[] = []) {
  __setPlansStoreForTests(createMemoryPlansStore(seedPlans));
  __setLearningOutcomeStoreForTests([]);
  __setObservationsStoreForTests(createMemoryObservationsStore(), "memory");
}

async function main() {
  // ---------------------------------------------------------------------------
  // Contract + labels
  // ---------------------------------------------------------------------------
  assert.ok(PLAN_OUTCOME_KINDS.includes("expired_window"));
  assert.equal(
    PLAN_OUTCOME_KIND_LABELS.expired_window,
    "Execution window expired"
  );
  assert.match(EXPIRED_WINDOW_EXPLANATION, /Stock File and opportunity may remain/);
  assert.doesNotMatch(EXPIRED_WINDOW_EXPLANATION, /Opportunity expired|Missed trade|Plan failed/i);

  const contract = buildApplySchemaContractText();
  assert.ok(contract.includes("expired_window"));
  assert.ok(contract.includes("for unexecuted_plan_loss only"));

  // ---------------------------------------------------------------------------
  // Validation — minimal Apply JSON
  // ---------------------------------------------------------------------------
  const applyJson = {
    type: "plan-outcome",
    proposal: {
      planId: "PLAN-002",
      outcomeKind: "expired_window",
    },
  };
  const parsed = parseTradingInboxPayload(applyJson);
  assert.ok(parsed);
  const bridgeOk = validateProposalPayload(parsed!);
  assert.equal(
    bridgeOk.ok,
    true,
    bridgeOk.ok ? "" : (bridgeOk as { errors: string[] }).errors.join("; ")
  );

  const validated = validatePlanOutcomeProposal({
    planId: "PLAN-002",
    outcomeKind: "expired_window",
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error("expected ok");
  assert.equal(validated.value.outcomeKind, "expired_window");
  assert.equal(validated.value.tradeExecuted, false);
  assert.equal(validated.value.realizedResultR, 0);
  assert.equal(validated.value.theoreticalResultR, null);
  assert.equal(validated.value.entryReached, null);
  assert.equal(validated.value.nonExecutionReason, undefined);
  assert.equal(validated.value.strategyStillValid, true);

  // UPL fields not required — still valid when omitted
  assert.equal(
    validatePlanOutcomeProposal({
      planId: "PLAN-002",
      outcomeKind: "expired_window",
      // no entryReached / stop / target / nonExecutionReason
    }).ok,
    true
  );

  // Reject inventing counterfactual loss
  assert.equal(
    validatePlanOutcomeProposal({
      planId: "PLAN-002",
      outcomeKind: "expired_window",
      counterfactualR: -1,
    }).ok,
    false
  );

  // Existing UPL still requires event-order fields
  assert.equal(
    validatePlanOutcomeProposal({
      planId: "PLAN-001",
      outcomeKind: "unexecuted_plan_loss",
    }).ok,
    false
  );
  assert.equal(
    validatePlanOutcomeProposal({
      planId: "PLAN-001",
      outcomeKind: "unexecuted_plan_loss",
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      nonExecutionReason: "order_not_staged",
    }).ok,
    true
  );

  // Existing duplicate_creation unchanged
  assert.equal(
    validatePlanOutcomeProposal({
      planId: "PLAN-011",
      outcomeKind: "duplicate_creation",
    }).ok,
    true
  );

  // ---------------------------------------------------------------------------
  // Persist — expired plan, no trade, Stock File opportunity still active
  // ---------------------------------------------------------------------------
  const stockFileSnapshot: StockThesis = {
    id: STOCK_FILE_ID,
    ticker: "NFLX",
    status: "watching",
    currentHypothesis: "Pullback into zone",
    levels: { primaryZone: { low: 95, high: 105 } },
    riskRules: { minimumRR: 3 },
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  } as StockThesis;

  const beforeThesis = { ...stockFileSnapshot };
  resetStores([baseExpiredPlan()]);

  const beforeAttention = buildPlanAttentionItems([baseExpiredPlan()]);
  assert.ok(
    beforeAttention.some((a) => a.id === "plan-review-PLAN-002"),
    "Needs Attention evaluate_expired_plan open before outcome"
  );
  assert.equal(
    classifyNeedsAttentionTaskType("plan-review-PLAN-002"),
    "evaluate_expired_plan"
  );
  assert.match(
    getNeedsAttentionCompletionCondition("evaluate_expired_plan"),
    /recordedAt/
  );

  const elig = validateExpiredWindowEligibility(baseExpiredPlan(), {
    linkedTradeIds: [],
  });
  assert.equal(elig.ok, true);

  const result = await applyPlanOutcomeProposal({
    planId: "PLAN-002",
    outcomeKind: "expired_window",
  });
  assert.ok(!result.errors?.length, result.errors?.join("; "));
  assert.equal(result.learningSyncComplete, true);

  const plan = await getPlanById("PLAN-002");
  assert.ok(plan);
  assert.equal(plan!.status, "expired", "preserve plan status as expired");
  assert.ok(plan!.outcome?.recordedAt);
  assert.equal(plan!.outcome?.outcomeKind, "expired_window");
  assert.equal(plan!.outcome?.realizedResultR, 0);
  assert.equal(plan!.outcome?.realizedPnL, 0);
  assert.equal(plan!.outcome?.theoreticalResultR, null);
  assert.equal(plan!.outcome?.counterfactualDollarResult, null);
  assert.equal(plan!.outcome?.tradeExecuted, false);
  assert.equal(plan!.linkedTradeId, undefined);
  assert.equal(plan!.stockThesisId, STOCK_FILE_ID);
  assert.equal(planNeedsStrategyReview(plan!), false);

  // Needs Attention cleared after expired_window
  const afterAttention = buildPlanAttentionItems([plan!]);
  assert.ok(
    !afterAttention.some((a) => a.id === "plan-review-PLAN-002"),
    "evaluate_expired_plan closed when outcome.recordedAt exists"
  );

  // Learning Outcome = expired (not missed / cancelled / UPL)
  const los = await getLearningOutcomes();
  const lo = los.find((r) => r.planId === "PLAN-002");
  assert.ok(lo);
  assert.equal(lo!.kind, "expired");
  assert.notEqual(lo!.kind, "missed_opportunity");
  assert.notEqual(lo!.kind, "cancelled");
  assert.notEqual(lo!.kind, "executed_loss");
  assert.notEqual(lo!.kind, "unexecuted_plan_loss");
  assert.equal(lo!.realizedR, 0);
  assert.equal(lo!.tradeId, undefined);
  assert.ok(
    lo!.counterfactualR === undefined ||
      lo!.counterfactualR === null ||
      lo!.counterfactualR === 0
  );
  assert.equal(lo!.lifecycleStatus, "concluded");
  assert.equal(deriveLearningOutcomeKindFromPlan(plan!), "expired");

  // No counterfactual Observation required / created for expired_window
  const obs = await getObservations();
  assert.equal(
    obs.filter((o) => o.planId === "PLAN-002").length,
    0,
    "no OBS for expired_window"
  );

  // Metrics: no missed increment; no UPL counterfactual −1
  const scout = computeScoutLearningAggregates({
    learningOutcomes: los,
    plans: [plan!],
  });
  assert.equal(scout.unexecutedPlanLossCount, 0);
  assert.equal(scout.counterfactualScoutR, 0);
  assert.equal(
    los.filter((r) => r.kind === "missed_opportunity").length,
    0
  );

  // MAF fill status must not be "missed" for expired_window
  const maf = buildMafEvidence({ plan: plan! });
  assert.equal(maf.fillStatus, "unknown");

  // Stock File unchanged (snapshot equality — we did not mutate thesis)
  assert.deepEqual(stockFileSnapshot, beforeThesis);
  assert.equal(stockFileSnapshot.status, "watching");
  assert.equal(stockFileSnapshot.id, STOCK_FILE_ID);

  // New Scout Plan can be created on same Stock File (expired is not active)
  assert.equal(
    isActiveLinkedScoutPlan(plan!, STOCK_FILE_ID),
    false,
    "expired plan is not an active linked scout"
  );

  // ---------------------------------------------------------------------------
  // Reject expired_window when Trade exists
  // ---------------------------------------------------------------------------
  resetStores([
    baseExpiredPlan({
      id: "PLAN-003",
      linkedTradeId: "T-001",
    }),
  ]);
  const blocked = await persistPlanOutcome({
    planId: "PLAN-003",
    status: "entry_not_triggered",
    outcomeKind: "expired_window",
    tradeExecuted: false,
    entryTriggered: null,
    stopTriggered: null,
    targetTriggered: null,
    theoreticalResultR: null,
    realizedResultR: 0,
    realizedPnL: 0,
    outcomeSource: "manual_review",
    evidenceStatus: "partial",
    uplContract: true,
  });
  assert.ok(blocked.errors?.length);

  // ---------------------------------------------------------------------------
  // Do not auto-mutate historical expired plans without Apply
  // ---------------------------------------------------------------------------
  resetStores([baseExpiredPlan({ id: "PLAN-LEGACY" })]);
  const legacy = await getPlanById("PLAN-LEGACY");
  assert.equal(legacy?.outcome, undefined);
  assert.equal(planNeedsStrategyReview(legacy!), true);

  __setPlansStoreForTests(null);
  __setLearningOutcomeStoreForTests(null);
  __setObservationsStoreForTests(null, null);

  console.log("test-plan-outcome-expired-window: ok");
  console.log(
    "Apply JSON accepted:",
    JSON.stringify(
      {
        type: "plan-outcome",
        proposal: { planId: "PLAN-002", outcomeKind: "expired_window" },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
