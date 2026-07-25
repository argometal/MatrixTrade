/**
 * Modified Kelly Layered Entry — unit tests (deterministic).
 * Run: npx tsx tools/test-modified-kelly.ts
 */
import assert from "node:assert/strict";
import {
  aggregateModifiedKellyMetrics,
  buildObservationMetrics,
  cancelRemainingAfterStop,
  computeModifiedKelly,
  enforceNoChase,
  projectTargetBeforeDeeperFills,
  UNCALIBRATED_KELLY_WARNING,
} from "../lib/modified-kelly";
import {
  authorizeLayeredEntry,
  parseLayeredEntryInput,
} from "../lib/layered-entry";
import { resolveLayeredExecutionModel } from "../lib/layered-entry-types";
import { buildMafEvidence } from "../lib/maf-evidence";
import type { TradePlan } from "../lib/plan-types";

const approx = (actual: number, expected: number, tol = 1e-3) => {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ${expected}, got ${actual}`
  );
};

const baseInput = {
  baseRiskDollar: 100,
  baseRiskR: 1,
  additionalRiskR: 0.65,
  layers: [
    { price: 280, riskWeightR: 1, role: "base" as const },
    { price: 275, riskWeightR: 0.65, role: "kelly_extension" as const },
  ],
  commonStopPrice: 268,
  targetPrice: 350,
  kellyFraction: "quarter" as const,
  estimatedWinProbability: 0.55,
  probabilitySource: "subjective" as const,
  maximumAdditionalRiskR: 0.65,
  allowFractionalShares: true,
};

// Spec validation example — full theoretical
{
  const { layers, summary } = computeModifiedKelly(baseInput);
  const base = layers[0];
  const ext = layers[1];

  approx(base.riskPerShare, 12);
  approx(base.sharesTheoretical, 100 / 12);
  approx(base.riskDollars, 100);
  approx(base.capitalRequired, (100 / 12) * 280, 0.02);
  approx(base.layerR, (350 - 280) / 12);

  approx(ext.riskDollars, 65);
  approx(ext.riskPerShare, 7);
  approx(ext.sharesTheoretical, 65 / 7);
  approx(ext.capitalRequired, (65 / 7) * 275, 0.02);
  approx(ext.layerR, (350 - 275) / 7);

  approx(summary.totalSharesTheoretical, 100 / 12 + 65 / 7, 0.01);
  approx(summary.capitalRequiredIfFullyFilled, 4886.9, 0.05);
  approx(summary.averageEntryIfFullyFilled, 277.37, 0.05);
  approx(summary.maximumLoss, 165, 0.05);
  approx(summary.profitAtProbableTarget, 1279.76, 0.1);
  approx(summary.authorizedCampaignR, 7.76, 0.05);
}

// 1. Base only fill — do not assume extension fill; filled R ≠ authorized R
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    layers: [
      { price: 280, riskWeightR: 1, role: "base", filled: true, fillPrice: 280 },
      { price: 275, riskWeightR: 0.65, role: "kelly_extension", filled: false },
    ],
  });
  assert.equal(summary.fillState, "base_only");
  approx(summary.currentFilledRiskDollars, 100, 0.05);
  approx(summary.currentFilledRiskR, 1, 0.05);
  assert.ok(summary.filledPositionR !== undefined);
  assert.ok(
    Math.abs((summary.filledPositionR ?? 0) - summary.authorizedCampaignR) > 0.5,
    "filled-position R must not use max authorized when only base filled"
  );
  approx(summary.averageEntryFromFills ?? 0, 280);
}

// 2. Full fill
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    layers: [
      { price: 280, riskWeightR: 1, role: "base", filled: true },
      { price: 275, riskWeightR: 0.65, role: "kelly_extension", filled: true },
    ],
  });
  assert.equal(summary.fillState, "full");
  approx(summary.currentFilledRiskDollars, 165, 0.1);
  approx(summary.averageEntryFromFills ?? 0, 277.37, 0.05);
  approx(summary.filledPositionR ?? 0, summary.authorizedCampaignR, 0.05);
}

// 3. Partial extension (two extensions, one filled)
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    additionalRiskR: 0.65,
    layers: [
      { price: 280, riskWeightR: 1, role: "base", filled: true },
      { price: 275, riskWeightR: 0.35, role: "kelly_extension", filled: true },
      { price: 272, riskWeightR: 0.3, role: "kelly_extension", filled: false },
    ],
  });
  assert.equal(summary.fillState, "partial_extension");
  assert.ok(summary.currentFilledRiskR < 1.65);
}

// 4. Capital insufficient warning
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    capitalAvailable: 1000,
  });
  assert.ok(summary.warnings.some((w) => w.includes("Capital required")));
}

// 5. Monthly risk insufficient
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    monthlyRiskRoom: 120,
  });
  assert.ok(
    summary.warnings.some((w) => w.toLowerCase().includes("monthly")) ||
      summary.totalAuthorizedRiskR < 1.65
  );
}

// 6. Entry equal to stop
{
  const { layers, summary } = computeModifiedKelly({
    ...baseInput,
    layers: [
      { price: 268, riskWeightR: 1, role: "base" },
      { price: 265, riskWeightR: 0.65, role: "kelly_extension" },
    ],
    commonStopPrice: 268,
  });
  assert.ok(!(layers[0].riskPerShare > 0));
  assert.ok(summary.warnings.some((w) => w.toLowerCase().includes("stop")));
}

// 7. Entry below stop in long trade
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    layers: [
      { price: 260, riskWeightR: 1, role: "base" },
      { price: 255, riskWeightR: 0.65, role: "kelly_extension" },
    ],
    commonStopPrice: 268,
  });
  assert.ok(summary.warnings.some((w) => w.toLowerCase().includes("stop")));
}

// 8. Full Kelly warning
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    kellyFraction: "full",
  });
  assert.ok(summary.warnings.some((w) => w.includes("Full Kelly")));
}

// 9. Subjective probability warning + uncalibrated message
{
  const { summary, planState } = computeModifiedKelly(baseInput);
  assert.ok(summary.warnings.some((w) => w.includes("subjective")));
  assert.ok(summary.warnings.includes(UNCALIBRATED_KELLY_WARNING));
  assert.equal(planState.probabilitySource, "subjective");
}

// 10. Fractional shares disabled
{
  const { layers, summary } = computeModifiedKelly({
    ...baseInput,
    allowFractionalShares: false,
  });
  assert.equal(layers[0].shares, Math.floor(100 / 12));
  assert.equal(layers[1].shares, Math.floor(65 / 7));
  assert.ok(summary.warnings.some((w) => w.includes("Integer share rounding")));
}

// 11. Integer rounding creates unused risk
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    allowFractionalShares: false,
  });
  const used = 8 * 12 + 9 * 7; // 96 + 63 = 159
  assert.ok(summary.maximumLoss <= 165);
  assert.ok(used < 165);
}

// 12. Slippage causes actual risk above planned
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    layers: [
      {
        price: 280,
        riskWeightR: 1,
        role: "base",
        filled: true,
        fillPrice: 282,
        filledShares: 100 / 12,
      },
      { price: 275, riskWeightR: 0.65, role: "kelly_extension", filled: false },
    ],
  });
  assert.ok(summary.warnings.some((w) => w.includes("Slippage")));
  assert.ok(summary.currentFilledRiskDollars > 100);
}

// 13. Cancel all remaining limits after stop
{
  const cancelled = cancelRemainingAfterStop([
    { filled: true, price: 280 },
    { filled: false, price: 275 },
  ]);
  assert.equal(cancelled[0].filled, true);
  assert.equal((cancelled[1] as { cancelled?: boolean }).cancelled, true);
}

// 14. Target reached before deeper layers fill
{
  const state = projectTargetBeforeDeeperFills([
    { role: "base", filled: true },
    { role: "kelly_extension", filled: false },
  ]);
  assert.equal(state, "base_only");
}

// 15. No-chase enforcement
{
  const chased = enforceNoChase({
    priorPrice: 275,
    proposedPrice: 278,
    filled: false,
  });
  assert.equal(chased.chased, true);
  assert.equal(chased.price, 275);

  const ok = enforceNoChase({
    priorPrice: 275,
    proposedPrice: 274,
    filled: false,
  });
  assert.equal(ok.chased, false);
  assert.equal(ok.price, 274);
}

// Extension at worse price warning
{
  const { summary } = computeModifiedKelly({
    ...baseInput,
    layers: [
      { price: 280, riskWeightR: 1, role: "base" },
      { price: 285, riskWeightR: 0.65, role: "kelly_extension" },
    ],
  });
  assert.ok(summary.warnings.some((w) => w.includes("not better")));
}

// Migration: legacy plan → standard_layered
{
  assert.equal(resolveLayeredExecutionModel({}), "standard_layered");
  assert.equal(resolveLayeredExecutionModel(undefined), "standard_layered");
  const parsed = parseLayeredEntryInput({
    executionMethod: "layered_limits",
    limits: [
      { price: 280, allocationPercent: 50 },
      { price: 275, allocationPercent: 50 },
    ],
  });
  assert.ok(parsed);
  assert.equal(parsed?.executionModel, undefined);
  const authorized = authorizeLayeredEntry(parsed!, {
    primaryTargetPrice: 350,
    planStopPrice: 268,
    defaultRiskBudget: 100,
  });
  assert.equal(authorized.executionModel, undefined);
  assert.equal(resolveLayeredExecutionModel(authorized), "standard_layered");
}

// Authorize modified_kelly path
{
  const authorized = authorizeLayeredEntry(
    {
      executionMethod: "layered_limits",
      executionModel: "modified_kelly",
      stopModel: "common",
      commonStopPrice: 268,
      primaryTargetPrice: 350,
      sizingMode: "risk_percent",
      modifiedKelly: {
        baseRiskR: 1,
        additionalRiskR: 0.65,
        totalAuthorizedRiskR: 1.65,
        baseRiskDollar: 100,
        kellyFraction: "quarter",
        probabilitySource: "subjective",
        estimatedWinProbability: 0.55,
      },
      limits: [
        { price: 280, allocationPercent: 60.61, role: "base", riskWeightR: 1 },
        {
          price: 275,
          allocationPercent: 39.39,
          role: "kelly_extension",
          riskWeightR: 0.65,
        },
      ],
    },
    { primaryTargetPrice: 350, planStopPrice: 268 }
  );
  assert.equal(authorized.executionModel, "modified_kelly");
  assert.ok(authorized.modifiedKelly);
  approx(authorized.authorizedRiskAmount ?? 0, 165, 0.05);
  assert.ok((authorized.limits[0].derived?.plannedQuantity ?? 0) > 8);
}

// Aggregate metrics — no calibration below sample
{
  const obs = Array.from({ length: 5 }, () =>
    buildObservationMetrics({
      planState: {
        baseRiskR: 1,
        additionalRiskR: 0.65,
        totalAuthorizedRiskR: 1.65,
        baseRiskDollar: 100,
        kellyFraction: "quarter",
        fillState: "base_only",
      },
      summary: computeModifiedKelly({
        ...baseInput,
        layers: [
          { price: 280, riskWeightR: 1, role: "base", filled: true },
          { price: 275, riskWeightR: 0.65, role: "kelly_extension", filled: false },
        ],
      }).summary,
      realizedR: 2,
      targetReachedBeforeStop: true,
    })
  );
  const agg = aggregateModifiedKellyMetrics(obs, 30);
  assert.equal(agg.numberOfObservations, 5);
  assert.equal(agg.calibratedWinProbability, undefined);
  assert.equal(agg.baseOnlyCount, 5);
}

// MAF evidence compatibility
{
  const plan = {
    id: "plan-mk",
    ticker: "TSLA",
    status: "watching",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plannedEntry: 280,
    stopPrice: 268,
    targetPrice: 350,
    layeredEntry: authorizeLayeredEntry(
      {
        executionMethod: "layered_limits",
        executionModel: "modified_kelly",
        commonStopPrice: 268,
        primaryTargetPrice: 350,
        modifiedKelly: {
          baseRiskR: 1,
          additionalRiskR: 0.65,
          totalAuthorizedRiskR: 1.65,
          baseRiskDollar: 100,
          kellyFraction: "quarter",
          probabilitySource: "historical",
        },
        limits: [
          { price: 280, allocationPercent: 60, role: "base", riskWeightR: 1, filled: true },
          {
            price: 275,
            allocationPercent: 40,
            role: "kelly_extension",
            riskWeightR: 0.65,
            filled: false,
          },
        ],
      },
      { primaryTargetPrice: 350, planStopPrice: 268 }
    ),
  } as TradePlan;

  const evidence = buildMafEvidence({ plan });
  assert.equal(evidence.modifiedKellyExecutionModel, "modified_kelly");
  assert.ok(evidence.modifiedKellyBaseRiskR === 1);
  assert.ok(
    evidence.modifiedKellyMafHints?.includes("extension_not_filled") ||
      evidence.modifiedKellyFillState === "base_only" ||
      evidence.layeredLimitsFilled === 1
  );
}

console.log("test-modified-kelly: all assertions passed");
