/**
 * 15-21 — OLE initialization via layered-entry-update + insufficient-evidence defaults.
 * Run: npm run test:ole-init-15-21
 */
import assert from "node:assert/strict";
import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import {
  APPLY_SCHEMA_VERSION,
  buildApplySchemaContract,
  buildApplySchemaContractText,
} from "../lib/apply-schema-contract";
import { applyTradingProposal } from "../lib/apply-trading-inbox";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import {
  applyLayeredEntryConfigure,
  applyLayeredEntryUpdate,
  authorizeLayeredEntry,
  parseLayeredEntryInput,
  validateLayeredEntry,
} from "../lib/layered-entry";
import {
  INSUFFICIENT_EVIDENCE_OLE_DEFAULT_WEIGHTS,
  LAYERED_ENTRY_UPDATE_ALLOWED_KEYS,
  LAYERED_ENTRY_UPDATE_INIT_EXAMPLE,
  LAYERED_ENTRY_UPDATE_LIMIT_KEYS,
  validateLayeredEntryUpdateProposal,
} from "../lib/layered-entry-update-schema";
import { getPlanById, getPlans, recordLayeredEntryFromProposal } from "../lib/plans";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import { applyScoutPlanCreate } from "../lib/scout-plan-create";
import {
  __setStockThesesStoreForTests,
  createMemoryStockThesesStore,
} from "../lib/stock-theses-store";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

const thesis: StockThesis = {
  id: "ST-AVGO-015",
  ticker: "AVGO",
  status: "actionable",
  version: 1,
  style: "swing",
  thesis: "AVGO pullback in 320–325 battle zone",
  historicalAnalysis: [],
  levels: { primaryZone: { low: 320, high: 325 }, targets: [370] },
  riskRules: { minimumRR: 3, invalidation: "Weekly close below 315" },
  currentHypothesis: "Buy pullback in layers under FILL EVIDENCE INSUFFICIENT",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const initPayload = {
  planId: "PLAN-015",
  authorizedRiskAmount: 100,
  sizingMode: "risk_percent",
  stopModel: "common",
  commonStopPrice: 315,
  primaryTargetPrice: 370,
  status: "planned",
  limits: [
    { price: 325, allocationPercent: 30, role: "starter" },
    { price: 323, allocationPercent: 40, role: "preferred" },
    { price: 320, allocationPercent: 30, role: "deep_pullback" },
  ],
} as const;

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-015",
    ticker: "AVGO",
    stockThesisId: thesis.id,
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 325,
    stopPrice: 315,
    targetPrice: 370,
    plannedRR: 4.5,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function resetStores(seedPlans: TradePlan[] = []) {
  __setPlansStoreForTests(createMemoryPlansStore(seedPlans));
  __setStockThesesStoreForTests(createMemoryStockThesesStore([thesis]));
}

function cleanup() {
  __setPlansStoreForTests(null);
  __setStockThesesStoreForTests(null);
}

function mustFailValidate(label: string, proposal: Record<string, unknown>) {
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

function mustPassValidate(label: string, proposal: Record<string, unknown>) {
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

async function main() {
  // --- 10. Apply schema contract documents initialization (copyable UI text) ---
  {
    const contract = buildApplySchemaContract();
    assert.equal(contract.schemaVersion, APPLY_SCHEMA_VERSION);
    assert.equal(contract.schemaVersion, "2026-09-16.mxt-15-35-ole-methodology");
    assert.ok(contract.layeredEntryUpdate);
    assert.ok(
      contract.layeredEntryUpdate.notes.some((n) =>
        n.toLowerCase().includes("create-or-update")
      )
    );
    assert.ok(contract.layeredEntryUpdate.limitKeys.includes("price"));
    assert.deepEqual(
      [...contract.layeredEntryUpdate.allowedProposalKeys].sort(),
      [...LAYERED_ENTRY_UPDATE_ALLOWED_KEYS].sort()
    );
    assert.ok(
      LAYERED_ENTRY_UPDATE_LIMIT_KEYS.every((k) =>
        contract.layeredEntryUpdate.limitKeys.includes(k)
      )
    );
    assert.equal(
      contract.layeredEntryUpdate.initExample.proposal.planId,
      "PLAN-015"
    );
    assert.deepEqual(
      contract.layeredEntryUpdate.insufficientEvidenceExemplarPlan015.weights.map(
        (w) => w.allocationPercent
      ),
      [30, 40, 30]
    );
    const text = buildApplySchemaContractText();
    assert.match(text, /schemaVersion: 2026-09-16\.mxt-15-35-ole-methodology/);
    assert.match(text, /EVIDENCE-SUPPORTED OLE/);
    assert.match(text, /PLAN-015 human execution legend/);
    assert.match(text, /322\.14/);
    assert.match(text, /6\.70R/);
    assert.doesNotMatch(text, /default uncertainty 30\/40\/30/i);
    assert.doesNotMatch(
      text,
      /Freshness check: schemaVersion MUST be 2026-09-08\.mxt-035-plan-delete/
    );
    assert.match(text, /LAYERED-ENTRY-UPDATE/);
    assert.match(text, /INITIALIZE/);
    assert.match(text, /FILL EVIDENCE: INSUFFICIENT/);
    assert.match(text, /Allowed proposal keys:/);
    assert.match(text, /Allowed limits\[\] keys:/);
    assert.match(text, /UNCERTAINTY-DISTRIBUTED OLE/);
    assert.match(text, /"planId": "PLAN-015"/);
    assert.match(text, /allocationPercent": 30/);
    assert.match(text, /allocationPercent": 40/);
    assert.ok(contract.requiredFields["layered-entry-update"]);
    const layeredExample = contract.examples["layered-entry-update"] as
      | { proposal?: { planId?: string } }
      | undefined;
    assert.equal(layeredExample?.proposal?.planId, "PLAN-015");

    // Contract alone must contain enough JSON for ChatGPT to emit PLAN-015 init.
    assert.ok(text.includes(JSON.stringify(LAYERED_ENTRY_UPDATE_INIT_EXAMPLE, null, 2)));
  }

  // --- 6. Valid 30/40/30 validates ---
  mustPassValidate("30/40/30 init", { ...initPayload });
  assert.equal(
    validateLayeredEntryUpdateProposal({ ...initPayload }).ok,
    true
  );
  assert.deepEqual(
    INSUFFICIENT_EVIDENCE_OLE_DEFAULT_WEIGHTS.weights.map((w) => w.allocationPercent),
    [30, 40, 30]
  );

  // --- 5. allocationPercent total != 100 rejected ---
  {
    const errors = mustFailValidate("bad alloc sum", {
      ...initPayload,
      limits: [
        { price: 325, allocationPercent: 50, role: "starter" },
        { price: 323, allocationPercent: 40, role: "preferred" },
        { price: 320, allocationPercent: 20, role: "deep_pullback" },
      ],
    });
    assert.ok(
      errors.some((e) => e.includes("sum to 100")),
      errors.join("; ")
    );
  }

  // --- 4. Fabricated fill progression rejected ---
  {
    const errors = mustFailValidate("fabricated filledThroughIndex", {
      ...initPayload,
      filledThroughIndex: 1,
    });
    assert.ok(
      errors.some((e) => e.toLowerCase().includes("filledthroughindex")),
      errors.join("; ")
    );
  }
  {
    const errors = mustFailValidate("fabricated partial status", {
      ...initPayload,
      status: "partial",
    });
    assert.ok(
      errors.some((e) => e.toLowerCase().includes("planned")),
      errors.join("; ")
    );
  }
  {
    const errors = mustFailValidate("fabricated limit.filled", {
      ...initPayload,
      limits: [
        { price: 325, allocationPercent: 30, role: "starter", filled: true },
        { price: 323, allocationPercent: 40, role: "preferred" },
        { price: 320, allocationPercent: 30, role: "deep_pullback" },
      ],
    });
    assert.ok(
      errors.some((e) => e.toLowerCase().includes("fabricate")),
      errors.join("; ")
    );
  }

  // Fill-only still validates
  mustPassValidate("fill index", { planId: "PLAN-015", filledThroughIndex: 0 });
  mustPassValidate("status missed", { planId: "PLAN-015", status: "missed" });

  // --- Exact user flow: Validate → Accept on PLAN-015 with no layeredEntry ---
  {
    resetStores([basePlan()]);
    const block = {
      type: "layered-entry-update",
      source: "ai-block",
      proposal: { ...initPayload },
    };
    const parsed = parseTradingInboxPayload(block);
    assert.ok(parsed);
    const validated = validateProposalPayload(parsed!);
    assert.equal(
      validated.ok,
      true,
      validated.ok ? "" : (validated as { errors: string[] }).errors.join("; ")
    );

    const accepted = await applyTradingProposal(block);
    assert.equal(accepted.ok, true, accepted.ok ? "" : accepted.errors?.join("; "));
    assert.equal(accepted.planId, "PLAN-015");

    const plans = await getPlans();
    assert.equal(plans.length, 1);
    assert.equal(plans[0]!.id, "PLAN-015");
    assert.ok(plans[0]!.layeredEntry);
    assert.equal(plans[0]!.layeredEntry!.status, "planned");
    assert.ok(!plans[0]!.layeredEntry!.limits.some((l) => l.filled));
    assert.equal(plans[0]!.linkedTradeId, undefined);

    // Second update (fill) against same OLE remains functional
    const fillBlock = {
      type: "layered-entry-update",
      source: "ai-block",
      proposal: { planId: "PLAN-015", filledThroughIndex: 0 },
    };
    const fillValidated = validateProposalPayload(parseTradingInboxPayload(fillBlock)!);
    assert.equal(fillValidated.ok, true);
    const fillAccepted = await applyTradingProposal(fillBlock);
    assert.equal(fillAccepted.ok, true, fillAccepted.ok ? "" : fillAccepted.errors?.join("; "));
    const afterFill = await getPlanById("PLAN-015");
    assert.equal(afterFill!.layeredEntry!.status, "partial");
    assert.equal(afterFill!.layeredEntry!.limits[0]!.filled, true);
    assert.equal((await getPlans()).length, 1);
  }

  // --- 1. Existing Scout + no layeredEntry → initializes ---
  {
    resetStores([basePlan()]);
    const before = await getPlans();
    assert.equal(before.length, 1);
    assert.equal(before[0]!.layeredEntry, undefined);

    const result = await recordLayeredEntryFromProposal({ ...initPayload });
    assert.ok(!result.errors?.length, result.errors?.join("; "));
    assert.equal(result.mode, "configure");
    assert.ok(result.plan?.layeredEntry);
    assert.equal(result.plan!.layeredEntry!.status, "planned");
    assert.equal(result.plan!.layeredEntry!.limits.length, 3);
    assert.equal(result.plan!.layeredEntry!.limits[0]!.allocationPercent, 30);
    assert.equal(result.plan!.layeredEntry!.limits[1]!.allocationPercent, 40);
    assert.equal(result.plan!.layeredEntry!.limits[2]!.allocationPercent, 30);
    assert.equal(result.plan!.layeredEntry!.commonStopPrice, 315);
    assert.equal(result.plan!.layeredEntry!.primaryTargetPrice, 370);
    assert.equal(result.plan!.layeredEntry!.authorizedRiskAmount, 100);
    assert.ok(!result.plan!.layeredEntry!.limits.some((l) => l.filled));

    // --- 7. Does not create a new Plan ---
    const after = await getPlans();
    assert.equal(after.length, 1);
    assert.equal(after[0]!.id, "PLAN-015");

    // --- 8. Does not create Trade/fill/accounting side effects on plan ---
    assert.equal(after[0]!.linkedTradeId, undefined);
    assert.equal(after[0]!.outcome, undefined);

    // --- 9. Re-apply identical payload is idempotent ---
    const again = await recordLayeredEntryFromProposal({ ...initPayload });
    assert.ok(!again.errors?.length, again.errors?.join("; "));
    assert.equal((await getPlans()).length, 1);
    assert.equal(again.plan!.layeredEntry!.limits[1]!.price, 323);
    assert.equal(again.plan!.layeredEntry!.status, "planned");
  }

  // --- 2. Existing Scout + existing layeredEntry → updates (configure replace) ---
  {
    const existing = authorizeLayeredEntry(
      parseLayeredEntryInput({
        executionMethod: "layered_limits",
        stopModel: "common",
        sizingMode: "risk_percent",
        authorizedRiskAmount: 100,
        commonStopPrice: 315,
        primaryTargetPrice: 370,
        limits: [
          { price: 325, allocationPercent: 20, role: "starter" },
          { price: 322, allocationPercent: 70, role: "preferred" },
          { price: 320, allocationPercent: 10, role: "deep_pullback" },
        ],
      })!,
      { primaryTargetPrice: 370, planStopPrice: 315 }
    );
    resetStores([basePlan({ layeredEntry: existing, executionMethod: "layered_limits" })]);
    const result = await recordLayeredEntryFromProposal({ ...initPayload });
    assert.ok(!result.errors?.length, result.errors?.join("; "));
    assert.equal(result.mode, "configure");
    assert.equal(result.plan!.layeredEntry!.limits[1]!.allocationPercent, 40);
    assert.equal(result.plan!.layeredEntry!.limits[1]!.price, 323);
    assert.equal((await getPlans()).length, 1);
  }

  // --- 2b / 12. Existing layeredEntry fill update remains backward compatible ---
  {
    const existing = authorizeLayeredEntry(
      parseLayeredEntryInput({
        executionMethod: "layered_limits",
        limits: [
          { price: 325, allocationPercent: 30, role: "starter" },
          { price: 323, allocationPercent: 40, role: "preferred" },
          { price: 320, allocationPercent: 30, role: "deep_pullback" },
        ],
        commonStopPrice: 315,
        primaryTargetPrice: 370,
        authorizedRiskAmount: 100,
        sizingMode: "risk_percent",
        stopModel: "common",
      })!,
      {}
    );
    resetStores([basePlan({ layeredEntry: existing, executionMethod: "layered_limits" })]);
    const fill = await recordLayeredEntryFromProposal({
      planId: "PLAN-015",
      filledThroughIndex: 0,
    });
    assert.ok(!fill.errors?.length, fill.errors?.join("; "));
    assert.equal(fill.mode, "fill");
    assert.equal(fill.plan!.layeredEntry!.status, "partial");
    assert.equal(fill.plan!.layeredEntry!.limits[0]!.filled, true);
    assert.equal(fill.plan!.layeredEntry!.limits[1]!.filled, false);

    const pure = applyLayeredEntryUpdate(basePlan({ layeredEntry: existing }), {
      filledThroughIndex: 1,
    });
    assert.ok(pure.plan);
    assert.equal(pure.plan!.layeredEntry!.status, "partial");
  }

  // --- 3. Unknown planId rejected ---
  {
    resetStores([basePlan()]);
    const result = await recordLayeredEntryFromProposal({
      ...initPayload,
      planId: "PLAN-9999",
    });
    assert.ok(result.errors?.some((e) => e.toLowerCase().includes("not found")));
    assert.equal((await getPlans()).length, 1);
  }

  // Fill mode without layeredEntry still rejected (with guidance)
  {
    resetStores([basePlan()]);
    const result = await recordLayeredEntryFromProposal({
      planId: "PLAN-015",
      filledThroughIndex: 0,
    });
    assert.ok(result.errors?.some((e) => e.toLowerCase().includes("no layered entry")));
  }

  // --- 11. scout-plan-create layeredEntry remains backward compatible ---
  {
    resetStores([]);
    const created = await applyScoutPlanCreate({
      stockFileId: thesis.id,
      ticker: "AVGO",
      plannedEntry: 325,
      stopPrice: 315,
      targetPrice: 370,
      status: "watching",
      executionInstruction:
        "Buy 30% at $325. Add 40% at $323. Complete 30% at $320. Common stop $315. Target $370. Do not chase.",
      layeredEntry: {
        executionMethod: "layered_limits",
        stopModel: "common",
        sizingMode: "risk_percent",
        authorizedRiskAmount: 100,
        commonStopPrice: 315,
        primaryTargetPrice: 370,
        limits: [
          { price: 325, allocationPercent: 30, role: "starter" },
          { price: 323, allocationPercent: 40, role: "preferred" },
          { price: 320, allocationPercent: 30, role: "deep_pullback" },
        ],
      },
    });
    assert.ok(!created.errors?.length, created.errors?.join("; "));
    assert.ok(created.plan?.layeredEntry);
    assert.equal(created.plan!.layeredEntry!.limits.length, 3);
    assert.notEqual(created.plan!.id, "PLAN-015");
  }

  // AI sample matches init semantics
  {
    const sample = AI_BLOCK_SAMPLES["layered-entry-update"] as {
      proposal: Record<string, unknown>;
    };
    assert.equal(sample.proposal.planId, "PLAN-015");
    assert.ok(Array.isArray(sample.proposal.limits));
    mustPassValidate("ai sample", sample.proposal);

    const canonical = LAYERED_ENTRY_UPDATE_INIT_EXAMPLE;
    assert.equal(canonical.type, "layered-entry-update");
    assert.equal(canonical.proposal.limits[1].allocationPercent, 40);
  }

  // Pure configure helper
  {
    const layered = parseLayeredEntryInput({
      executionMethod: "layered_limits",
      ...initPayload,
    });
    assert.ok(layered);
    assert.equal(validateLayeredEntry(layered!).length, 0);
    const applied = applyLayeredEntryConfigure(basePlan(), { layered: layered! });
    assert.ok(applied.plan?.layeredEntry);
    assert.equal(applied.plan!.id, "PLAN-015");
  }

  // Persist reload
  {
    resetStores([basePlan()]);
    await recordLayeredEntryFromProposal({ ...initPayload });
    const reloaded = await getPlanById("PLAN-015");
    assert.ok(reloaded?.layeredEntry);
    assert.equal(reloaded!.layeredEntry!.sizingMode, "risk_percent");
    assert.equal(reloaded!.layeredEntry!.stopModel, "common");
  }

  cleanup();
  console.log("ok — test-ole-init-15-21");
}

main().catch((err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});
