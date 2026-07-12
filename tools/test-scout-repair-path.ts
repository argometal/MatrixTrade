import { validateProposalPayload, parseTradingInboxPayload } from "../lib/bridge";
import { computePlannedRR } from "../lib/plan-risk";
import {
  isActiveLinkedScoutPlan,
  proposalHasDecisionMutation,
  proposalHasTacticalFields,
} from "../lib/scout-plan-repair";
import type { TradePlan } from "../lib/plan-types";

const SHOP_BACKFILL = {
  type: "file-update",
  proposal: {
    id: "ST-SHOP-001",
    initialScout: {
      plannedEntry: 138.75,
      stopPrice: 125,
      targetPrice: 180,
      verdict: "wait",
      minimumRR: 3,
      thesis: "Only enter if SHOP reaches the maximum admissible entry while the bullish thesis remains valid.",
      notes: "Target 180 is the probable three-month objective. Target 200 is extended upside only.",
    },
  },
} as const;

const TACTICAL_CORRECTION = {
  type: "decision-update",
  proposal: {
    planId: "PLAN-001",
    plannedEntry: 140,
    stopPrice: 125,
    targetPrice: 180,
  },
} as const;

const DUPLICATE_BACKFILL = {
  type: "file-update",
  proposal: {
    id: "ST-SHOP-001",
    initialScout: {
      plannedEntry: 138.75,
      stopPrice: 125,
      targetPrice: 180,
    },
  },
} as const;

const INVALID_STOCK_FILE = {
  type: "file-update",
  proposal: {
    id: "ST-MISSING-999",
    initialScout: {
      plannedEntry: 100,
      stopPrice: 90,
      targetPrice: 130,
    },
  },
} as const;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function testValidation(): void {
  const shopParsed = parseTradingInboxPayload(SHOP_BACKFILL as Record<string, unknown>);
  assert(shopParsed !== null, "SHOP backfill payload should parse");
  const shopValidation = validateProposalPayload(shopParsed!);
  assert(shopValidation.ok === true, `SHOP backfill should validate: ${JSON.stringify(shopValidation)}`);

  const tacticalParsed = parseTradingInboxPayload(TACTICAL_CORRECTION as Record<string, unknown>);
  assert(tacticalParsed !== null, "Tactical correction payload should parse");
  const tacticalValidation = validateProposalPayload(tacticalParsed!);
  assert(
    tacticalValidation.ok === true,
    `Tactical correction should validate: ${JSON.stringify(tacticalValidation)}`
  );

  const invalidOnly = validateProposalPayload({
    type: "file-update",
    proposal: { id: "ST-SHOP-001" },
  });
  assert(invalidOnly.ok === false, "file-update without fields should fail validation");

  const rr = computePlannedRR(138.75, 125, 180);
  assert(rr !== null, "SHOP planned R should compute");
  if (rr) assert(Math.abs(rr.rr - 3) < 0.01, `SHOP planned R should be 3, got ${rr.rr}`);
}

function testPureHelpers(): void {
  assert(
    proposalHasTacticalFields(TACTICAL_CORRECTION.proposal),
    "Tactical correction should expose tactical fields"
  );
  assert(
    !proposalHasDecisionMutation(TACTICAL_CORRECTION.proposal),
    "Tactical-only correction should not require decision mutation"
  );

  const activePlan: TradePlan = {
    id: "PLAN-001",
    ticker: "SHOP",
    stockThesisId: "ST-SHOP-001",
    status: "watching",
    analysisTimeframes: ["1W", "1D"],
    entryTimeframe: "1D",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assert(
    isActiveLinkedScoutPlan(activePlan, "ST-SHOP-001"),
    "Watching linked plan should count as active scout"
  );
  assert(
    !isActiveLinkedScoutPlan({ ...activePlan, status: "expired" }, "ST-SHOP-001"),
    "Expired linked plan should not count as active scout"
  );
}

async function testApplyPaths(): Promise<void> {
  const { getStockThesisById } = await import("../lib/stock-theses");
  const { applyStockFileInboxUpdate } = await import("../lib/stock-theses");
  const { getPlans } = await import("../lib/plans");

  const missing = await applyStockFileInboxUpdate("ST-MISSING-999", INVALID_STOCK_FILE.proposal);
  assert(Boolean(missing.errors?.length), "Invalid Stock File id should fail apply");

  const shop = await getStockThesisById("ST-SHOP-001");
  if (!shop) {
    console.log("SKIP apply integration: ST-SHOP-001 not in local store (validation tests passed).");
    return;
  }

  const beforePlans = (await getPlans()).filter((plan) => plan.stockThesisId === shop.id);
  const backfill = await applyStockFileInboxUpdate(shop.id, SHOP_BACKFILL.proposal);
  if (beforePlans.some((plan) => plan.status === "watching" || plan.status === "ready" || plan.status === "entered")) {
    assert(Boolean(backfill.errors?.length), "Duplicate active scout should be rejected");
    assert(
      backfill.errors?.[0]?.includes("already has Scout Plan") ?? false,
      "Duplicate rejection should mention existing plan"
    );
  } else if (backfill.errors?.length) {
    throw new Error(`SHOP backfill failed: ${backfill.errors.join("; ")}`);
  } else {
    assert(Boolean(backfill.planId), "SHOP backfill should return planId");
    const afterPlan = (await getPlans()).find((plan) => plan.id === backfill.planId);
    assert(afterPlan !== undefined, "Backfilled plan should exist");
    assert(afterPlan?.plannedEntry === 138.75, "Backfilled entry mismatch");
    assert(afterPlan?.stopPrice === 125, "Backfilled stop mismatch");
    assert(afterPlan?.targetPrice === 180, "Backfilled target mismatch");
    assert(afterPlan?.plannedRR !== undefined && Math.abs(afterPlan.plannedRR - 3) < 0.01, "Backfilled R mismatch");
    assert(afterPlan?.decision?.verdict === "wait", "Backfilled verdict should be wait");
  }

  if (backfill.planId) {
    const { applyDecisionUpdateFromProposal } = await import("../lib/scout-plan-repair");
    const tactical = await applyDecisionUpdateFromProposal({
      planId: backfill.planId,
      plannedEntry: 137.5,
      stopPrice: 125,
      targetPrice: 180,
    });
    assert(!tactical.errors?.length, `Tactical correction failed: ${tactical.errors?.join("; ")}`);
    assert(tactical.plan?.plannedEntry === 137.5, "Tactical correction entry mismatch");
  }
}

async function main(): Promise<void> {
  testValidation();
  testPureHelpers();
  await testApplyPaths();
  console.log("scout-repair-path: all tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
