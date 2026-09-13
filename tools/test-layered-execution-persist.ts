/**
 * 30-07 — Layered execution must survive Apply → persist → reload universally.
 * Run: npm run test:layered-execution-persist
 */
import assert from "node:assert/strict";
import {
  appendDecision,
  parseLayeredEntryInput,
} from "../lib/scout-decision";
import {
  authorizeLayeredEntry,
  getPersistedLayerDisplayValues,
  layeredSharesAvailability,
  validateLayeredEntry,
} from "../lib/layered-entry";
import { sizeLayerQuantities } from "../lib/layered-entry-risk";
import { buildPlanLevelsView } from "../lib/plan-levels-board";
import { planRowToPlan, planToRow } from "../lib/plans-store/mapping";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import { getPlanById } from "../lib/plans";
import { applyScoutPlanCreate } from "../lib/scout-plan-create";
import { validateScoutPlanCreateProposal } from "../lib/scout-plan-create-validate";
import {
  applyDecisionUpdateFromProposal,
  updatePlanTacticsFromProposal,
} from "../lib/scout-plan-repair";
import { buildPlanMapModel } from "../lib/scout-plan-map-model";
import {
  __setStockThesesStoreForTests,
  createMemoryStockThesesStore,
} from "../lib/stock-theses-store";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

const thesis: StockThesis = {
  id: "ST-LAYER-001",
  ticker: "LAYER",
  status: "actionable",
  version: 1,
  style: "swing",
  thesis: "Layered pullback thesis",
  historicalAnalysis: [],
  levels: { primaryZone: { low: 200, high: 220 }, targets: [270] },
  riskRules: { minimumRR: 3, invalidation: "Close below 190" },
  currentHypothesis: "Buy pullback in layers",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const layeredPayload = {
  executionMethod: "layered_limits",
  stopModel: "common",
  sizingMode: "risk_percent",
  authorizedRiskAmount: 100,
  commonStopPrice: 200,
  primaryTargetPrice: 270,
  limits: [
    { price: 240, allocationPercent: 20, role: "starter", rationale: "starter" },
    { price: 233, allocationPercent: 40, role: "preferred", confidence: "medium" },
    { price: 228, allocationPercent: 40, role: "deep_pullback" },
  ],
};

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-LAYER-001",
    ticker: "LAYER",
    stockThesisId: thesis.id,
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 240,
    stopPrice: 200,
    targetPrice: 270,
    plannedRR: 1.5,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
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

async function main() {
// 1 — structured layered data survives Apply → persistence → reload
{
  resetStores([basePlan()]);
  const applied = await updatePlanTacticsFromProposal({
    planId: "PLAN-LAYER-001",
    layeredEntry: layeredPayload,
  });
  assert.equal(applied.errors, undefined, String(applied.errors));
  assert.ok(applied.plan?.layeredEntry);
  assert.equal(applied.plan!.layeredEntry!.limits.length, 3);
  assert.equal(applied.plan!.layeredEntry!.stopModel, "common");
  assert.equal(applied.plan!.layeredEntry!.sizingMode, "risk_percent");
  assert.equal(applied.plan!.layeredEntry!.authorizedRiskAmount, 100);
  assert.equal(applied.plan!.layeredEntry!.commonStopPrice, 200);
  assert.equal(applied.plan!.layeredEntry!.primaryTargetPrice, 270);
  assert.equal(applied.plan!.layeredEntry!.limits[0].allocationPercent, 20);
  assert.equal(applied.plan!.layeredEntry!.limits[0].rationale, "starter");
  assert.equal(applied.plan!.layeredEntry!.limits[1].confidence, "medium");

  const row = planToRow(applied.plan!);
  const reloaded = planRowToPlan(row as never);
  assert.ok(reloaded.layeredEntry);
  assert.equal(reloaded.layeredEntry!.limits.length, 3);
  assert.equal(reloaded.layeredEntry!.authorizedRiskAmount, 100);
  assert.deepEqual(
    reloaded.layeredEntry!.limits.map((l) => l.price),
    [240, 233, 228]
  );

  const fromStore = await getPlanById("PLAN-LAYER-001");
  assert.equal(fromStore?.layeredEntry?.limits.length, 3);
}

// 2 — all layers render after reload (never Single entry · 1 layer)
{
  const plan = await getPlanById("PLAN-LAYER-001");
  assert.ok(plan?.layeredEntry);
  const view = buildPlanLevelsView(thesis, plan!);
  const model = buildPlanMapModel(view);
  assert.equal(model.mode, "layered");
  assert.equal(model.layerCount, 3);
  assert.equal(model.layers.length, 3);
  assert.equal(model.layers[0].price, 240);
  assert.equal(model.layers[1].price, 233);
  assert.equal(model.layers[2].price, 228);
  assert.equal(model.layers[0].allocationPercent, 20);
  assert.equal(model.primaryTarget, 270);
  assert.equal(model.commonStop, 200);
}

// 3 — shares calculated from risk and stop distance (not hardcoded 2-3-3)
{
  const plan = await getPlanById("PLAN-LAYER-001");
  const le = plan!.layeredEntry!;
  const expected = sizeLayerQuantities(
    le.limits,
    le.primaryTargetPrice!,
    le.stopModel ?? "common",
    le.commonStopPrice,
    le.sizingMode ?? "risk_percent",
    le.authorizedRiskAmount!
  );
  assert.deepEqual(
    le.limits.map((l) => l.derived?.plannedQuantity),
    expected
  );
  // Prove not a fixed 2-3-3 (or any constant) share template
  assert.notDeepEqual(expected, [2, 3, 3]);
  assert.ok(expected.every((q) => Number.isInteger(q) && q >= 0));
  // risk_percent: layer risk ≈ alloc% of authorized (floor)
  for (const [i, limit] of le.limits.entries()) {
    const riskPerShare = limit.price - (le.commonStopPrice ?? 0);
    const layerBudget = (100 * limit.allocationPercent) / 100;
    assert.equal(expected[i], Math.floor(layerBudget / riskPerShare));
  }
}

// 4 — Apply without explicit authorizedRiskAmount sizes from configured defaultRiskBudget
{
  const { getRules } = await import("../lib/storage");
  const configured = (await getRules()).defaultRiskBudget;
  resetStores([basePlan()]);
  const noExplicitAmount = {
    executionMethod: "layered_limits",
    stopModel: "common",
    sizingMode: "position_percent",
    commonStopPrice: 200,
    primaryTargetPrice: 270,
    limits: [
      { price: 240, allocationPercent: 50, role: "starter" },
      { price: 230, allocationPercent: 50, role: "preferred" },
    ],
  };
  const applied = await updatePlanTacticsFromProposal({
    planId: "PLAN-LAYER-001",
    layeredEntry: noExplicitAmount,
  });
  assert.equal(applied.errors, undefined, String(applied.errors));
  const le = applied.plan!.layeredEntry!;
  assert.equal(le.limits.length, 2);
  assert.equal(le.authorizedRiskAmount, configured);
  const expected = sizeLayerQuantities(
    le.limits,
    le.primaryTargetPrice!,
    le.stopModel ?? "common",
    le.commonStopPrice,
    le.sizingMode ?? "position_percent",
    configured!
  );
  assert.deepEqual(
    le.limits.map((l) => l.derived?.plannedQuantity),
    expected
  );
  const availability = layeredSharesAvailability(le);
  assert.equal(availability.available, true);

  const view = buildPlanLevelsView(thesis, applied.plan!);
  const model = buildPlanMapModel(view);
  assert.equal(model.mode, "layered");
  assert.equal(model.layerCount, 2);
  assert.equal(model.layers[0].allocationPercent, 50);
  assert.equal(model.layers[0].shares, expected[0]);
  assert.equal(model.sharesUnavailableReason, undefined);

  // Direct authorize without ctx still does not infer a silent USD 100.
  const unsized = authorizeLayeredEntry({
    executionMethod: "layered_limits",
    stopModel: "common",
    sizingMode: "position_percent",
    commonStopPrice: 200,
    primaryTargetPrice: 270,
    limits: [
      { price: 240, allocationPercent: 50, role: "starter" },
      { price: 230, allocationPercent: 50, role: "preferred" },
    ],
  });
  assert.equal(unsized.authorizedRiskAmount, undefined);
  assert.equal(unsized.limits[0].derived, undefined);
}

// 5 — no layers reconstructed from reasoning / notes / thesis text
{
  resetStores([
    basePlan({
      thesis: "Layered 30/40/30 at 240/233/228 with stop 200",
      chatNotes: "Reasoning: use 2-3-3 shares across three limits",
    }),
  ]);
  const waitOnly = await applyDecisionUpdateFromProposal({
    planId: "PLAN-LAYER-001",
    verdict: "wait",
    decisionConfidence: 70,
    challenges: ["timing"],
    reasoning: "Prefer layered limits at 240, 233, 228 allocating 20/40/40",
  });
  assert.equal(waitOnly.errors, undefined, String(waitOnly.errors));
  assert.equal(waitOnly.plan?.layeredEntry, undefined);
  const view = buildPlanLevelsView(thesis, waitOnly.plan!);
  const model = buildPlanMapModel(view);
  assert.equal(model.mode, "single_entry");
  assert.equal(model.layerCount, 1);
}

// 6 — single-entry plans remain single-entry (no default layers)
{
  resetStores([basePlan()]);
  const plan = await getPlanById("PLAN-LAYER-001");
  const view = buildPlanLevelsView(thesis, plan!);
  const model = buildPlanMapModel(view);
  assert.equal(model.mode, "single_entry");
  assert.equal(model.layerCount, 1);
  assert.equal(model.layers[0].price, 240);
  assert.equal(model.layers[0].allocationPercent, undefined);
}

// 7 — allocations must total 100%
{
  const bad = validateLayeredEntry({
    executionMethod: "layered_limits",
    limits: [
      { price: 240, allocationPercent: 30 },
      { price: 233, allocationPercent: 30 },
    ],
  });
  assert.ok(bad.some((e) => e.includes("100%")));

  const createBad = validateScoutPlanCreateProposal({
    stockFileId: thesis.id,
    ticker: "LAYER",
    plannedEntry: 240,
    stopPrice: 200,
    targetPrice: 270,
    layeredEntry: {
      executionMethod: "layered_limits",
      limits: [
        { price: 240, allocationPercent: 40 },
        { price: 230, allocationPercent: 40 },
      ],
    },
  });
  assert.equal(createBad.ok, false);
  if (!createBad.ok) assert.ok(createBad.errors.some((e) => e.includes("100%")));

  resetStores([basePlan()]);
  const tacticsBad = await updatePlanTacticsFromProposal({
    planId: "PLAN-LAYER-001",
    layeredEntry: {
      executionMethod: "layered_limits",
      limits: [
        { price: 240, allocationPercent: 40 },
        { price: 230, allocationPercent: 40 },
      ],
    },
  });
  assert.ok(tacticsBad.errors?.some((e) => e.includes("100%")));
  const unchanged = await getPlanById("PLAN-LAYER-001");
  assert.equal(unchanged?.layeredEntry, undefined);
}

// 8 — graphical and textual representations return identical layer values
{
  resetStores([basePlan()]);
  const applied = await updatePlanTacticsFromProposal({
    planId: "PLAN-LAYER-001",
    layeredEntry: layeredPayload,
  });
  const plan = applied.plan!;
  const textValues = getPersistedLayerDisplayValues(plan);
  const view = buildPlanLevelsView(thesis, plan);
  const model = buildPlanMapModel(view);
  assert.equal(model.layers.length, textValues.length);
  for (let i = 0; i < textValues.length; i++) {
    assert.equal(model.layers[i].price, textValues[i].price);
    assert.equal(model.layers[i].allocationPercent, textValues[i].allocationPercent);
    assert.equal(model.layers[i].shares, textValues[i].shares);
    assert.equal(model.layers[i].estimatedRisk, textValues[i].riskAllocated);
    assert.equal(model.layers[i].stopPrice, textValues[i].stopPrice);
  }
  assert.equal(model.primaryTarget, textValues[0].primaryTargetPrice);
}

// wait verdict must not wipe persisted layers
{
  resetStores([basePlan()]);
  await updatePlanTacticsFromProposal({
    planId: "PLAN-LAYER-001",
    layeredEntry: layeredPayload,
  });
  const afterWait = await applyDecisionUpdateFromProposal({
    planId: "PLAN-LAYER-001",
    verdict: "wait",
    decisionConfidence: 75,
    challenges: ["wait for pullback"],
  });
  assert.equal(afterWait.errors, undefined, String(afterWait.errors));
  assert.equal(afterWait.plan?.layeredEntry?.limits.length, 3);

  const direct = appendDecision(
    basePlan({
      layeredEntry: authorizeLayeredEntry(parseLayeredEntryInput(layeredPayload)!, {
        primaryTargetPrice: 270,
        planStopPrice: 200,
      }),
      executionMethod: "layered_limits",
    }),
    {
      verdict: "wait",
      decisionConfidence: 60,
      challenges: ["x"],
    }
  );
  assert.equal(direct.plan.layeredEntry?.limits.length, 3);
}

// scout-plan-create persists layeredEntry even with wait verdict
{
  resetStores([]);
  const created = await applyScoutPlanCreate({
    stockFileId: thesis.id,
    ticker: "LAYER",
    plannedEntry: 240,
    stopPrice: 200,
    targetPrice: 270,
    verdict: "wait",
    decisionConfidence: 80,
    challenges: ["timing"],
    layeredEntry: layeredPayload,
    executionInstruction:
      "Buy 30% at $240, add 40% at $230 if reached, complete at $220. Common stop $200. Hold to $270. Do not chase. Unfilled layers stay inactive.",
  });
  assert.equal(created.errors, undefined, String(created.errors));
  assert.ok(created.plan?.layeredEntry);
  assert.equal(created.plan!.layeredEntry!.limits.length, 3);
  assert.equal(created.plan!.layeredEntry!.authorizedRiskAmount, 100);
  const view = buildPlanLevelsView(thesis, created.plan!);
  const model = buildPlanMapModel(view);
  assert.equal(model.mode, "layered");
  assert.equal(model.layerCount, 3);
}

// forged shares in input are not authoritative
{
  const authorized = authorizeLayeredEntry(
    {
      executionMethod: "layered_limits",
      sizingMode: "risk_percent",
      authorizedRiskAmount: 100,
      stopModel: "common",
      commonStopPrice: 200,
      primaryTargetPrice: 270,
      limits: [
        {
          price: 240,
          allocationPercent: 50,
          derived: {
            riskPerShare: 1,
            rewardPerShare: 1,
            rr: 99,
            riskSharePercent: 50,
            plannedQuantity: 2,
            plannedCapital: 1,
            plannedRiskAmount: 1,
          },
        } as never,
        { price: 230, allocationPercent: 50 },
      ],
    },
    { primaryTargetPrice: 270, planStopPrice: 200 }
  );
  assert.notEqual(authorized.limits[0].derived?.plannedQuantity, 2);
  const expected = sizeLayerQuantities(
    authorized.limits,
    270,
    "common",
    200,
    "risk_percent",
    100
  );
  assert.equal(authorized.limits[0].derived?.plannedQuantity, expected[0]);
}


  cleanup();
  console.log("test-layered-execution-persist: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
