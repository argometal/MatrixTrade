/**
 * Plan Map operational paragraph — AI execution instruction only.
 * Deterministic formatter remains unit-tested in isolation (legacy).
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

// Legacy pure formatter — still deterministic (not used by Plan Map)
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

// Plan Map — no AI text → no sentence (no template fallback)
{
  const plan = basePlan({ layeredEntry: undefined });
  const model = buildPlanMapModel(buildPlanLevelsView(thesis, plan));
  assert.equal(model.mode, "single_entry");
  assert.equal(model.operationalParagraph, undefined);
}

// Plan Map — AI instruction displayed verbatim
{
  const aiText =
    "Buy 8 shares at exactly $310.00. Place the stop immediately at $294.00. Hold until the primary target at $380.";
  const model = buildPlanMapModel(
    buildPlanLevelsView(thesis, basePlan({ executionInstruction: aiText }))
  );
  assert.equal(model.operationalParagraph, aiText);
}

// Structured levels + notes do not synthesize a sentence
{
  const plan = basePlan({
    chatNotes: "Enter at 310 with stop at 294 and primary target at 380.",
    thesis: "Enter 2 shares at 315, 3 at 310, 3 at 305",
    layeredEntry: {
      executionMethod: "layered_limits",
      noChase: true,
      status: "planned",
      sizingMode: "risk_percent",
      stopModel: "common",
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      limits: [
        { price: 315, allocationPercent: 20, role: "starter" },
        { price: 310, allocationPercent: 50, role: "preferred" },
        { price: 305, allocationPercent: 30, role: "deep_pullback" },
      ],
    },
  });
  const model = buildPlanMapModel(buildPlanLevelsView(thesis, plan));
  assert.equal(model.mode, "layered");
  assert.equal(model.operationalParagraph, undefined);
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
