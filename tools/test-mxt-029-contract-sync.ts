/**
 * Contract sync QC — UI-visible Apply schema + Mechanics must expose MXT 029 repair.
 * Run: npx tsx tools/test-mxt-029-contract-sync.ts
 */
import assert from "node:assert/strict";
import {
  buildApplySchemaContract,
  buildApplySchemaContractText,
  buildDataCorrectabilityContractText,
} from "../lib/apply-schema-contract";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { MATRIX_MECHANICS_REVISION } from "../lib/matrix-mechanics-snapshot";
import { AI_BRIDGE_BLOCK_TYPES } from "../lib/ai-bridge-types";
import { validateProposalPayload } from "../lib/bridge";
import { validatePlanOutcomeProposal } from "../lib/plan-outcome-validate";

{
  const contract = buildApplySchemaContract();
  assert.equal(contract.schemaVersion, "2026-09-05.mxt-029-correctability");
  assert.ok(
    contract.acceptedTypes.includes("thesis-t0-repair"),
    "acceptedTypes missing thesis-t0-repair"
  );
  assert.deepEqual(
    [...contract.acceptedTypes].sort(),
    [...AI_BRIDGE_BLOCK_TYPES].sort()
  );
  assert.ok(contract.requiredFields["thesis-t0-repair"]?.length);
  assert.ok(contract.examples["thesis-t0-repair"]);
  assert.ok(
    contract.requiredFields["plan-outcome"]?.some((f) =>
      f.includes("repairKind=corrected")
    ),
    "plan-outcome requiredFields missing repairKind=corrected"
  );
}

{
  const text = buildApplySchemaContractText();
  assert.match(text, /2026-09-05\.mxt-029-correctability/);
  assert.match(text, /DATA CORRECTABILITY \(MXT 029\)/);
  assert.match(text, /ACCEPTED TYPES[\s\S]*?- thesis-t0-repair/);
  assert.match(text, /"thesis-t0-repair"/); // JSON examples / acceptedTypes
  assert.match(text, /repairKind=corrected/);
  assert.match(text, /correctionAudit/);
  const idxCorrectability = text.indexOf("DATA CORRECTABILITY");
  const idxJson = text.indexOf("=== CONTRACT JSON ===");
  assert.ok(idxCorrectability > 0 && idxCorrectability < idxJson);
}

{
  const correctability = buildDataCorrectabilityContractText();
  assert.match(correctability, /thesis-t0-repair/);
  assert.match(correctability, /plan-outcome supersede/);
  assert.match(correctability, /repairKind=corrected/);
}

{
  const mechanics = buildMatrixMechanicsBrief();
  assert.ok(MATRIX_MECHANICS_REVISION >= 45);
  assert.match(mechanics, /DATA CORRECTABILITY/);
  assert.match(mechanics, /thesis-t0-repair/);
  assert.match(mechanics, /repairKind=corrected/);
  assert.doesNotMatch(mechanics, /Case\/T0 stay immutable/);
  assert.doesNotMatch(mechanics, /Does NOT rewrite frozen T0/);
  assert.match(mechanics, /Hindsight reconstruction/);
  assert.match(mechanics, /thesis-t0-repair/);
}

{
  const t0 = validateProposalPayload({
    type: "thesis-t0-repair",
    proposal: {
      planId: "PLAN-001",
      repairKind: "reconstructed",
      t0: "2025-06-15T14:00:00.000Z",
      plannedEntry: 349,
      stopPrice: 320,
      targetPrice: 430,
      note: "Missing Plan-specific T0 with contemporaneous geometry.",
    },
  });
  assert.equal(t0.ok, true, t0.ok ? "" : t0.errors.join("; "));

  const po = validatePlanOutcomeProposal({
    planId: "PLAN-001",
    outcomeKind: "missed_opportunity",
    entryReached: false,
    stopReachedBeforeTarget: false,
    targetReachedBeforeStop: true,
    nonExecutionReason: "entry_not_reached",
    repairKind: "corrected",
    repairNote: "Prior UPL classification was wrong for this window.",
  });
  assert.equal(po.ok, true, po.ok ? "" : po.errors.join("; "));
}

console.log("test-mxt-029-contract-sync: PASS");
