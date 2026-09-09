import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCaseSnapshotModel } from "../lib/case-snapshot";
import { buildInsightsCaseSpine } from "../lib/insights-case-spine";
import { __setImprovementHypothesesStoreForTests } from "../lib/improvement-hypotheses-store";
import { __setLearningOutcomeStoreForTests, getLearningOutcomeByPlanId } from "../lib/learning-outcome-store";
import { __setMafExperimentsStoreForTests } from "../lib/maf-experiments-store";
import { buildMarketRealityViewModel, geometryForCaseEvaluation } from "../lib/market-reality";
import { setMarketRealityWindowsForTests } from "../lib/market-reality-store";
import { getObservationByPlanId, getObservations } from "../lib/observation-store";
import { __setObservationsStoreForTests, createMemoryObservationsStore } from "../lib/observations-store";
import { getPlanById } from "../lib/plans";
import type { TradePlan } from "../lib/plan-types";
import { persistPlanOutcome } from "../lib/plan-outcome";
import { __setPlansStoreForTests, createMemoryPlansStore } from "../lib/plans-store";
import { applyDecisionUpdateFromProposal } from "../lib/scout-plan-repair";
import type { StockThesis } from "../lib/stock-thesis-types";
import { __setStockThesesStoreForTests, createMemoryStockThesesStore } from "../lib/stock-theses-store";
import { evaluateCase, ohlcvEvidenceFromMarketReality } from "../lib/case-evaluation";
import { __setTradesStoreForTests, createMemoryTradesStore } from "../lib/trades-json";
import { buildCase } from "../lib/thesis-case";
import { createMemoryThesisT0Store, setThesisT0StoreForTests } from "../lib/thesis-t0-store";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";
import { applyThesisT0 } from "../lib/thesis-t0-repair";

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function run() {
  const plans = loadJson<TradePlan[]>("data/plans.json");
  const theses = loadJson<StockThesis[]>("data/stock-theses.json");
  const freezes = loadJson<ThesisT0Freeze[]>("data/thesis-t0-freezes.json");
  const windows = loadJson<unknown[]>("data/market-reality-case-windows.json");

  const plan001 = plans.find((p) => p.id === "PLAN-001");
  const thesis = theses.find((t) => t.id === "ST-TSLA-001");
  const freeze009 = freezes.find((f) => f.planIds.includes("PLAN-009"));
  assert.ok(plan001, "PLAN-001 seed missing");
  assert.ok(thesis, "ST-TSLA-001 seed missing");
  assert.ok(freeze009, "PLAN-009 freeze seed missing");

  __setPlansStoreForTests(createMemoryPlansStore([structuredClone(plan001!)]));
  __setStockThesesStoreForTests(createMemoryStockThesesStore([structuredClone(thesis!)]));
  __setTradesStoreForTests(createMemoryTradesStore([]));
  __setLearningOutcomeStoreForTests([]);
  __setObservationsStoreForTests(createMemoryObservationsStore(), "memory");
  __setMafExperimentsStoreForTests([]);
  __setImprovementHypothesesStoreForTests([]);
  setMarketRealityWindowsForTests(
    structuredClone(
      (windows as Array<{ planId?: string }>).filter(
        (w) => w.planId === "PLAN-001" || w.planId === "PLAN-009"
      )
    ) as never
  );
  const t0Store = createMemoryThesisT0Store();
  setThesisT0StoreForTests(t0Store);
  await t0Store.insert(structuredClone(freeze009!));

  const decisionUpdate = await applyDecisionUpdateFromProposal({
    planId: "PLAN-001",
    plannedEntry: 348,
    stopPrice: 320,
    targetPrice: 430,
    validUntil: null,
  });
  assert.ok(!decisionUpdate.errors?.length, decisionUpdate.errors?.join("; "));
  assert.ok(decisionUpdate.plan);
  assert.equal(decisionUpdate.plan!.validUntil, undefined);
  assert.ok(Math.abs((decisionUpdate.plan!.plannedRR ?? 0) - 2.9285714285714284) < 1e-9);

  const repaired = await applyThesisT0({
    plan: decisionUpdate.plan!,
    thesis: thesis!,
    update: {
      planId: "PLAN-001",
      t0: "2026-07-10T18:00:00.000Z",
      plannedEntry: 348,
      stopPrice: 320,
      targetPrice: 430,
      plannedRR: 2.9285714285714284,
      playbookId: "weekly-breakout",
      note: "Reconstruct missing PLAN-001-specific T0 from contemporaneous plan and decision evidence.",
      evidenceRefs: ["human:case-verification"],
    },
  });
  assert.notEqual(repaired.freeze.id, freeze009!.id);
  assert.ok(!repaired.freeze.planIds.includes("PLAN-009"));

  const outcome = await persistPlanOutcome({
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
    outcomeSource: "counterfactual_observation",
    evidenceStatus: "verified",
    notes: "Historical path reached entry and then stop before target with no staged order.",
    evidenceRefs: ["MRW-PLAN-001-R-2e1db838b826"],
  });
  assert.ok(!outcome.errors?.length, outcome.errors?.join("; "));
  assert.equal(outcome.learningSyncComplete, true);

  const reloaded = await getPlanById("PLAN-001");
  const thesisCase = await buildCase("PLAN-001");
  assert.ok(reloaded);
  assert.ok(thesisCase);
  assert.ok(thesisCase!.freeze?.correctionAudit?.length);
  assert.equal(thesisCase!.freeze?.plan.planId, "PLAN-001");
  assert.equal(thesisCase!.postDecision.outcome.planOutcome?.outcomeKind, "unexecuted_plan_loss");

  const geometry = geometryForCaseEvaluation({
    freeze: thesisCase!.freeze,
    plan: reloaded!,
    thesis: thesis!,
  });
  const retrospectiveWindow = (
    windows as Array<{ planId?: string; windowKind?: string }>
  ).find((w) => w.planId === "PLAN-001" && w.windowKind === "retrospective_observation");
  const retrospective = buildMarketRealityViewModel({
    window: structuredClone(retrospectiveWindow) as never,
    geometry,
    exAnteIntegrity: "verified_t0",
  });
  const evaluation = evaluateCase({
    thesisCase: thesisCase!,
    ohlcv: ohlcvEvidenceFromMarketReality({
      planId: "PLAN-001",
      retrospective,
    }),
  });
  assert.equal(evaluation.realityRelationship.value, "mixed");

  const lo = await getLearningOutcomeByPlanId("PLAN-001");
  const obs = await getObservationByPlanId("PLAN-001");
  const allObs = await getObservations();
  assert.equal(lo?.id, "LO-TSLA-001");
  assert.ok(obs);
  assert.equal(obs!.id, "OBS-TSLA-001");
  assert.equal(lo?.observationId, obs!.id);
  assert.equal(allObs.length, 1);

  const spine = await buildInsightsCaseSpine({ skipExpire: true });
  const row = spine.find((r) => r.planId === "PLAN-001");
  assert.ok(row);
  assert.equal(row!.t0Available, true);
  assert.equal(row!.t0RecordKind, "corrected");
  assert.equal(row!.reality, "mixed");
  assert.equal(row!.loKind, "unexecuted_plan_loss");

  const snapshot = await buildCaseSnapshotModel("PLAN-001");
  assert.ok(snapshot);
  assert.equal(snapshot!.rrConsistency, "OK");
  assert.equal(snapshot!.linkStatuses.t0, "LINKED");
  assert.equal(snapshot!.linkStatuses.learningOutcome, "LINKED");
  assert.equal(snapshot!.linkStatuses.observation, "LINKED");
  assert.equal(snapshot!.linkStatuses.maf, "MISSING");
  assert.equal(snapshot!.integrityWarnings.length, 0);
  assert.equal(snapshot!.caseRow?.reality, "mixed");

  console.log("test-plan001-final-readiness: PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
