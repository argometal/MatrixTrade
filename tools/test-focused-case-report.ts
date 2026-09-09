require("./register-local-env.cjs");

import assert from "node:assert/strict";
import { buildFocusedCaseReport } from "../lib/focused-case-report";

async function main() {
  const plan001 = await buildFocusedCaseReport("PLAN-001");
  assert.ok(plan001, "PLAN-001 report should exist");
  assert.equal(plan001.caseOrigin, "modern");
  assert.equal(plan001.identity.ticker, "TSLA");
  assert.equal(plan001.identity.playbookId, "weekly-breakout");
  assert.equal(plan001.timeline.t0Available, true);
  assert.equal(plan001.execution.executionOccurred, false);
  assert.equal(plan001.accounting.realizedR, 0);
  assert.equal(plan001.accounting.counterfactualR, -1);
  assert.equal(plan001.integrity.rrConsistency, "WRONG");
  assert.equal(plan001.lifecycle.status, "COMPLETE");
  assert.equal(plan001.timeline.t0RecordKind, null);
  assert.equal(plan001.lifecycle.blockingLabels.length, 0);
  assert.ok(plan001.caseClassification.family);
  assert.equal(plan001.learning.mafPrimaryDrag, "timing_quality");

  const plan002 = await buildFocusedCaseReport("PLAN-002");
  assert.ok(plan002, "PLAN-002 report should exist");
  assert.equal(plan002.caseOrigin, "modern");
  assert.equal(plan002.planId, "PLAN-002");
  assert.equal(plan002.identity.ticker, "NFLX");
  assert.equal(plan002.lifecycle.status, "COMPLETE");
  assert.equal(plan002.lifecycle.blockingLabels.length, 0);
  assert.ok("available" in plan002.opportunityConsumption);
  assert.notEqual(plan002.planId, plan001.planId);
  assert.notEqual(plan002.identity.ticker, plan001.identity.ticker);

  const plan009 = await buildFocusedCaseReport("PLAN-009");
  assert.ok(plan009, "PLAN-009 report should exist");
  assert.equal(plan009.caseOrigin, "modern");
  assert.equal(plan009.planId, "PLAN-009");
  assert.equal(plan009.identity.ticker, "TSLA");
  assert.equal(plan009.lifecycle.status, "COMPLETE");
  assert.equal(plan009.timeline.t0Available, true);
  assert.equal(plan009.lifecycle.blockingLabels.length, 0);
  assert.notEqual(plan009.planId, plan001.planId);
  assert.notEqual(
    plan009.learning.learningOutcomeId,
    plan001.learning.learningOutcomeId,
    "PLAN-009 should not inherit PLAN-001 learning identity"
  );

  const historical = await buildFocusedCaseReport("HIST:H001");
  assert.ok(historical, "HIST:H001 report should exist");
  assert.equal(historical.caseOrigin, "historical_trade");
  assert.equal(historical.frozenPlan.available, false);
  assert.equal(historical.integrity.missingPlan, true);
  assert.equal(historical.timeline.t0Available, false);
  assert.equal(historical.lifecycle.status, "INCOMPLETE");
  assert.ok(!historical.lifecycle.blockingLabels.includes("T0"));

  console.log("test-focused-case-report: PASS");
}

void main();
