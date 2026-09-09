require("./register-local-env.cjs");

/**
 * PLAN-002 validate-path regression for exact plan-outcome payload.
 * Run: npx tsx tools/test-plan002-validate-payload.ts
 */
import assert from "node:assert/strict";
import { parseAiBlock } from "../lib/ai-block";
import { validatePlanOutcomeProposal } from "../lib/plan-outcome-validate";
import { getPlanById } from "../lib/plans";

const RAW_BLOCK = JSON.stringify(
  {
    type: "plan-outcome",
    source: "ai-block",
    proposal: {
      planId: "PLAN-002",
      outcomeKind: "unexecuted_plan_loss",
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
      nonExecutionReason: "order_not_staged",
      notes:
        "Historical review confirmed the GO plan could have been executed, but the order was never staged. Entry 73 reached, stop 68 reached before target 88, no real Trade, realized R remains 0 and counterfactual R is -1.",
      evidenceRefs: [],
    },
  },
  null,
  2
);

async function main() {
  const parsed = parseAiBlock(RAW_BLOCK);
  const parseError = !parsed.ok && "error" in parsed ? parsed.error : "";
  assert.equal(parsed.ok, true, parseError);
  if (!parsed.ok) {
    throw new Error(parseError || "parseAiBlock failed");
  }

  const proposal = parsed.payload.proposal;
  const validated = validatePlanOutcomeProposal(proposal);
  const validationError = !validated.ok && "errors" in validated ? validated.errors.join("; ") : "";
  assert.equal(validated.ok, true, validationError);
  if (!validated.ok) {
    throw new Error(validationError || "validatePlanOutcomeProposal failed");
  }

  const plan = await getPlanById("PLAN-002");
  assert.ok(plan, "PLAN-002 should resolve during Validate/Accept tracing");
  assert.equal(plan?.status, "expired");
  assert.equal(Boolean(plan?.outcome?.recordedAt), false);

  console.log("test-plan002-validate-payload: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
