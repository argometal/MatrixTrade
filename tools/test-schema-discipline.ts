/**
 * Schema discipline: stock-case-create / scout-plan-create require entry+stop+target.
 * Run: npm run test:schema-discipline
 */
import assert from "node:assert/strict";
import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { buildApplySchemaContract } from "../lib/apply-schema-contract";
import { validateScoutPlanCreateProposal } from "../lib/scout-plan-create-validate";
import { proposalToStockCaseInput } from "../lib/stock-case-create";

function mustFail(label: string, parsed: ReturnType<typeof parseTradingInboxPayload>) {
  assert.ok(parsed, `${label}: should parse`);
  const v = validateProposalPayload(parsed!);
  assert.equal(v.ok, false, `${label}: should be rejected`);
  return (v as { ok: false; errors: string[] }).errors;
}

// Valid sample still passes
const sample = parseTradingInboxPayload(
  AI_BLOCK_SAMPLES["stock-case-create"] as Record<string, unknown>
);
assert.ok(sample);
const sampleOk = validateProposalPayload(sample!);
assert.equal(
  sampleOk.ok,
  true,
  sampleOk.ok ? "" : (sampleOk as { errors: string[] }).errors.join("; ")
);

// Missing initialScout entirely
{
  const base = structuredClone(AI_BLOCK_SAMPLES["stock-case-create"]) as {
    proposal: Record<string, unknown>;
  };
  delete base.proposal.initialScout;
  const errors = mustFail(
    "no initialScout",
    parseTradingInboxPayload(base as Record<string, unknown>)
  );
  assert.ok(
    errors.some((e) => e.includes("initialScout") && e.toLowerCase().includes("required")),
    errors.join("; ")
  );
}

// initialScout without target
{
  const base = structuredClone(AI_BLOCK_SAMPLES["stock-case-create"]) as {
    proposal: Record<string, unknown>;
  };
  const scout = { ...(base.proposal.initialScout as Record<string, unknown>) };
  delete scout.targetPrice;
  base.proposal.initialScout = scout;
  const errors = mustFail(
    "missing target",
    parseTradingInboxPayload(base as Record<string, unknown>)
  );
  assert.ok(errors.some((e) => e.includes("targetPrice")), errors.join("; "));
}

// Invented keys rejected
{
  const base = structuredClone(AI_BLOCK_SAMPLES["stock-case-create"]) as {
    proposal: Record<string, unknown>;
  };
  base.proposal.primarySupportZone = { low: 140, high: 145 };
  base.proposal.technicalNotes = { foo: true };
  const errors = mustFail(
    "invented keys",
    parseTradingInboxPayload(base as Record<string, unknown>)
  );
  assert.ok(errors.some((e) => e.includes("unknown keys")), errors.join("; "));
}

// Bare-price invalidation rejected
{
  const base = structuredClone(AI_BLOCK_SAMPLES["stock-case-create"]) as {
    proposal: Record<string, unknown>;
  };
  (base.proposal.riskRules as Record<string, unknown>).invalidation = "130";
  const errors = mustFail(
    "bare invalidation",
    parseTradingInboxPayload(base as Record<string, unknown>)
  );
  assert.ok(errors.some((e) => e.includes("observable event")), errors.join("; "));
}

// invent levels keys
{
  const base = structuredClone(AI_BLOCK_SAMPLES["stock-case-create"]) as {
    proposal: Record<string, unknown>;
  };
  (base.proposal.levels as Record<string, unknown>).probableTarget = 160;
  const errors = mustFail(
    "invented levels key",
    parseTradingInboxPayload(base as Record<string, unknown>)
  );
  assert.ok(errors.some((e) => e.includes("levels unknown")), errors.join("; "));
}

// scout-plan-create missing entry
{
  const bad = validateScoutPlanCreateProposal({
    stockFileId: "ST-PG-001",
    ticker: "PG",
    stopPrice: 135,
    targetPrice: 160,
  });
  assert.equal(bad.ok, false);
  assert.ok(
    (bad as { errors: string[] }).errors.some((e) => e.includes("plannedEntry")),
    (bad as { errors: string[] }).errors.join("; ")
  );
}

// scout-plan-create valid
{
  const ok = validateScoutPlanCreateProposal({
    stockFileId: "ST-PG-001",
    ticker: "PG",
    plannedEntry: 140.5,
    stopPrice: 135,
    targetPrice: 160,
  });
  assert.equal(ok.ok, true, ok.ok ? "" : (ok as { errors: string[] }).errors.join("; "));
}

// proposalToStockCaseInput also requires scout
{
  const base = structuredClone(AI_BLOCK_SAMPLES["stock-case-create"]) as {
    proposal: Record<string, unknown>;
  };
  delete base.proposal.initialScout;
  const parsed = proposalToStockCaseInput(base.proposal);
  assert.ok(parsed.errors?.length);
  assert.ok(parsed.errors!.some((e) => e.includes("initialScout")));
}

// Schema contract handshake present
const contract = buildApplySchemaContract();
assert.ok(contract.schemaVersion);
assert.ok(contract.stockCaseCreate.required.includes("initialScout.plannedEntry"));
assert.ok(contract.rules.some((r) => r.toLowerCase().includes("schema-first")));

console.log("schema-discipline: ok");
