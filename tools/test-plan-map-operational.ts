/**
 * 30-0B — Plan Map operational paragraph from persisted plan data only.
 * Run: npm run test:plan-map-operational
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildPlanLevelsView } from "../lib/plan-levels-board";
import { buildPlanMapModel } from "../lib/scout-plan-map-model";
import {
  formatPlanMapOperationalParagraph,
} from "../lib/scout-plan-map-operational";
import { sizeLayerQuantities } from "../lib/layered-entry-risk";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

const thesis: StockThesis = {
  id: "ST-GOOGL-001",
  ticker: "GOOGL",
  status: "actionable",
  version: 1,
  style: "swing",
  thesis: "Layered pullback",
  historicalAnalysis: [],
  levels: {
    primaryZone: { low: 305, high: 315 },
    targets: [380, 390, 400],
  },
  riskRules: {
    minimumRR: 3,
    invalidation: "Weekly close below 294",
  },
  currentHypothesis: "Buy pullback in layers",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-007",
    ticker: "GOOGL",
    stockThesisId: thesis.id,
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

// Pure formatter — layered allocation % (no shares)
{
  const text = formatPlanMapOperationalParagraph({
    mode: "layered",
    allocationMeaning: "risk",
    stopModel: "common",
    commonStop: 294,
    primaryTarget: 380,
    layers: [
      { price: 315, allocationPercent: 20 },
      { price: 310, allocationPercent: 50 },
      { price: 305, allocationPercent: 30 },
    ],
  });
  assert.equal(
    text,
    "Enter with 20% of authorized risk at 315, 50% at 310, and 30% at 305. Use a common stop at 294 and primary target at 380. Any unfilled layer remains inactive."
  );
}

// Pure formatter — exact shares preferred over percentages
{
  const text = formatPlanMapOperationalParagraph({
    mode: "layered",
    allocationMeaning: "risk",
    stopModel: "common",
    commonStop: 294,
    primaryTarget: 380,
    layers: [
      { price: 315, allocationPercent: 20, shares: 2 },
      { price: 310, allocationPercent: 50, shares: 3 },
      { price: 305, allocationPercent: 30, shares: 3 },
    ],
  });
  assert.equal(
    text,
    "Enter 2 shares at 315, 3 shares at 310, and 3 shares at 305. Use a common stop at 294 and primary target at 380. Any unfilled layer remains inactive."
  );
  assert.doesNotMatch(text!, /20%|50%|30%/);
}

// Pure formatter — single-entry one sentence
{
  const text = formatPlanMapOperationalParagraph({
    mode: "single_entry",
    referenceEntry: 310,
    commonStop: 294,
    primaryTarget: 380,
    layers: [{ price: 310, stopPrice: 294 }],
  });
  assert.equal(
    text,
    "Enter at 310 with stop at 294 and primary target at 380."
  );
}

// Missing authorized risk → percentages preserved; no invented shares
{
  const text = formatPlanMapOperationalParagraph({
    mode: "layered",
    allocationMeaning: "risk",
    stopModel: "common",
    commonStop: 294,
    primaryTarget: 380,
    layers: [
      { price: 315, allocationPercent: 20 },
      { price: 310, allocationPercent: 50 },
      { price: 305, allocationPercent: 30 },
    ],
  });
  assert.match(text!, /20% of authorized risk at 315/);
  assert.doesNotMatch(text!, /\d+ shares/);
}

// Never hardcode — different persisted prices change the paragraph
{
  const text = formatPlanMapOperationalParagraph({
    mode: "layered",
    allocationMeaning: "position",
    stopModel: "common",
    commonStop: 100,
    primaryTarget: 200,
    layers: [
      { price: 150, allocationPercent: 40 },
      { price: 140, allocationPercent: 60 },
    ],
  });
  assert.equal(
    text,
    "Enter with 40% of planned position at 150 and 60% at 140. Use a common stop at 100 and primary target at 200. Any unfilled layer remains inactive."
  );
}

// Integration — layered plan via Plan Map model (allocation path; qty 0 → %)
{
  const plan = basePlan({
    layeredEntry: {
      executionMethod: "layered_limits",
      noChase: true,
      status: "planned",
      sizingMode: "risk_percent",
      stopModel: "common",
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      // no authorizedRiskAmount — shares unavailable
      limits: [
        { price: 315, allocationPercent: 20, role: "starter" },
        { price: 310, allocationPercent: 50, role: "preferred" },
        { price: 305, allocationPercent: 30, role: "deep_pullback" },
      ],
    },
  });
  const view = buildPlanLevelsView(thesis, plan);
  const model = buildPlanMapModel(view);
  assert.equal(model.mode, "layered");
  assert.equal(
    model.operationalParagraph,
    "Enter with 20% of authorized risk at 315, 50% at 310, and 30% at 305. Use a common stop at 294 and primary target at 380. Any unfilled layer remains inactive."
  );
  // Notes/reasoning must not affect paragraph
  const noisy = buildPlanMapModel(
    buildPlanLevelsView(
      thesis,
      basePlan({
        ...plan,
        thesis: "Enter 99 shares at 999 — ignore this",
        chatNotes: "Reasoning: use 2-3-3 hardcoded",
      })
    )
  );
  assert.equal(noisy.operationalParagraph, model.operationalParagraph);
}

// Integration — exact shares from calculated sizing outputs
{
  const limits = [
    { price: 315, allocationPercent: 20, role: "starter" as const },
    { price: 310, allocationPercent: 50, role: "preferred" as const },
    { price: 305, allocationPercent: 30, role: "deep_pullback" as const },
  ];
  const authorizedRisk = 500;
  const qtys = sizeLayerQuantities(
    limits,
    380,
    "common",
    294,
    "risk_percent",
    authorizedRisk
  );
  assert.ok(qtys.every((q) => q > 0), `expected positive shares, got ${qtys}`);
  const plan = basePlan({
    layeredEntry: {
      executionMethod: "layered_limits",
      noChase: true,
      status: "planned",
      sizingMode: "risk_percent",
      stopModel: "common",
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      authorizedRiskAmount: authorizedRisk,
      limits: limits.map((limit, i) => ({
        ...limit,
        derived: {
          riskPerShare: limit.price - 294,
          rewardPerShare: 380 - limit.price,
          rr: (380 - limit.price) / (limit.price - 294),
          riskSharePercent: limit.allocationPercent,
          plannedQuantity: qtys[i]!,
          plannedCapital: qtys[i]! * limit.price,
          plannedRiskAmount: qtys[i]! * (limit.price - 294),
        },
      })),
    },
  });
  const model = buildPlanMapModel(buildPlanLevelsView(thesis, plan));
  const expected = formatPlanMapOperationalParagraph({
    mode: "layered",
    allocationMeaning: "risk",
    stopModel: "common",
    commonStop: 294,
    primaryTarget: 380,
    layers: limits.map((limit, i) => ({
      price: limit.price,
      allocationPercent: limit.allocationPercent,
      shares: qtys[i],
    })),
  });
  assert.equal(model.operationalParagraph, expected);
  assert.match(model.operationalParagraph!, new RegExp(`${qtys[0]} shares at 315`));
  assert.match(model.operationalParagraph!, new RegExp(`${qtys[1]} shares at 310`));
  assert.match(model.operationalParagraph!, new RegExp(`${qtys[2]} shares at 305`));
  assert.doesNotMatch(model.operationalParagraph!, /%/);
}

// Integration — single-entry plan
{
  const plan = basePlan({ layeredEntry: undefined });
  const model = buildPlanMapModel(buildPlanLevelsView(thesis, plan));
  assert.equal(model.mode, "single_entry");
  assert.equal(
    model.operationalParagraph,
    "Enter at 310 with stop at 294 and primary target at 380."
  );
}

// UI renders operational paragraph from model
{
  const board = readFileSync(
    path.join(process.cwd(), "app/components/planning-preview/PlanLevelsBoard.tsx"),
    "utf8"
  );
  assert.match(board, /data-scout-plan-map-operational/);
  assert.match(board, /model\.operationalParagraph/);
}

console.log("test-plan-map-operational: ok");
