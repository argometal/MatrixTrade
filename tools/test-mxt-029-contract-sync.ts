/**
 * Contract sync QC — UI-visible Apply schema + Mechanics must expose direct T0 apply.
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
  assert.equal(contract.schemaVersion, "2026-09-08.mxt-035-plan-delete");
  assert.ok(
    contract.acceptedTypes.includes("thesis-t0"),
    "acceptedTypes missing thesis-t0"
  );
  assert.ok(
    contract.acceptedTypes.includes("plan-delete"),
    "acceptedTypes missing plan-delete"
  );
  assert.deepEqual(
    [...contract.acceptedTypes].sort(),
    [...AI_BRIDGE_BLOCK_TYPES].sort()
  );
  assert.ok(contract.requiredFields["thesis-t0"]?.length);
  assert.ok(contract.examples["thesis-t0"]);
  assert.deepEqual(contract.requiredFields["plan-delete"], [
    "planId",
    "reason (≥8)",
  ]);
  assert.ok(contract.examples["plan-delete"]);
  assert.ok(
    contract.requiredFields["plan-outcome"]?.some((f) =>
      f.includes("repairKind=corrected")
    ),
    "plan-outcome requiredFields missing repairKind=corrected"
  );
}

{
  const text = buildApplySchemaContractText();
  assert.match(text, /2026-09-08\.mxt-035-plan-delete/);
  assert.match(text, /DATA CORRECTABILITY \(MXT 029\)/);
  assert.match(text, /ACCEPTED TYPES[\s\S]*?- thesis-t0/);
  assert.match(text, /ACCEPTED TYPES[\s\S]*?- plan-delete/);
  assert.match(text, /"thesis-t0"/); // JSON examples / acceptedTypes
  assert.match(text, /"plan-delete"/);
  assert.match(text, /correctionAudit/);
  const idxCorrectability = text.indexOf("DATA CORRECTABILITY");
  const idxJson = text.indexOf("=== CONTRACT JSON ===");
  assert.ok(idxCorrectability > 0 && idxCorrectability < idxJson);
}

{
  const correctability = buildDataCorrectabilityContractText();
  assert.match(correctability, /thesis-t0/);
  assert.match(correctability, /plan-delete/);
  assert.match(correctability, /plan-outcome supersede/);
  const t0Section = correctability.split("plan-outcome supersede")[0] ?? correctability;
  assert.doesNotMatch(t0Section, /repairKind=corrected/);
}

{
  const mechanics = buildMatrixMechanicsBrief();
  assert.ok(MATRIX_MECHANICS_REVISION >= 45);
  assert.match(mechanics, /DATA CORRECTABILITY/);
  assert.match(mechanics, /thesis-t0/);
  assert.match(mechanics, /mxt-035-plan-delete/);
  assert.doesNotMatch(mechanics, /Case\/T0 stay immutable/);
  assert.doesNotMatch(mechanics, /Does NOT rewrite frozen T0/);
  assert.match(mechanics, /Hindsight reconstruction/);
  assert.match(mechanics, /thesis-t0/);
}

{
  const t0 = validateProposalPayload({
    type: "thesis-t0",
    proposal: {
      planId: "PLAN-001",
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
