/**
 * CURSOR-MTA-15-07 — missed_opportunity distinct from unexecuted_plan_loss
 * Run: npm run test:plan-outcome-miss
 */
import assert from "node:assert/strict";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import { validatePlanOutcomeProposal } from "../lib/plan-outcome-validate";
import {
  deriveMissedOpportunityServerValues,
  validateMissedOpportunityEligibility,
  validateUnexecutedPlanLossEligibility,
} from "../lib/plan-outcome-derive";
import { persistPlanOutcome } from "../lib/plan-outcome";
import { deriveLearningOutcomeKindFromPlan } from "../lib/learning-outcome";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import {
  __setLearningOutcomesStoreForTests,
  createMemoryLearningOutcomesStore,
} from "../lib/learning-outcomes-store";
import {
  __setObservationsStoreForTests,
  createMemoryObservationsStore,
} from "../lib/observations-store";
import { __setLearningOutcomeStoreForTests } from "../lib/learning-outcome-store";
import type { TradePlan } from "../lib/plan-types";
import { getPlanById } from "../lib/plans";
import { getLearningOutcomeByPlanId } from "../lib/learning-outcome-store";
import { getObservationByPlanId } from "../lib/observation-store";
import { buildProposalSketch } from "../lib/proposal-sketch";
import { PLAN_OUTCOME_KINDS, NON_EXECUTION_REASONS } from "../lib/plan-outcome-types";

const VALID_MISS = {
  planId: "PLAN-003",
  outcomeKind: "missed_opportunity",
  entryReached: false,
  stopReachedBeforeTarget: false,
  targetReachedBeforeStop: true,
  nonExecutionReason: "entry_not_reached",
  notes:
    "MSFT entry 350 never reached after plan create; price later exceeded target 450 (~511). No fill. No chase.",
};

const VALID_UPL = {
  planId: "PLAN-001",
  outcomeKind: "unexecuted_plan_loss",
  entryReached: true,
  stopReachedBeforeTarget: true,
  targetReachedBeforeStop: false,
  nonExecutionReason: "order_not_staged",
};

function msftPlan(overrides: Partial<TradePlan> = {}): TradePlan {
  const now = "2026-07-12T00:00:00.000Z";
  return {
    id: "PLAN-003",
    ticker: "MSFT",
    stockThesisId: "ST-MSFT-001",
    status: "watching",
    analysisTimeframes: ["1W", "1D", "1H", "15m", "5m"],
    entryTimeframe: "5m",
    plannedEntry: 350,
    stopPrice: 334,
    targetPrice: 450,
    plannedRR: 6.25,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function resetStores(seed: TradePlan[]) {
  __setPlansStoreForTests(createMemoryPlansStore(seed));
  __setLearningOutcomesStoreForTests(createMemoryLearningOutcomesStore([]));
  __setLearningOutcomeStoreForTests(null);
  __setObservationsStoreForTests(createMemoryObservationsStore([]));
}

async function main() {
  assert.ok(PLAN_OUTCOME_KINDS.includes("missed_opportunity"));
  assert.ok(NON_EXECUTION_REASONS.includes("entry_not_reached"));

  const contract = buildApplySchemaContractText();
  assert.ok(contract.includes("missed_opportunity"));
  assert.ok(contract.includes("entry_not_reached"));

  // Valid miss proposal
  {
    const ok = validatePlanOutcomeProposal(VALID_MISS);
    assert.equal(ok.ok, true, ok.ok ? "" : (ok as { errors: string[] }).errors.join("; "));
    if (!ok.ok) throw new Error("expected ok");
    assert.equal(ok.value.outcomeKind, "missed_opportunity");
    assert.equal(ok.value.entryReached, false);
    assert.equal(ok.value.targetReachedBeforeStop, true);
    assert.equal(ok.value.stopReachedBeforeTarget, false);
    assert.equal(ok.value.nonExecutionReason, "entry_not_reached");
    assert.equal(ok.value.tradeExecuted, false);
    assert.equal(ok.value.realizedResultR, 0);
    assert.equal(ok.value.status, "entry_not_triggered");
  }

  // UPL must still reject miss geometry
  {
    const bad = validatePlanOutcomeProposal({
      ...VALID_UPL,
      entryReached: false,
      stopReachedBeforeTarget: false,
      targetReachedBeforeStop: true,
    });
    assert.equal(bad.ok, false);
    assert.ok(
      (bad as { errors: string[] }).errors.some((e) =>
        e.includes("unexecuted_plan_loss requires entryReached: true")
      ),
      (bad as { errors: string[] }).errors.join("; ")
    );
  }

  // Miss must reject UPL geometry
  {
    const bad = validatePlanOutcomeProposal({
      ...VALID_MISS,
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      nonExecutionReason: "entry_not_reached",
    });
    assert.equal(bad.ok, false);
    assert.ok(
      (bad as { errors: string[] }).errors.some((e) =>
        e.includes("missed_opportunity requires entryReached: false")
      )
    );
  }

  // Miss rejects execution-failure reasons
  {
    const bad = validatePlanOutcomeProposal({
      ...VALID_MISS,
      nonExecutionReason: "order_not_staged",
    });
    assert.equal(bad.ok, false);
    assert.ok(
      (bad as { errors: string[] }).errors.some((e) =>
        e.includes("entry_not_reached")
      )
    );
  }

  // UPL rejects entry_not_reached
  {
    const bad = validatePlanOutcomeProposal({
      ...VALID_UPL,
      nonExecutionReason: "entry_not_reached",
    });
    assert.equal(bad.ok, false);
  }

  // Derive + eligibility for MSFT geometry (350→450 / stop 334 → 6.25R)
  {
    const plan = msftPlan();
    const derived = deriveMissedOpportunityServerValues(plan);
    assert.ok(!("error" in derived));
    if ("error" in derived) throw new Error(String(derived.error));
    assert.equal(derived.realizedR, 0);
    assert.equal(derived.counterfactualR, 6.25);

    const elig = validateMissedOpportunityEligibility(plan, {
      entryReached: false,
      stopReachedBeforeTarget: false,
      targetReachedBeforeStop: true,
      nonExecutionReason: "entry_not_reached",
    });
    assert.equal(elig.ok, true);

    const uplReject = validateUnexecutedPlanLossEligibility(plan, {
      entryReached: false,
      stopReachedBeforeTarget: false,
      targetReachedBeforeStop: true,
      nonExecutionReason: "order_not_staged",
    });
    assert.equal(uplReject.ok, false);
  }

  // Persist + LO + OBS for PLAN-003
  {
    resetStores([msftPlan()]);
    const parsed = validatePlanOutcomeProposal(VALID_MISS);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) throw new Error("parse");
    const result = await persistPlanOutcome(parsed.value);
    assert.equal(result.errors, undefined, result.errors?.join("; "));
    assert.equal(result.learningSyncComplete, true);
    assert.equal(result.plan?.status, "failed");
    assert.equal(result.plan?.outcome?.outcomeKind, "missed_opportunity");
    assert.equal(result.plan?.outcome?.entryReached, false);
    assert.equal(result.plan?.outcome?.targetReachedBeforeStop, true);
    assert.equal(result.plan?.outcome?.stopReachedBeforeTarget, false);
    assert.equal(result.plan?.outcome?.realizedResultR, 0);
    assert.equal(result.plan?.outcome?.theoreticalResultR, 6.25);
    assert.equal(result.plan?.plannedEntry, 350);
    assert.equal(result.plan?.stopPrice, 334);
    assert.equal(result.plan?.targetPrice, 450);
    assert.equal(result.plan?.linkedTradeId, undefined);

    const lo = await getLearningOutcomeByPlanId("PLAN-003");
    assert.equal(lo?.kind, "missed_opportunity");
    assert.equal(lo?.tradeId, undefined);
    assert.equal(lo?.realizedR, 0);
    assert.equal(lo?.counterfactualR, 6.25);
    assert.equal(lo?.entryReached, false);
    assert.equal(lo?.nonExecutionReason, "entry_not_reached");
    assert.equal(lo?.lifecycleStatus, "observing");

    const obs = await getObservationByPlanId("PLAN-003");
    assert.ok(obs);
    assert.equal(obs?.entryTriggered, false);
    assert.equal(obs?.targetTriggered, true);
    assert.notEqual(obs?.learningUnitKind, "triggered_unexecuted_plan");

    assert.equal(deriveLearningOutcomeKindFromPlan((await getPlanById("PLAN-003"))!), "missed_opportunity");
  }

  // Collision / overwrite: re-apply same kind is idempotent; different kind rejected
  {
    resetStores([
      msftPlan({
        outcome: {
          planId: "PLAN-003",
          recordedAt: "2026-08-15T00:00:00.000Z",
          outcomeKind: "missed_opportunity",
          status: "entry_not_triggered",
          tradeExecuted: false,
          entryTriggered: false,
          stopTriggered: false,
          targetTriggered: true,
          entryReached: false,
          stopReachedBeforeTarget: false,
          targetReachedBeforeStop: true,
          nonExecutionReason: "entry_not_reached",
          theoreticalResultR: 6.25,
          realizedResultR: 0,
          outcomeSource: "counterfactual_observation",
          evidenceStatus: "verified",
          evidenceRefs: [],
          updatedAt: "2026-08-15T00:00:00.000Z",
          learningSyncStatus: "complete",
        },
        status: "failed",
      }),
    ]);
    // Ensure LO exists for idempotent sync path
    const { upsertLearningOutcomeFromPlan } = await import("../lib/learning-outcome");
    await upsertLearningOutcomeFromPlan((await getPlanById("PLAN-003"))!);

    const again = await persistPlanOutcome(
      (validatePlanOutcomeProposal(VALID_MISS) as { ok: true; value: never }).value
    );
    // May partial-fail sync if OBS missing — still must not change geometry / create trade
    const plan = await getPlanById("PLAN-003");
    assert.equal(plan?.outcome?.outcomeKind, "missed_opportunity");
    assert.equal(plan?.plannedEntry, 350);
    assert.equal(plan?.linkedTradeId, undefined);

    const uplOntoMiss = await persistPlanOutcome(
      (validatePlanOutcomeProposal({
        ...VALID_UPL,
        planId: "PLAN-003",
      }) as { ok: true; value: never }).value
    );
    assert.ok(uplOntoMiss.errors?.length);
    assert.equal((await getPlanById("PLAN-003"))?.outcome?.outcomeKind, "missed_opportunity");
    void again;
  }

  // Apply block parses via bridge
  {
    const block = {
      type: "plan-outcome",
      source: "ai-block",
      proposal: VALID_MISS,
    };
    const parsed = parseTradingInboxPayload(block);
    assert.ok(parsed);
    const v = validateProposalPayload(parsed!);
    assert.equal(v.ok, true, v.ok ? "" : (v as { errors: string[] }).errors.join("; "));
    const sketch = buildProposalSketch(parsed!);
    assert.ok(sketch.fields.some((f) => f.value === "+planned R" || f.label === "Kind"));
  }

  __setPlansStoreForTests(null);
  __setLearningOutcomesStoreForTests(null);
  __setObservationsStoreForTests(null);

  console.log("test-plan-outcome-miss: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
