import assert from "node:assert/strict";
import { buildCaseSnapshot, buildCaseSnapshotModel } from "../lib/case-snapshot";

async function run() {
  const plan001 = await buildCaseSnapshot("PLAN-001");
  assert.ok(plan001, "PLAN-001 snapshot should be generated");

  assert.match(plan001!, /=== CASE SNAPSHOT ===/);
  assert.match(plan001!, /--- 12\. PROVENANCE \/ INTEGRITY ---/);
  assert.match(plan001!, /PLAN ID: PLAN-001/);
  assert.doesNotMatch(plan001!, /freezeId: T0-9339f2f63266/);

  const model001 = await buildCaseSnapshotModel("PLAN-001");
  const model009 = await buildCaseSnapshotModel("PLAN-009");
  assert.ok(model001, "PLAN-001 model should exist");
  assert.equal(model009, null, "PLAN-009 should currently be unavailable from canonical plan store");
  assert.equal(model001!.thesisCase.freeze?.id ?? null, null);
  assert.equal(model001!.learningOutcome?.id, "LO-TSLA-001");

  console.log("test-case-snapshot: PASS");
}

void run();
