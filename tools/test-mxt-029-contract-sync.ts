/**
 * Contract sync QC — UI-visible Apply schema + Mechanics must expose OLE + T0.
 * Run: npx tsx tools/test-mxt-029-contract-sync.ts
 */
import assert from "node:assert/strict";
import {
  APPLY_SCHEMA_VERSION,
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
  assert.equal(contract.schemaVersion, APPLY_SCHEMA_VERSION);
  assert.equal(contract.schemaVersion, "2026-09-15.mxt-15-21-ole-init");
  assert.ok(
    contract.acceptedTypes.includes("thesis-t0"),
    "acceptedTypes missing thesis-t0"
  );
  assert.ok(
    contract.acceptedTypes.includes("plan-delete"),
    "acceptedTypes missing plan-delete"
  );
  assert.ok(
    contract.acceptedTypes.includes("layered-entry-update"),
    "acceptedTypes missing layered-entry-update"
  );
  assert.ok(contract.layeredEntryUpdate);
  assert.ok(contract.layeredEntryUpdate.limitKeys.includes("price"));
  assert.ok(contract.layeredEntryUpdate.limitKeys.includes("allocationPercent"));
  assert.equal(
    contract.layeredEntryUpdate.initExample.proposal.planId,
    "PLAN-015"
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
  assert.match(text, /2026-09-15\.mxt-15-21-ole-init/);
  assert.doesNotMatch(
    text,
    /Freshness check: schemaVersion MUST be 2026-09-08\.mxt-035-plan-delete/
  );
  assert.match(text, /DATA CORRECTABILITY \(MXT 029\)/);
  assert.match(text, /ACCEPTED TYPES[\s\S]*?- thesis-t0/);
  assert.match(text, /ACCEPTED TYPES[\s\S]*?- plan-delete/);
  assert.match(text, /ACCEPTED TYPES[\s\S]*?- layered-entry-update/);
  assert.match(text, /=== LAYERED-ENTRY-UPDATE ===/);
  assert.match(text, /INITIALIZE/);
  assert.match(text, /FILL EVIDENCE: INSUFFICIENT/);
  assert.match(text, /"planId": "PLAN-015"/);
  assert.match(text, /allocationPercent": 40/);
  assert.match(text, /"thesis-t0"/);
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
  assert.match(correctability, /layered-entry-update/);
  assert.match(correctability, /2026-09-15\.mxt-15-21-ole-init/);
  assert.match(correctability, /plan-outcome supersede/);
  const t0Section =
    correctability.split("plan-outcome supersede")[0] ?? correctability;
  assert.doesNotMatch(t0Section, /repairKind=corrected/);
}

{
  const mechanics = buildMatrixMechanicsBrief();
  assert.ok(MATRIX_MECHANICS_REVISION >= 50);
  assert.match(mechanics, /DATA CORRECTABILITY/);
  assert.match(mechanics, /thesis-t0/);
  assert.match(mechanics, /mxt-15-21-ole-init/);
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
