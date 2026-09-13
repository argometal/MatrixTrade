/**
 * 17-0B — Propagate configured defaultRiskBudget into layered sizing.
 * Canonical engine only: authorizeLayeredEntry → recomputeLayeredEntryPlan → sizeLayerQuantities.
 * Run: npm run test:layered-qty-default-risk
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { appendDecision } from "../lib/scout-decision";
import {
  authorizeLayeredEntry,
  getPersistedLayerDisplayValues,
  parseLayeredEntryInput,
} from "../lib/layered-entry";
import { sizeLayerQuantities } from "../lib/layered-entry-risk";
import { buildPlanLevelsView } from "../lib/plan-levels-board";
import { getRules } from "../lib/storage";
import { applyScoutPlanCreate } from "../lib/scout-plan-create";
import {
  applyDecisionUpdateFromProposal,
  updatePlanTacticsFromProposal,
} from "../lib/scout-plan-repair";
import { buildPlanMapModel } from "../lib/scout-plan-map-model";
import {
  bindExecutionInstructionQuantities,
  normalizeExecutionInstruction,
} from "../lib/scout-execution-instruction";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import {
  __setStockThesesStoreForTests,
  createMemoryStockThesesStore,
} from "../lib/stock-theses-store";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

const GOOGL_INSTRUCTION =
  "Buy {qty} shares (20%) at $315. Buy {qty} shares (50%) at $310. Buy {qty} shares (30%) at $305. Use the common stop at $294 for the full position. Hold until the primary target at $380. Any layer not reached remains unfilled. Do not chase.";

const NFLX_INSTRUCTION =
  "Buy {qty} shares (40%) at $73. Buy {qty} shares (35%) at $72.2. Buy {qty} shares (25%) at $71.4. Use the common stop at $68. Hold until $88. Do not chase.";

const googlThesis: StockThesis = {
  id: "ST-GOOGL-001",
  ticker: "GOOGL",
  status: "actionable",
  version: 1,
  style: "swing",
  thesis: "Layered pullback",
  historicalAnalysis: [],
  levels: { primaryZone: { low: 305, high: 315 }, targets: [380] },
  riskRules: { minimumRR: 3, invalidation: "Weekly close below 294" },
  currentHypothesis: "Buy pullback in layers",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const nflxThesis: StockThesis = {
  id: "ST-NFLX-001",
  ticker: "NFLX",
  status: "actionable",
  version: 1,
  style: "swing",
  thesis: "Support entry — layered limits",
  historicalAnalysis: [],
  levels: { primaryZone: { low: 71, high: 73 }, targets: [88] },
  riskRules: { minimumRR: 3, invalidation: "Close below 68" },
  currentHypothesis: "Buy support in layers",
  createdAt: "2026-07-11T00:00:00.000Z",
  updatedAt: "2026-07-11T00:00:00.000Z",
};

const googlLayers = [
  { price: 315, allocationPercent: 20, role: "starter" as const },
  { price: 310, allocationPercent: 50, role: "preferred" as const },
  { price: 305, allocationPercent: 30, role: "deep_pullback" as const },
];

const nflxLayers = [
  { price: 73, allocationPercent: 40 },
  { price: 72.2, allocationPercent: 35 },
  { price: 71.4, allocationPercent: 25 },
];

function quantitiesFor(
  limits: Array<{ price: number; allocationPercent: number }>,
  target: number,
  stop: number,
  sizingMode: "risk_percent" | "position_percent",
  amount: number
) {
  return sizeLayerQuantities(limits, target, "common", stop, sizingMode, amount);
}

function resetStores(seedPlans: TradePlan[] = []) {
  __setPlansStoreForTests(createMemoryPlansStore(seedPlans));
  __setStockThesesStoreForTests(
    createMemoryStockThesesStore([googlThesis, nflxThesis])
  );
}

function cleanup() {
  __setPlansStoreForTests(null);
  __setStockThesesStoreForTests(null);
}

function baseWatching(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-GOOGL-001",
    ticker: "GOOGL",
    stockThesisId: googlThesis.id,
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 310,
    stopPrice: 294,
    targetPrice: 380,
    plannedRR: 4.4,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

async function main() {
  const configured = (await getRules()).defaultRiskBudget;
  assert.ok(
    configured !== undefined && Number.isFinite(configured) && configured > 0,
    "rules.defaultRiskBudget must be a positive number"
  );

  const googlAtConfigured = quantitiesFor(
    googlLayers,
    380,
    294,
    "risk_percent",
    configured
  );
  // Documented GOOGL ladder at the migration default of USD 100.
  if (configured === 100) {
    assert.deepEqual(googlAtConfigured, [0, 3, 2]);
  }

  // 1 — GOOGL 315 / 310 / 305 through Apply without explicit authorizedRiskAmount
  {
    resetStores([]);
    const created = await applyScoutPlanCreate({
      stockFileId: googlThesis.id,
      ticker: "GOOGL",
      plannedEntry: 310,
      stopPrice: 294,
      targetPrice: 380,
      layeredEntry: {
        executionMethod: "layered_limits",
        stopModel: "common",
        sizingMode: "risk_percent",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      },
      executionInstruction: GOOGL_INSTRUCTION,
    });
    assert.equal(created.errors, undefined, String(created.errors));
    const le = created.plan!.layeredEntry!;
    assert.equal(le.authorizedRiskAmount, configured);
    assert.deepEqual(
      le.limits.map((l) => l.derived?.plannedQuantity),
      googlAtConfigured
    );
    assert.equal(created.plan!.executionInstruction, GOOGL_INSTRUCTION);

    const view = buildPlanLevelsView(googlThesis, created.plan!);
    const model = buildPlanMapModel(view);
    assert.equal(model.mode, "layered");
    assert.deepEqual(
      model.layers.map((l) => l.shares),
      googlAtConfigured
    );
    assert.deepEqual(
      getPersistedLayerDisplayValues(created.plan!).map((l) => l.shares),
      googlAtConfigured
    );
    assert.equal(model.layers[0].allocationPercent, 20);
    assert.equal(model.layers[0].shares, googlAtConfigured[0]);
    assert.equal(
      model.operationalParagraph,
      bindExecutionInstructionQuantities(GOOGL_INSTRUCTION, le)
    );
    if (configured === 100) {
      assert.equal(
        model.operationalParagraph,
        "Buy 0 shares (20%) at $315. Buy 3 shares (50%) at $310. Buy 2 shares (30%) at $305. Use the common stop at $294 for the full position. Hold until the primary target at $380. Any layer not reached remains unfilled. Do not chase."
      );
    }
    assert.equal(
      normalizeExecutionInstruction(created.plan!.executionInstruction),
      normalizeExecutionInstruction(GOOGL_INSTRUCTION)
    );
  }

  // 2 — Existing NFLX seed ladder (no explicit amount, default position_percent)
  {
    resetStores([]);
    const created = await applyScoutPlanCreate({
      stockFileId: nflxThesis.id,
      ticker: "NFLX",
      plannedEntry: 73,
      stopPrice: 68,
      targetPrice: 88,
      layeredEntry: {
        executionMethod: "layered_limits",
        limits: nflxLayers,
      },
      executionInstruction: NFLX_INSTRUCTION,
    });
    assert.equal(created.errors, undefined, String(created.errors));
    const le = created.plan!.layeredEntry!;
    assert.equal(le.authorizedRiskAmount, configured);
    assert.equal(le.sizingMode, "position_percent");
    const expected = quantitiesFor(
      nflxLayers,
      88,
      68,
      "position_percent",
      configured
    );
    assert.deepEqual(
      le.limits.map((l) => l.derived?.plannedQuantity),
      expected
    );
    const model = buildPlanMapModel(
      buildPlanLevelsView(nflxThesis, created.plan!)
    );
    assert.deepEqual(
      model.layers.map((l) => l.shares),
      expected
    );
  }

  // 3 — Explicit authorizedRiskAmount overrides configured default
  {
    const explicit = 50;
    assert.notEqual(explicit, configured);
    const authorized = authorizeLayeredEntry(
      {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        authorizedRiskAmount: explicit,
        stopModel: "common",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      },
      { primaryTargetPrice: 380, planStopPrice: 294, defaultRiskBudget: 250 }
    );
    assert.equal(authorized.authorizedRiskAmount, explicit);
    assert.deepEqual(
      authorized.limits.map((l) => l.derived?.plannedQuantity),
      quantitiesFor(googlLayers, 380, 294, "risk_percent", explicit)
    );

    resetStores([baseWatching()]);
    const repaired = await updatePlanTacticsFromProposal({
      planId: "PLAN-GOOGL-001",
      layeredEntry: {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        authorizedRiskAmount: explicit,
        stopModel: "common",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      },
    });
    assert.equal(repaired.errors, undefined, String(repaired.errors));
    assert.equal(repaired.plan!.layeredEntry!.authorizedRiskAmount, explicit);
    assert.deepEqual(
      repaired.plan!.layeredEntry!.limits.map((l) => l.derived?.plannedQuantity),
      quantitiesFor(googlLayers, 380, 294, "risk_percent", explicit)
    );
  }

  // 4 — Changed defaultRiskBudget is not a hardcoded USD 100
  {
    const alt = 250;
    assert.notEqual(alt, 100);
    const at100 = authorizeLayeredEntry(
      {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      },
      { primaryTargetPrice: 380, planStopPrice: 294, defaultRiskBudget: 100 }
    );
    const at250 = authorizeLayeredEntry(
      {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      },
      { primaryTargetPrice: 380, planStopPrice: 294, defaultRiskBudget: alt }
    );
    assert.equal(at100.authorizedRiskAmount, 100);
    assert.equal(at250.authorizedRiskAmount, alt);
    assert.deepEqual(
      at100.limits.map((l) => l.derived?.plannedQuantity),
      [0, 3, 2]
    );
    assert.deepEqual(
      at250.limits.map((l) => l.derived?.plannedQuantity),
      quantitiesFor(googlLayers, 380, 294, "risk_percent", alt)
    );
    assert.notDeepEqual(
      at100.limits.map((l) => l.derived?.plannedQuantity),
      at250.limits.map((l) => l.derived?.plannedQuantity)
    );

    const decided = appendDecision(
      baseWatching(),
      {
        verdict: "go",
        decisionConfidence: 70,
        challenges: ["gap"],
      },
      undefined,
      parseLayeredEntryInput({
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      })!,
      { defaultRiskBudget: alt }
    );
    assert.equal(decided.errors, undefined, String(decided.errors));
    assert.equal(decided.plan.layeredEntry?.authorizedRiskAmount, alt);
  }

  // 5 — Single-entry / non-layered plans remain unchanged
  {
    resetStores([]);
    const instruction =
      "Buy at exactly $310. Place the stop at $294. Hold until $380. Do not chase.";
    const created = await applyScoutPlanCreate({
      stockFileId: googlThesis.id,
      ticker: "GOOGL",
      plannedEntry: 310,
      stopPrice: 294,
      targetPrice: 380,
      executionInstruction: instruction,
    });
    assert.equal(created.errors, undefined, String(created.errors));
    assert.equal(created.plan!.layeredEntry, undefined);
    assert.equal(created.plan!.plannedEntry, 310);
    assert.equal(created.plan!.stopPrice, 294);
    assert.equal(created.plan!.targetPrice, 380);
    assert.equal(created.plan!.executionInstruction, instruction);
    const model = buildPlanMapModel(
      buildPlanLevelsView(googlThesis, created.plan!)
    );
    assert.equal(model.mode, "single_entry");
    assert.equal(model.layerCount, 1);
    assert.equal(model.layers[0].allocationPercent, undefined);
    assert.equal(model.layers[0].shares, undefined);
    assert.equal(model.operationalParagraph, instruction);
  }

  // 6 — Zero executable shares stay visible (not “unavailable”)
  {
    const authorized = authorizeLayeredEntry(
      {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      },
      { primaryTargetPrice: 380, planStopPrice: 294, defaultRiskBudget: 100 }
    );
    const display = getPersistedLayerDisplayValues({
      layeredEntry: authorized,
      stopPrice: 294,
      targetPrice: 380,
    });
    assert.equal(display[0]!.shares, 0);
    assert.equal(display[0]!.sharesUnavailable, false);
    const model = buildPlanMapModel(
      buildPlanLevelsView(googlThesis, {
        ...baseWatching({ layeredEntry: authorized }),
      })
    );
    assert.equal(model.layers[0].shares, 0);
    assert.equal(model.layers[0].sharesUnavailable, false);
    assert.equal(model.sharesUnavailableReason, undefined);
  }

  // 7 — Direct authorize without ctx still does not infer risk
  {
    const old = authorizeLayeredEntry({
      executionMethod: "layered_limits",
      limits: [
        { price: 315, allocationPercent: 20 },
        { price: 310, allocationPercent: 80 },
      ],
    });
    assert.equal(old.authorizedRiskAmount, undefined);
    assert.equal(old.limits[0].derived, undefined);
  }

  // 8 — Prompt/spec never teach the sizing formula; AI uses {qty} slots
  {
    const spec = readFileSync(
      path.join(process.cwd(), "md/matrix/execution-instruction-spec.md"),
      "utf8"
    );
    const guidance = readFileSync(
      path.join(process.cwd(), "lib/scout-execution-instruction.ts"),
      "utf8"
    );
    const brief = readFileSync(
      path.join(process.cwd(), "lib/matrix-mechanics-brief.ts"),
      "utf8"
    );
    const aiBlock = readFileSync(
      path.join(process.cwd(), "lib/ai-block.ts"),
      "utf8"
    );
    for (const src of [spec, guidance, brief, aiBlock]) {
      assert.match(src, /Buy \{qty\} shares/);
      assert.doesNotMatch(src, /layerRiskBudget/);
      assert.doesNotMatch(src, /Math\.floor\(layerRiskBudget/);
    }
    const persistCreate = readFileSync(
      path.join(process.cwd(), "lib/scout-plan-create.ts"),
      "utf8"
    );
    assert.doesNotMatch(persistCreate, /bindExecutionInstructionQuantities/);
    const persistRepair = readFileSync(
      path.join(process.cwd(), "lib/scout-plan-repair.ts"),
      "utf8"
    );
    assert.doesNotMatch(persistRepair, /bindExecutionInstructionQuantities/);
  }

  // 9 — Repair decision-update also sizes from configured default
  {
    resetStores([baseWatching()]);
    const updated = await applyDecisionUpdateFromProposal({
      planId: "PLAN-GOOGL-001",
      layeredEntry: {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 294,
        primaryTargetPrice: 380,
        limits: googlLayers,
      },
      executionInstruction: GOOGL_INSTRUCTION,
    });
    assert.equal(updated.errors, undefined, String(updated.errors));
    assert.equal(updated.plan!.layeredEntry!.authorizedRiskAmount, configured);
    assert.deepEqual(
      updated.plan!.layeredEntry!.limits.map((l) => l.derived?.plannedQuantity),
      googlAtConfigured
    );
    assert.equal(updated.plan!.executionInstruction, GOOGL_INSTRUCTION);
  }

  cleanup();
  console.log("test-layered-qty-default-risk-17-0b: ok");
  console.log(
    JSON.stringify(
      {
        configuredDefaultRiskBudget: configured,
        googlQtyAtConfigured: googlAtConfigured,
        nflxQtyAtConfigured: quantitiesFor(
          nflxLayers,
          88,
          68,
          "position_percent",
          configured
        ),
        googlQtyAt100: quantitiesFor(googlLayers, 380, 294, "risk_percent", 100),
        googlQtyAt250: quantitiesFor(googlLayers, 380, 294, "risk_percent", 250),
        googlQtyExplicit50: quantitiesFor(
          googlLayers,
          380,
          294,
          "risk_percent",
          50
        ),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
