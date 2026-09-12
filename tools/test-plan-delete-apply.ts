/**
 * MXT 035 — plan-delete Apply contract (memory stores; no live Supabase delete).
 * Run: npx tsx tools/test-plan-delete-apply.ts
 */
import assert from "node:assert/strict";
import { parseAiBlock } from "../lib/ai-block";
import {
  buildApplySchemaContract,
  buildApplySchemaContractText,
} from "../lib/apply-schema-contract";
import { applyTradingProposal } from "../lib/apply-trading-inbox";
import { validateProposalPayload } from "../lib/bridge";
import {
  deletePlanFromProposal,
  validatePlanDeleteProposal,
} from "../lib/contaminated-plan-delete";
import {
  __setLearningOutcomesStoreForTests,
  createMemoryLearningOutcomesStore,
} from "../lib/learning-outcomes-store";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import { __setTradesStoreForTests, createMemoryTradesStore } from "../lib/trades-json";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";

function dupPlan(id: string): TradePlan {
  const now = "2026-08-16T09:06:42.252Z";
  return {
    id,
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    playbookId: "expectancy-asymmetry",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    outcome: {
      planId: id,
      recordedAt: now,
      outcomeKind: "duplicate_creation",
      tradeExecuted: false,
      entryTriggered: null,
      stopTriggered: null,
      targetTriggered: null,
      theoreticalResultR: null,
      realizedResultR: 0,
      outcomeSource: "manual_review",
      evidenceStatus: "partial",
      evidenceRefs: [],
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  } as TradePlan;
}

function keepPlan(): TradePlan {
  const now = "2026-07-25T10:53:39.336Z";
  return {
    id: "PLAN-010",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX-001",
    playbookId: "expectancy-asymmetry",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    createdAt: now,
    updatedAt: now,
  } as TradePlan;
}

async function withStores(
  plans: TradePlan[],
  los: LearningOutcome[],
  trades: Trade[],
  fn: () => Promise<void>
): Promise<void> {
  __setPlansStoreForTests(createMemoryPlansStore(plans));
  __setLearningOutcomesStoreForTests(createMemoryLearningOutcomesStore(los));
  __setTradesStoreForTests(createMemoryTradesStore(trades));
  try {
    await fn();
  } finally {
    __setPlansStoreForTests(null);
    __setLearningOutcomesStoreForTests(null);
    __setTradesStoreForTests(null);
  }
}

async function main() {
  // Schema advertises plan-delete
  const contract = buildApplySchemaContract();
  assert.ok(contract.acceptedTypes.includes("plan-delete"));
  assert.deepEqual(contract.requiredFields["plan-delete"], [
    "planId",
    "reason (≥8)",
  ]);
  assert.ok(contract.examples["plan-delete"]);
  const text = buildApplySchemaContractText();
  assert.match(text, /- plan-delete/);
  assert.match(text, /planId/);
  assert.match(text, /Confirmed contaminated duplicate Plan/);

  // missing planId / reason → Validate reject
  assert.equal(validatePlanDeleteProposal({ reason: "long enough reason" }).ok, false);
  assert.equal(validatePlanDeleteProposal({ planId: "PLAN-011" }).ok, false);
  assert.equal(
    validateProposalPayload({
      type: "plan-delete",
      proposal: { planId: "PLAN-011" },
    }).ok,
    false
  );
  assert.equal(
    validateProposalPayload({
      type: "plan-delete",
      proposal: { reason: "Confirmed contaminated duplicate Plan." },
    }).ok,
    false
  );

  // valid schema → Validate PASS (parseAiBlock)
  const block = JSON.stringify({
    type: "plan-delete",
    source: "ai-block",
    proposal: {
      planId: "PLAN-011",
      reason: "Confirmed contaminated duplicate Plan.",
    },
  });
  const parsed = parseAiBlock(block);
  assert.equal(parsed.ok, true, parsed.ok ? "" : parsed.error);
  if (!parsed.ok) throw new Error("unreachable");

  await withStores(
    [keepPlan(), dupPlan("PLAN-011")],
    [],
    [],
    async () => {
      // Accept can delete contaminated
      const applied = await applyTradingProposal(parsed.body);
      assert.equal(applied.ok, true, applied.ok ? "" : applied.errors.join("; "));
      if (!applied.ok) throw new Error("unreachable");
      assert.equal(applied.planId, "PLAN-011");
      assert.match(applied.message, /Deleted contaminated Plan PLAN-011/);

      // PLAN-010 untouched
      const { getPlanById } = await import("../lib/plans");
      assert.ok(await getPlanById("PLAN-010"));
      assert.equal(await getPlanById("PLAN-011"), undefined);
    }
  );

  // unknown Plan → Accept reject
  await withStores([keepPlan()], [], [], async () => {
    const bad = await deletePlanFromProposal({
      planId: "PLAN-099",
      reason: "Confirmed contaminated duplicate Plan.",
    });
    assert.equal(bad.ok, false);
    if (bad.ok) throw new Error("unreachable");
    assert.ok(bad.errors.some((e) => /not found/i.test(e)));
  });

  // Plan with protected Trade dependency → Accept reject
  await withStores(
    [dupPlan("PLAN-011")],
    [],
    [
      {
        id: "H999",
        ticker: "NFLX",
        planId: "PLAN-011",
        status: "closed",
        entry: 60,
        stop: 55,
        shares: 1,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      } as Trade,
    ],
    async () => {
      const bad = await deletePlanFromProposal({
        planId: "PLAN-011",
        reason: "Confirmed contaminated duplicate Plan.",
      });
      assert.equal(bad.ok, false);
      if (bad.ok) throw new Error("unreachable");
      assert.ok(bad.errors.some((e) => /trade/i.test(e)));
    }
  );

  // Legitimate non-duplicate Plan → Accept reject
  await withStores([keepPlan()], [], [], async () => {
    const bad = await deletePlanFromProposal({
      planId: "PLAN-010",
      reason: "Should not delete legitimate plan.",
    });
    assert.equal(bad.ok, false);
    if (bad.ok) throw new Error("unreachable");
    assert.ok(bad.errors.some((e) => /duplicate_creation/i.test(e)));
  });

  console.log("test-plan-delete-apply: PASS (no live Supabase Plans deleted)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
