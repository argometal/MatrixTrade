/**
 * Plan Map execution instruction — AI explanation layer only.
 * Run: npm run test:scout-execution-instruction
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildPlanLevelsView } from "../lib/plan-levels-board";
import { planRowToPlan, planToRow } from "../lib/plans-store/mapping";
import {
  normalizeExecutionInstruction,
  resolvePlanMapExecutionInstruction,
} from "../lib/scout-execution-instruction";
import { buildPlanMapModel } from "../lib/scout-plan-map-model";
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
    targets: [380],
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

// Normalize — empty omitted; never invents
{
  assert.equal(normalizeExecutionInstruction(""), undefined);
  assert.equal(normalizeExecutionInstruction("   "), undefined);
  assert.equal(normalizeExecutionInstruction(null), undefined);
  assert.equal(
    normalizeExecutionInstruction("  Buy 8 shares at exactly $310.00.  "),
    "Buy 8 shares at exactly $310.00."
  );
}

// Plan Map shows AI text only — no deterministic template fallback
{
  const without = buildPlanMapModel(buildPlanLevelsView(thesis, basePlan()));
  assert.equal(without.operationalParagraph, undefined);
  assert.equal(without.mode, "single_entry");

  const aiText =
    "Buy 8 shares at exactly $310.00. Place the stop immediately at $294.00. Maximum planned risk is approximately $100. Hold the position until the primary target at $380. Do not chase above the planned entry. If price never reaches the planned entry, do not execute the trade.";
  const withAi = buildPlanMapModel(
    buildPlanLevelsView(
      thesis,
      basePlan({ executionInstruction: aiText })
    )
  );
  assert.equal(withAi.operationalParagraph, aiText);
}

// Notes / thesis / structured levels do not invent the sentence
{
  const model = buildPlanMapModel(
    buildPlanLevelsView(
      thesis,
      basePlan({
        thesis: "Enter at 310 with stop at 294 and primary target at 380.",
        chatNotes: "Enter 99 shares at 999",
        layeredEntry: {
          executionMethod: "layered_limits",
          noChase: true,
          status: "planned",
          sizingMode: "risk_percent",
          stopModel: "common",
          commonStopPrice: 294,
          primaryTargetPrice: 380,
          authorizedRiskAmount: 100,
          limits: [
            { price: 315, allocationPercent: 30, role: "starter" },
            { price: 310, allocationPercent: 40, role: "preferred" },
            { price: 305, allocationPercent: 30, role: "deep_pullback" },
          ],
        },
      })
    )
  );
  assert.equal(model.mode, "layered");
  assert.equal(model.operationalParagraph, undefined);
  assert.equal(
    resolvePlanMapExecutionInstruction(basePlan()),
    undefined
  );
}

// Layered AI instruction passes through unchanged
{
  const aiText =
    "Buy the first 30% at $310. Add 40% at $305 if reached and complete the position at $300. Use the common stop at $294 for the full position. Hold until the primary target unless the thesis changes.";
  const model = buildPlanMapModel(
    buildPlanLevelsView(
      thesis,
      basePlan({ executionInstruction: aiText })
    )
  );
  assert.equal(model.operationalParagraph, aiText);
}

// Mapping round-trip nests instruction into decision / layered sidecars
{
  const aiText = "Buy 2 shares at 315. Use common stop at 294.";
  const plan = basePlan({
    executionInstruction: aiText,
    decision: {
      id: "D-1",
      verdict: "go",
      decisionConfidence: 70,
      challenges: ["gap"],
      decidedAt: "2026-07-01T00:00:00.000Z",
      decidedBy: "ai",
    },
    layeredEntry: {
      executionMethod: "layered_limits",
      noChase: true,
      status: "planned",
      limits: [
        { price: 315, allocationPercent: 50 },
        { price: 310, allocationPercent: 50 },
      ],
    },
  });
  const row = planToRow(plan);
  assert.equal(row.execution_instruction, aiText);
  assert.equal(
    (row.decision as { executionInstruction?: string } | null)?.executionInstruction,
    aiText
  );
  assert.equal(
    (row.layered_entry as { executionInstruction?: string } | null)?.executionInstruction,
    aiText
  );
  const roundTrip = planRowToPlan({
    ...row,
    execution_instruction: null,
  });
  assert.equal(roundTrip.executionInstruction, aiText);
  assert.equal(roundTrip.decision?.verdict, "go");
  assert.ok(roundTrip.layeredEntry);
  assert.equal(
    (roundTrip.layeredEntry as { executionInstruction?: string }).executionInstruction,
    undefined
  );
}

// UI still renders from model.operationalParagraph only
{
  const board = readFileSync(
    path.join(process.cwd(), "app/components/planning-preview/PlanLevelsBoard.tsx"),
    "utf8"
  );
  assert.match(board, /data-scout-plan-map-operational/);
  assert.match(board, /model\.operationalParagraph/);
}

// Plan Map model must not import the deterministic formatter
{
  const modelSrc = readFileSync(
    path.join(process.cwd(), "lib/scout-plan-map-model.ts"),
    "utf8"
  );
  assert.doesNotMatch(modelSrc, /formatPlanMapOperationalParagraph/);
  assert.match(modelSrc, /resolvePlanMapExecutionInstruction/);
}

console.log("test-scout-execution-instruction: ok");
