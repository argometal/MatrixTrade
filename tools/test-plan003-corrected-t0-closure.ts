require("./register-local-env.cjs");

import assert from "node:assert/strict";
import { buildFocusedCaseReport } from "../lib/focused-case-report";
import { getPlanById } from "../lib/plans";
import { getStockThesisById } from "../lib/stock-theses";
import { applyThesisT0 } from "../lib/thesis-t0-repair";
import { createMemoryThesisT0Store, setThesisT0StoreForTests } from "../lib/thesis-t0-store";

async function main() {
  const plan = await getPlanById("PLAN-003");
  assert.ok(plan, "PLAN-003 should exist");
  const thesis = await getStockThesisById("ST-MSFT-001");
  assert.ok(thesis, "ST-MSFT-001 should exist");
  assert.ok(plan?.decision?.decidedAt, "PLAN-003 should have decidedAt");

  const previousReadOnly = process.env.MXT_READ_ONLY;
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  process.env.MXT_READ_ONLY = "0";

  try {
      const repaired = await applyThesisT0({
      plan: plan!,
      thesis: thesis!,
        update: {
        planId: "PLAN-003",
        t0: plan!.decision!.decidedAt,
        plannedEntry: 350,
        stopPrice: 334,
        targetPrice: 450,
        plannedRR: 6.25,
        thesisText: thesis!.thesis,
        currentHypothesis: thesis!.currentHypothesis,
        note:
          "Corrected Plan-specific T0 supplied from surviving 2026-07-12 plan/decision records. Earlier June origin survives as historical provenance in ST-MSFT-001 notes; this correction does not claim an untouched June original freeze.",
        evidenceRefs: [
          "plan:PLAN-003",
          "decision:DEC-56dc0b6f5b7c",
          "stock-thesis:ST-MSFT-001",
          "notes:Legacy MSFT PLAN-003 history",
        ],
      },
    });

    assert.equal(repaired.created, true);
    assert.equal(repaired.freeze.t0, "2026-07-12T09:11:10.139Z");
    assert.equal(repaired.freeze.plan.plannedEntry, 350);
    assert.equal(repaired.freeze.plan.stopPrice, 334);
    assert.equal(repaired.freeze.plan.targetPrice, 450);
    assert.equal(repaired.freeze.correctionAudit?.length, 1);

    const report = await buildFocusedCaseReport("PLAN-003");
    assert.ok(report, "PLAN-003 report should exist after corrected T0");
    assert.equal(report?.lifecycle.status, "COMPLETE");
    assert.equal(report?.timeline.t0Available, true);
      assert.equal(report?.timeline.t0RecordKind, null);
    assert.equal(report?.integrity.missingT0, false);
    assert.equal(report?.lifecycle.blockingLabels.length, 0);
    assert.notEqual(report?.caseClassification.evaluationCode, "EQ-016A-NE-MISSING-T0");
  } finally {
    process.env.MXT_READ_ONLY = previousReadOnly;
    setThesisT0StoreForTests(null);
  }

  console.log("test-plan003-corrected-t0-closure: PASS");
}

void main();
