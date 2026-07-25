import assert from "node:assert/strict";
import type { TradePlan } from "../lib/plan-types";
import {
  buildActiveScoutMonetaryRows,
  buildFillStatesForPlan,
  compareScoutMonetaryRows,
  formatMonetaryMetricsBlock,
  formatPotentialR,
  formatUsdMoney,
  sortScoutMonetaryRows,
  type ScoutMonetaryRow,
} from "../lib/scout-monetary-metrics";

const basePlan = {
  id: "PLAN-A",
  ticker: "AAA",
  status: "watching",
  analysisTimeframes: ["1D"],
  entryTimeframe: "1D",
  plannedEntry: 350,
  stopPrice: 334,
  targetPrice: 450,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  layeredEntry: {
    executionMethod: "layered_limits" as const,
    noChase: true as const,
    status: "planned" as const,
    sizingMode: "risk_percent" as const,
    stopModel: "common" as const,
    commonStopPrice: 334,
    primaryTargetPrice: 450,
    authorizedRiskAmount: 96,
    limits: [{ price: 350, allocationPercent: 100, stopPrice: 334 }],
  },
} as TradePlan;

{
  const states = buildFillStatesForPlan(basePlan);
  const full = states.find((s) => s.limitsFilled === 1);
  assert.ok(full);
  assert.equal(full!.capitalDeployed, 2100);
  assert.equal(full!.assignedLoss, 96);
  assert.equal(full!.potentialProfit, 600);
  assert.ok(Math.abs((full!.blendedRR ?? 0) - 6.25) < 1e-4);
  assert.ok(Math.abs(full!.returnOnCapitalPercent - 28.57142857142857) < 1e-6);

  const lines = formatMonetaryMetricsBlock({
    potentialR: full!.blendedRR,
    potentialProfit: full!.potentialProfit,
    assignedLoss: full!.assignedLoss,
    capitalRequired: full!.capitalDeployed,
    returnOnCapitalPercent: full!.returnOnCapitalPercent,
  });
  assert.equal(lines[0], "R potencial: 6.25R");
  assert.equal(lines[1], "Ganancia potencial: USD 600.00");
  assert.equal(lines[2], "Pérdida asignada: USD 96.00");
  assert.equal(lines[3], "Capital requerido: USD 2,100.00");
  assert.match(lines[4], /^Retorno sobre capital: 28\.57%/);
}

assert.equal(formatUsdMoney(2100), "USD 2,100.00");
assert.equal(formatPotentialR(6.25), "6.25R");

{
  const rows = buildActiveScoutMonetaryRows([
    basePlan,
    {
      ...basePlan,
      id: "PLAN-B",
      ticker: "BBB",
      layeredEntry: {
        ...basePlan.layeredEntry!,
        authorizedRiskAmount: 48,
        limits: [{ price: 350, allocationPercent: 100, stopPrice: 334 }],
      },
    } as TradePlan,
    {
      ...basePlan,
      id: "PLAN-Z",
      ticker: "ZZZ",
      status: "expired",
    } as TradePlan,
  ]);
  assert.equal(rows.length, 2);

  const byProfit = sortScoutMonetaryRows(rows, "potentialProfit", "desc");
  assert.equal(byProfit[0].ticker, "AAA");
  assert.ok(byProfit[0].potentialProfit >= byProfit[1].potentialProfit);

  const byTicker = sortScoutMonetaryRows(rows, "ticker", "asc");
  assert.equal(byTicker[0].ticker, "AAA");
  assert.equal(byTicker[1].ticker, "BBB");

  // Default comparison table must not imply R-only order: ticker sort keeps AAA before BBB
  // even if BBB had higher R.
  const highRLowTicker: ScoutMonetaryRow = {
    ticker: "BBB",
    planId: "P1",
    planLabel: "P1",
    capitalRequired: 100,
    assignedLoss: 10,
    potentialProfit: 100,
    potentialR: 10,
    returnOnCapitalPercent: 100,
  };
  const lowRHighTicker: ScoutMonetaryRow = {
    ticker: "AAA",
    planId: "P2",
    planLabel: "P2",
    capitalRequired: 200,
    assignedLoss: 20,
    potentialProfit: 40,
    potentialR: 2,
    returnOnCapitalPercent: 20,
  };
  assert.ok(compareScoutMonetaryRows(lowRHighTicker, highRLowTicker, "ticker", "asc") < 0);
  assert.ok(compareScoutMonetaryRows(highRLowTicker, lowRHighTicker, "potentialR", "desc") < 0);
}

console.log("test-scout-monetary-metrics: ok");
