require("./register-local-env.cjs");

import assert from "node:assert/strict";
import { buildCaseSnapshot } from "../lib/case-snapshot";

async function main() {
  const plan003 = await buildCaseSnapshot("PLAN-003");
  assert.ok(plan003, "PLAN-003 snapshot should exist");
  assert.match(plan003!, /MSFT · PLAN-003/);
  assert.match(plan003!, /STATUS: COMPLETE/);
  assert.match(plan003!, /Stock File: ST-MSFT-001/);
  assert.match(plan003!, /--- 2\. EVIDENCE ---/);
  assert.match(plan003!, /Opportunity path:/);
  assert.match(plan003!, /Late-entry geometry: unavailable/);
  assert.doesNotMatch(plan003!, /consumed from original entry/i);
  assert.match(plan003!, /--- 3\. RESULT ---/);
  assert.match(plan003!, /--- 4\. ISSUES ---/);
  assert.match(plan003!, /Reasoning:/);
  assert.doesNotMatch(plan003!, /\nevaluable:/);

  const plan001 = await buildCaseSnapshot("PLAN-001");
  const plan009 = await buildCaseSnapshot("PLAN-009");
  const plan002 = await buildCaseSnapshot("PLAN-002");
  assert.ok(plan001, "PLAN-001 snapshot should exist");
  assert.ok(plan009, "PLAN-009 snapshot should exist");
  assert.ok(plan002, "PLAN-002 snapshot should exist");

  assert.match(plan001!, /TSLA · PLAN-001/);
  assert.match(plan001!, /Outcome: unexecuted_plan_loss/);

  assert.match(plan009!, /TSLA · PLAN-009/);
  assert.match(plan009!, /Outcome: missed_opportunity/);
  assert.doesNotMatch(plan009!, /TSLA · PLAN-001/);
  assert.doesNotMatch(plan001!, /TSLA · PLAN-009/);

  assert.match(plan002!, /NFLX · PLAN-002/);
  assert.match(plan002!, /STATUS: COMPLETE/);

  console.log("test-case-review-snapshot-loop: PASS");
}

void main();
