import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildPlanLevelsView } from "../lib/plan-levels-board";
import { buildPlanMapModel } from "../lib/scout-plan-map-model";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf8");
}

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

const layeredPlan: TradePlan = {
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
  decision: {
    id: "DEC-7",
    verdict: "wait",
    decisionConfidence: 80,
    challenges: ["timing"],
    decidedAt: "2026-07-28T00:00:00.000Z",
  },
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
      {
        price: 315,
        allocationPercent: 20,
        role: "starter",
        derived: {
          riskPerShare: 21,
          rewardPerShare: 65,
          rr: 3.1,
          riskSharePercent: 20,
          plannedQuantity: 0,
          plannedCapital: 0,
          plannedRiskAmount: 0,
        },
      },
      {
        price: 310,
        allocationPercent: 50,
        role: "preferred",
        filled: true,
        derived: {
          riskPerShare: 16,
          rewardPerShare: 70,
          rr: 4.4,
          riskSharePercent: 44,
          plannedQuantity: 3,
          plannedCapital: 930,
          plannedRiskAmount: 48,
        },
      },
      {
        price: 305,
        allocationPercent: 30,
        role: "deep_pullback",
        derived: {
          riskPerShare: 11,
          rewardPerShare: 75,
          rr: 6.8,
          riskSharePercent: 56,
          plannedQuantity: 4,
          plannedCapital: 1220,
          plannedRiskAmount: 44,
        },
      },
    ],
    averageEntry: 307.14,
    blendedRR: 5.08,
  },
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

{
  const view = buildPlanLevelsView(thesis, layeredPlan);
  const model = buildPlanMapModel(view);
  assert.equal(model.mode, "layered");
  assert.equal(model.layers.length, 3);
  assert.equal(model.referenceEntry, 310);
  assert.equal(model.commonStop, 294);
  assert.equal(model.layers[0].role, "Starter");
  assert.equal(model.layers[1].fillStatus, "filled");
  assert.equal(model.layers[0].allocationMeaning, "risk");
  assert.equal(model.layers[0].shares, undefined);
  assert.equal(model.layers[0].rrToPrimaryTarget, 3.1);
  assert.equal(model.extendedTargets.join(","), "400,390");
  assert.ok((model.referencePlanRR ?? 0) > 0);
  assert.ok((model.blendedRR ?? 0) > 0);
  assert.ok((model.filledPositionRR ?? 0) > 0);
  assert.equal(model.authorizedRisk, 100);
  assert.ok(model.roundedRisk !== model.authorizedRisk);
  assert.ok((model.requestedCapital ?? 0) >= 0);
}

{
  const single = buildPlanMapModel(
    buildPlanLevelsView(thesis, {
      ...layeredPlan,
      id: "PLAN-008",
      layeredEntry: undefined,
      plannedEntry: 310,
      stopPrice: 294,
      targetPrice: 380,
    })
  );
  assert.equal(single.mode, "single_entry");
  assert.equal(single.layers.length, 1);
}

{
  const perLayer = buildPlanMapModel(
    buildPlanLevelsView(thesis, {
      ...layeredPlan,
      id: "PLAN-009",
      layeredEntry: {
        ...layeredPlan.layeredEntry!,
        stopModel: "per_layer",
        limits: layeredPlan.layeredEntry!.limits.map((limit, index) => ({
          ...limit,
          stopPrice: 294 - index,
        })),
      },
    })
  );
  assert.equal(perLayer.stopModel, "per_layer");
  assert.equal(perLayer.layers[0].stopPrice, 294);
  assert.equal(perLayer.layers[1].stopPrice, 293);
}

async function main() {
  const board = await read("app/components/planning-preview/PlanLevelsBoard.tsx");
  const side = await read("app/components/planning-preview/PlanLevelsSidePanel.tsx");
  const planning = await read(
    "app/components/planning-preview/PreviewPlanning.tsx"
  );
  const fundingMenu = await read(
    "app/components/planning-preview/ScoutFundingExecutionMenu.tsx"
  );

  assert.match(board, /data-scout-trade-map-spine/);
  assert.match(board, /Layered entry|Single entry/);
  assert.match(board, /↑ Reward/);
  assert.match(board, /↓ Risk/);
  assert.match(board, /spacedTops|minGapPx/);
  assert.match(board, /Capital \/ risk summary/);
  assert.match(board, /Primary target/);
  assert.match(board, /Common stop/);
  assert.match(board, /Shares unconfigured/);
  assert.match(board, /data-scout-plan-map-operational/);
  assert.match(board, /model\.operationalParagraph/);
  assert.doesNotMatch(board, /PlanMapLevelRow/);
  assert.doesNotMatch(board, /shares:\\s*10|MANUAL_SHARES_PLACEHOLDER/);
  assert.match(side, /view\\.planId|view\.planId/);
  assert.match(side, /Hide plan map|Plan map/);
  assert.match(side, /data-scout-plan-map-panel/);
  assert.match(side, /data-scout-plan-map-hide/);
  assert.match(side, /fixed inset-x-0 top-\[var\(--mt-mobile-header\)\]/);
  // Hide must sit above page-help "?" (z-20) on mobile
  assert.match(side, /z-40/);

  const help = await read("app/components/preview/PageHelpPanel.tsx");
  assert.match(
    help,
    /has-\[\[data-scout-map-focus=true\]\]:\[&_\[data-page-help-trigger=icon\]\]:max-lg:hidden/
  );
  assert.match(help, /data-page-help-trigger="icon"/);
  assert.match(help, /z-20/);

  // Mobile: Scout chrome collapses when plan map focuses
  assert.match(planning, /data-scout-map-focus/);
  assert.match(planning, /hidden lg:flex lg:flex-1 lg:flex-col/);
  assert.match(planning, /htmlFor=\"scout-case\"/);
  assert.match(planning, />\s*Case\s*</);
  assert.doesNotMatch(
    planning,
    /scoutCards\.map\(\(card\) => \{\s*const selected = card\.key/
  );
  assert.match(planning, /Update operational state/);
  assert.match(planning, /Passed/);
  assert.match(planning, /Review 1D/);
  assert.match(planning, /Review 1W/);
  assert.match(planning, /Reanalyze/);
  assert.match(planning, /Unlikely/);
  assert.match(planning, /Armed/);
  assert.match(planning, /Prepare status update/);
  assert.match(planning, /prepareOperationalStatusUpdate/);
  assert.match(planning, /buildOperationalStatusPreview/);
  assert.match(planning, /data-scout-operational-preset/);
  assert.match(planning, /data-scout-operational-preview/);
  assert.match(planning, /data-scout-operational-error/);
  assert.match(planning, /data-scout-operational-json/);
  assert.match(planning, /openPanel\(\{\s*step:\s*"apply",\s*applyJson:/);
  assert.match(planning, /data-scout-operational-apply-link/);
  assert.match(planning, /Open Apply/);
  assert.match(planning, /stashControlApplyDraft/);
  assert.match(
    planning,
    /setQuickOperationalPhrase\(phrase\);\s*void prepareOperationalStatusUpdate\(phrase\)/
  );
  assert.match(planning, /data-scout-operational-tag/);
  assert.match(planning, /formatConsolidatedOperationalTag/);
  assert.match(planning, /ScoutFundingExecutionMenu/);
  assert.match(fundingMenu, /data-scout-funding-execution-menu/);
  assert.match(fundingMenu, /Funding &amp; execution|Funding & execution/);

  console.log("test-scout-plan-map: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
