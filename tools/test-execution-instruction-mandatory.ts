/**
 * Mandatory executionInstruction gate (post-architecture follow-up).
 * Run: npm run test:execution-instruction-mandatory
 */
import assert from "node:assert/strict";
import { validateProposalPayload } from "../lib/bridge";
import {
  EXECUTION_INSTRUCTION_REQUIRED_MSG,
  requireExecutionInstructionForGeometry,
} from "../lib/scout-execution-instruction";
import { validateScoutPlanCreateProposal } from "../lib/scout-plan-create-validate";

const instruction =
  "Buy 8 shares at exactly $310.00. Place the stop at $294.00. Hold until $380. Do not chase.";

// Helper — geometry without instruction fails
{
  const err = requireExecutionInstructionForGeometry({
    plannedEntry: 310,
    stopPrice: 294,
    targetPrice: 380,
  });
  assert.equal(err, EXECUTION_INSTRUCTION_REQUIRED_MSG);
}

// Helper — geometry with instruction OK
{
  assert.equal(
    requireExecutionInstructionForGeometry({
      plannedEntry: 310,
      executionInstruction: instruction,
    }),
    undefined
  );
}

// Helper — OA-only does not require instruction
{
  assert.equal(
    requireExecutionInstructionForGeometry({
      operationalAssessment: { operationalState: "passed", nextAction: "monitor" },
    }),
    undefined
  );
}

// scout-plan-create — missing instruction rejected
{
  const result = validateScoutPlanCreateProposal({
    stockFileId: "ST-GOOGL-001",
    ticker: "GOOGL",
    plannedEntry: 310,
    stopPrice: 294,
    targetPrice: 380,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.errors.some((e) => e.includes("executionInstruction required")),
      result.errors.join("; ")
    );
  }
}

// scout-plan-create — with instruction accepted (schema)
{
  const result = validateScoutPlanCreateProposal({
    stockFileId: "ST-GOOGL-001",
    ticker: "GOOGL",
    plannedEntry: 310,
    stopPrice: 294,
    targetPrice: 380,
    executionInstruction: instruction,
  });
  assert.equal(result.ok, true);
}

// decision-update — geometry without instruction rejected
{
  const result = validateProposalPayload({
    type: "decision-update",
    source: "test",
    proposal: {
      planId: "PLAN-007",
      plannedEntry: 310,
      stopPrice: 294,
      targetPrice: 380,
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.errors.some((e) => e.includes("executionInstruction required")),
      result.errors.join("; ")
    );
  }
}

// decision-update — geometry + instruction OK
{
  const result = validateProposalPayload({
    type: "decision-update",
    source: "test",
    proposal: {
      planId: "PLAN-007",
      plannedEntry: 310,
      stopPrice: 294,
      targetPrice: 380,
      executionInstruction: instruction,
    },
  });
  assert.equal(result.ok, true);
}

// decision-update — readiness-only OK without instruction
{
  const result = validateProposalPayload({
    type: "decision-update",
    source: "test",
    proposal: {
      planId: "PLAN-007",
      executionReadiness: "armed",
    },
  });
  assert.equal(result.ok, true, result.ok ? "" : result.errors.join("; "));
}

console.log("test-execution-instruction-mandatory: ok");
