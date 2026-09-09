import assert from "node:assert/strict";
import {
  buildCaseSnapshot,
  buildCaseSnapshotModel,
  listAvailableCaseSnapshotIdentities,
  listAvailableCaseSnapshotPlanIds,
} from "../lib/case-snapshot";
import { __setTradesStoreForTests, createMemoryTradesStore } from "../lib/trades-json";
import { __setLearningOutcomeStoreForTests } from "../lib/learning-outcome-store";
import { __setObservationsStoreForTests, createMemoryObservationsStore } from "../lib/observations-store";
import { __setMafExperimentsStoreForTests } from "../lib/maf-experiments-store";

async function run() {
  const plan001 = await buildCaseSnapshot("PLAN-001");
  assert.ok(plan001, "PLAN-001 snapshot should be generated");

  assert.match(plan001!, /=== CASE SNAPSHOT ===/);
  assert.match(plan001!, /TSLA · PLAN-001/);
  assert.match(plan001!, /--- 1\. CASE ---/);
  assert.match(plan001!, /--- 2\. EVIDENCE ---/);
  assert.match(plan001!, /--- 3\. RESULT ---/);
  assert.match(plan001!, /--- 4\. ISSUES ---/);
  assert.match(plan001!, /MISSING REQUIRED: T0/);
  assert.doesNotMatch(plan001!, /\nevaluable:/);
  assert.doesNotMatch(plan001!, /freezeId: T0-9339f2f63266/);
  assert.doesNotMatch(plan001!, /tradeId: null/);
  assert.doesNotMatch(plan001!, /hypothesisId: null/);

  const model001 = await buildCaseSnapshotModel("PLAN-001");
  const model009 = await buildCaseSnapshotModel("PLAN-009");
  const planIds = await listAvailableCaseSnapshotPlanIds();
  assert.ok(model001, "PLAN-001 model should exist");
  assert.equal(model009, null, "PLAN-009 should currently be unavailable from canonical plan store");
  assert.equal(model001!.thesisCase.freeze?.id ?? null, null);
  assert.equal(model001!.learningOutcome?.id, "LO-TSLA-001");
  assert.ok(planIds.includes("PLAN-001"), "PLAN-001 should be exportable by planId");

  __setTradesStoreForTests(
    createMemoryTradesStore([
      {
        id: "H001",
        ticker: "AMZN",
        status: "closed",
        entry: 240,
        stop: 230,
        target: 270,
        exit: 225.9,
        shares: 8,
        direction: "long",
        riskRewardActual: -1.41,
        playbookHistoricallyAbsent: true,
        planHistoricallyAbsent: true,
        createdAt: "2025-11-01T00:00:00.000Z",
        closedAt: "2025-11-05T00:00:00.000Z",
      },
    ])
  );
  __setLearningOutcomeStoreForTests([]);
  __setObservationsStoreForTests(createMemoryObservationsStore([]));
  __setMafExperimentsStoreForTests([]);
  try {
    const identities = await listAvailableCaseSnapshotIdentities();
    assert.ok(
      identities.some((item) => item.planId === "HIST:H001" && item.caseOrigin === "historical_trade"),
      "Historical case should be enumerated from case spine"
    );
    const hist = await buildCaseSnapshot("HIST:H001");
    assert.ok(hist, "Historical case snapshot should be generated");
    assert.match(hist!, /AMZN · HIST:H001/);
    assert.match(hist!, /MISSING REQUIRED: Historical plan-backed T0/);
    assert.match(hist!, /Trade ID: H001/);
    assert.match(hist!, /T0: MISSING/);
    assert.match(hist!, /--- 4\. ISSUES ---/);
  } finally {
    __setTradesStoreForTests(null);
    __setLearningOutcomeStoreForTests(null);
    __setObservationsStoreForTests(null);
    __setMafExperimentsStoreForTests(null);
  }

  console.log("test-case-snapshot: PASS");
}

void run();
