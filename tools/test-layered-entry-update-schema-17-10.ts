/**
 * 17-10 — layered-entry-update must be fully specified in the Apply schema contract.
 * Run: npm run test:layered-entry-update-schema
 */
import assert from "node:assert/strict";
import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import {
  buildApplySchemaContract,
  buildApplySchemaContractText,
} from "../lib/apply-schema-contract";
import {
  LAYERED_ENTRY_CONFIGURE_WITHOUT_FILL_EXAMPLE,
  LAYERED_ENTRY_UPDATE_ALLOWED_KEYS,
  LAYERED_ENTRY_UPDATE_FILL_EXAMPLE,
  LAYERED_ENTRY_UPDATE_FORBIDDEN_PLANNING_KEYS,
  LAYERED_ENTRY_UPDATE_STATUS,
  validateLayeredEntryUpdateProposal,
} from "../lib/layered-entry-update-schema";

function mustFail(label: string, proposal: Record<string, unknown>) {
  const parsed = parseTradingInboxPayload({
    type: "layered-entry-update",
    source: "ai-block",
    proposal,
  });
  assert.ok(parsed, `${label}: should parse`);
  const v = validateProposalPayload(parsed!);
  assert.equal(v.ok, false, `${label}: should be rejected`);
  return (v as { ok: false; errors: string[] }).errors;
}

function mustPass(label: string, proposal: Record<string, unknown>) {
  const parsed = parseTradingInboxPayload({
    type: "layered-entry-update",
    source: "ai-block",
    proposal,
  });
  assert.ok(parsed, `${label}: should parse`);
  const v = validateProposalPayload(parsed!);
  assert.equal(
    v.ok,
    true,
    `${label}: ${v.ok ? "" : (v as { errors: string[] }).errors.join("; ")}`
  );
}

{
  const parsed = parseTradingInboxPayload(
    LAYERED_ENTRY_CONFIGURE_WITHOUT_FILL_EXAMPLE as unknown as Record<string, unknown>
  );
  assert.ok(parsed);
  const v = validateProposalPayload(parsed!);
  assert.equal(
    v.ok,
    true,
    v.ok ? "" : (v as { errors: string[] }).errors.join("; ")
  );
  assert.equal(parsed!.type, "decision-update");
}

{
  const sample = parseTradingInboxPayload(
    AI_BLOCK_SAMPLES["layered-entry-update"] as Record<string, unknown>
  );
  assert.ok(sample);
  const v = validateProposalPayload(sample!);
  assert.equal(
    v.ok,
    true,
    v.ok ? "" : (v as { errors: string[] }).errors.join("; ")
  );
}

mustPass("fill index 1", { planId: "PLAN-002", filledThroughIndex: 1 });
mustPass("none filled", { planId: "PLAN-002", filledThroughIndex: -1 });
mustPass("status missed", { planId: "PLAN-002", status: "missed" });
mustPass("status planned", { planId: "PLAN-002", status: "planned" });
mustPass("status cancelled", { planId: "PLAN-002", status: "cancelled" });

{
  const errors = mustFail("missing xor", { planId: "PLAN-002" });
  assert.ok(
    errors.some((e) => e.includes("filledThroughIndex or proposal.status")),
    errors.join("; ")
  );
}

{
  const errors = mustFail("missing planId", { filledThroughIndex: 0 });
  assert.ok(errors.some((e) => e.includes("planId")), errors.join("; "));
}

{
  const errors = mustFail("invalid status", {
    planId: "PLAN-002",
    status: "complete",
  });
  assert.ok(
    errors.some((e) => e.includes("proposal.status must be one of")),
    errors.join("; ")
  );
  assert.ok(
    LAYERED_ENTRY_UPDATE_STATUS.every((s) =>
      errors.some((e) => e.includes(s))
    ),
    errors.join("; ")
  );
}

{
  const errors = mustFail("non-integer index", {
    planId: "PLAN-002",
    filledThroughIndex: 1.5,
  });
  assert.ok(
    errors.some((e) => e.includes("integer >= -1")),
    errors.join("; ")
  );
}

{
  const errors = mustFail("index below -1", {
    planId: "PLAN-002",
    filledThroughIndex: -2,
  });
  assert.ok(
    errors.some((e) => e.includes("integer >= -1")),
    errors.join("; ")
  );
}

{
  const errors = mustFail("planning keys", {
    planId: "PLAN-002",
    filledThroughIndex: 0,
    authorizedRiskAmount: 100,
    limits: [{ price: 315, allocationPercent: 100 }],
    sizingMode: "risk_percent",
  });
  assert.ok(errors.some((e) => e.includes("unknown keys")), errors.join("; "));
  assert.ok(errors.some((e) => e.includes("authorizedRiskAmount")), errors.join("; "));
  assert.ok(errors.some((e) => e.includes("limits")), errors.join("; "));
  assert.ok(errors.some((e) => e.includes("sizingMode")), errors.join("; "));
}

{
  const direct = validateLayeredEntryUpdateProposal({
    planId: "PLAN-002",
    status: "armed",
  });
  assert.equal(direct.ok, false);
}

{
  const contract = buildApplySchemaContract();
  assert.equal(contract.schemaVersion, "2026-08-18.apply-json-paste");
  assert.deepEqual(
    [...contract.layeredEntryUpdate.allowedProposalKeys],
    [...LAYERED_ENTRY_UPDATE_ALLOWED_KEYS]
  );
  assert.deepEqual(
    [...contract.layeredEntryUpdate.statusEnum],
    [...LAYERED_ENTRY_UPDATE_STATUS]
  );
  assert.ok(
    contract.layeredEntryUpdate.forbiddenPlanningKeys.includes(
      "authorizedRiskAmount"
    )
  );
  for (const key of LAYERED_ENTRY_UPDATE_FORBIDDEN_PLANNING_KEYS) {
    assert.ok(
      contract.layeredEntryUpdate.forbiddenPlanningKeys.includes(key),
      `missing forbidden key ${key}`
    );
  }
  assert.equal(
    (contract.layeredEntryUpdate.fillExample.proposal as { filledThroughIndex?: number })
      .filledThroughIndex,
    1
  );
  assert.equal(
    contract.layeredEntryUpdate.configureWithoutFillExample.type,
    "decision-update"
  );
  const configureProposal = contract.layeredEntryUpdate
    .configureWithoutFillExample.proposal as Record<string, unknown>;
  assert.equal(configureProposal.filledThroughIndex, undefined);
  assert.equal(configureProposal.status, undefined);
  const layered = configureProposal.layeredEntry as Record<string, unknown>;
  assert.ok(Array.isArray(layered.limits));
  assert.ok(
    (layered.limits as Array<Record<string, unknown>>).every(
      (limit) => limit.filled === undefined
    )
  );

  const text = buildApplySchemaContractText();
  assert.ok(text.includes("=== LAYERED-ENTRY-UPDATE ==="));
  assert.ok(text.includes("filledThroughIndex OR status"));
  assert.ok(text.includes("integer >= -1"));
  assert.ok(text.includes("0-based"));
  assert.ok(text.includes("-1 = no layer filled"));
  assert.ok(text.includes("planned | partial | full | missed | active | cancelled"));
  assert.ok(text.includes("Configure a layered entry WITHOUT marking execution progress"));
  assert.ok(text.includes("=== APPLY JSON PASTE DISCIPLINE ==="));
  assert.ok(text.includes("Buy 1 share at $315"));
  assert.ok(text.includes("Do not send plannedQuantity"));
  assert.ok(!JSON.stringify(LAYERED_ENTRY_CONFIGURE_WITHOUT_FILL_EXAMPLE).includes("filledThroughIndex"));
  assert.ok(text.includes('"filledThroughIndex": 1'));
  assert.equal(LAYERED_ENTRY_UPDATE_FILL_EXAMPLE.proposal.filledThroughIndex, 1);
}

console.log("test-layered-entry-update-schema-17-10: ok");
