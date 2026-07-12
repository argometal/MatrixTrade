/**
 * Scout contract + import idempotency tests.
 * Run: npx tsx tools/test-scout-contract.ts
 */
import assert from "node:assert/strict";
import { validateScoutContract, validateOptionalInitialScoutContract } from "../lib/scout-contract";
import { computeImportFingerprint } from "../lib/import-fingerprint";
import { validateProposalPayload } from "../lib/bridge";
import { validateStockCaseDeleteProposal } from "../lib/stock-case-delete";
import { proposalToStockCaseInput } from "../lib/stock-case-create";
import { getAppliedImportStore } from "../lib/applied-import-store";
import { promises as fs } from "fs";
import path from "path";

const FP_FILE = path.join(process.cwd(), "data", "applied-import-fingerprints.json");

function baseStockCase(overrides: Record<string, unknown> = {}) {
  return {
    type: "stock-case-create",
    proposal: {
      ticker: "TESTX",
      currentHypothesis: "Test hypothesis for contract",
      thesis: "Test thesis",
      riskRules: { minimumRR: 3, invalidation: "Close below 100" },
      levels: { primaryZone: { low: 100, high: 105 } },
      initialScout: {
        plannedEntry: 102,
        stopPrice: 98,
        targetPrice: 120,
      },
      ...overrides,
    },
  };
}

async function resetFingerprints() {
  await fs.writeFile(FP_FILE, "[]\n", "utf8");
}

function testContract() {
  assert.equal(
    validateScoutContract({ stopPrice: 90, targetPrice: 110 }).ok,
    false,
    "missing plannedEntry"
  );
  assert.equal(
    validateScoutContract({ plannedEntry: 100, targetPrice: 110 }).ok,
    false,
    "missing stop"
  );
  assert.equal(
    validateScoutContract({ plannedEntry: 100, stopPrice: 90 }).ok,
    false,
    "missing target"
  );
  assert.equal(
    validateScoutContract({ plannedEntry: 100, stopPrice: 110, targetPrice: 120 }).ok,
    false,
    "invalid long order"
  );
  assert.equal(
    validateScoutContract({ plannedEntry: 100, stopPrice: 90, targetPrice: 120 }).ok,
    true,
    "valid scout"
  );
  assert.equal(
    validateOptionalInitialScoutContract({ supportLevel: 100, stopPrice: 90, targetPrice: 120 }).ok,
    false,
    "supportLevel not substitute"
  );
}

function testBridgeValidation() {
  const missingEntry = baseStockCase({
    initialScout: { stopPrice: 98, targetPrice: 120 },
  });
  const parsed = validateProposalPayload(missingEntry as never);
  assert.equal(parsed.ok, false);

  const valid = validateProposalPayload(baseStockCase() as never);
  assert.equal(valid.ok, true);
}

function testProposalInput() {
  const bad = proposalToStockCaseInput(
    baseStockCase({ initialScout: { stopPrice: 98, targetPrice: 120 } }).proposal as Record<
      string,
      unknown
    >
  );
  assert.ok(bad.errors?.length);

  const good = proposalToStockCaseInput(baseStockCase().proposal as Record<string, unknown>);
  assert.ok(!good.errors?.length);
}

function testFingerprintStable() {
  const a = baseStockCase();
  const b = { ...baseStockCase(), source: "ignored" };
  assert.equal(computeImportFingerprint(a), computeImportFingerprint(b));
}

async function testIdempotentApply() {
  await resetFingerprints();
  const payload = baseStockCase({ ticker: "IDEMX" });
  const store = getAppliedImportStore();
  const fp = computeImportFingerprint(payload);
  await store.record(fp, {
    message: "test",
    type: "stock-case-create",
    stockFileId: "ST-IDEMX-001",
  });
  const again = await store.findByFingerprint(fp);
  assert.ok(again);
}

function testStockCaseDelete() {
  const noConfirm = validateStockCaseDeleteProposal({ id: "ST-MSFT-002" });
  assert.equal(noConfirm.ok, false);
  const ok = validateStockCaseDeleteProposal({ id: "ST-MSFT-002", confirmDelete: true });
  assert.equal(ok.ok, true);
  const bridge = validateProposalPayload({
    type: "stock-case-delete",
    proposal: { id: "ST-MSFT-002", confirmDelete: true },
  } as never);
  assert.equal(bridge.ok, true);
}

async function main() {
  testContract();
  testBridgeValidation();
  testProposalInput();
  testFingerprintStable();
  testStockCaseDelete();
  await testIdempotentApply();
  console.log("test-scout-contract: all passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
