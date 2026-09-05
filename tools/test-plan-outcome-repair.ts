/**
 * MXT 029 — plan-outcome correction (wrong UPL → Miss) with audit + LO re-sync.
 * Run: npx tsx tools/test-plan-outcome-repair.ts
 */
import assert from "node:assert/strict";
import { persistPlanOutcome } from "../lib/plan-outcome";
import { validatePlanOutcomeProposal } from "../lib/plan-outcome-validate";
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
import { getPlanById } from "../lib/plans";
import { getLearningOutcomeByPlanId } from "../lib/learning-outcome-store";
import type { TradePlan } from "../lib/plan-types";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";

function seedPlan(): TradePlan {
  const now = "2026-06-15T00:00:00.000Z";
  return {
    id: "PLAN-001",
    ticker: "TSLA",
    stockThesisId: "ST-TSLA-001",
    status: "failed",
    plannedEntry: 349,
    stopPrice: 320,
    targetPrice: 430,
    plannedRR: 2.79,
    createdAt: now,
    updatedAt: now,
  } as TradePlan;
}

function resetStores(seed: TradePlan[]) {
  __setPlansStoreForTests(createMemoryPlansStore(seed));
  __setLearningOutcomesStoreForTests(createMemoryLearningOutcomesStore([]));
  __setLearningOutcomeStoreForTests(null);
  __setObservationsStoreForTests(createMemoryObservationsStore([]));
}

async function main() {
  resetStores([seedPlan()]);

  const upl = await persistPlanOutcome({
    planId: "PLAN-001",
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
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
    evidenceRefs: [],
    uplContract: true,
  });
  assert.ok(!upl.errors?.length, upl.errors?.join("; "));
  assert.equal(upl.plan?.outcome?.outcomeKind, "unexecuted_plan_loss");
  assert.equal(upl.plan?.outcome?.recordKind ?? "original", "original");

  const blocked = await persistPlanOutcome({
    planId: "PLAN-001",
    status: "entry_not_triggered",
    outcomeKind: "missed_opportunity",
    tradeExecuted: false,
    entryTriggered: false,
    stopTriggered: false,
    targetTriggered: true,
    entryReached: false,
    stopReachedBeforeTarget: false,
    targetReachedBeforeStop: true,
    nonExecutionReason: "entry_not_reached",
    theoreticalResultR: 2.79,
    realizedResultR: 0,
    realizedPnL: 0,
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
    evidenceRefs: [],
    uplContract: true,
  });
  assert.ok(blocked.errors?.some((e) => /repairKind=corrected/i.test(e)));

  const validated = validatePlanOutcomeProposal({
    planId: "PLAN-001",
    outcomeKind: "missed_opportunity",
    entryReached: false,
    stopReachedBeforeTarget: false,
    targetReachedBeforeStop: true,
    nonExecutionReason: "entry_not_reached",
    repairKind: "corrected",
    repairNote: "Prior UPL was wrong; entry never reached in contemporaneous window.",
    evidenceRefs: ["human:chart-review"],
  });
  assert.equal(validated.ok, true, validated.ok ? "" : validated.errors.join("; "));
  if (!validated.ok) throw new Error("validate failed");

  const repaired = await persistPlanOutcome(validated.value);
  assert.ok(!repaired.errors?.length, repaired.errors?.join("; "));
  const plan = await getPlanById("PLAN-001");
  assert.equal(plan?.outcome?.outcomeKind, "missed_opportunity");
  assert.equal(plan?.outcome?.recordKind, "corrected");
  assert.ok(plan?.outcome?.correctionAudit?.length);
  assert.equal(
    (plan?.outcome?.correctionAudit?.at(-1)?.previous as { outcomeKind?: string })
      .outcomeKind,
    "unexecuted_plan_loss"
  );

  const lo = await getLearningOutcomeByPlanId("PLAN-001");
  assert.equal(lo?.kind, "missed_opportunity");

  const mechanics = buildMatrixMechanicsBrief();
  assert.match(mechanics, /repairKind=corrected/);

  __setPlansStoreForTests(null);
  console.log("test-plan-outcome-repair: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
