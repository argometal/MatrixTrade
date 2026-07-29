import assert from "node:assert/strict";
import { buildScoutMonitoringSections } from "../lib/scout-monitoring";
import type { TradePlan } from "../lib/plan-types";

const base: TradePlan = {
  id: "PLAN-001",
  ticker: "AAPL",
  stockThesisId: "ST-AAPL-001",
  status: "watching",
  analysisTimeframes: ["1D"],
  entryTimeframe: "1D",
  plannedEntry: 100,
  stopPrice: 90,
  targetPrice: 140,
  plannedRR: 4,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

const sections = buildScoutMonitoringSections({
  plans: [
    {
      ...base,
      id: "PLAN-ARM",
      ticker: "NVDA",
      executionReadiness: "armed",
      layeredEntry: {
        executionMethod: "layered_limits",
        noChase: true,
        status: "planned",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 90,
        primaryTargetPrice: 140,
        authorizedRiskAmount: 100,
        limits: [{ price: 100, allocationPercent: 100, stopPrice: 90 }],
      },
    },
    {
      ...base,
      id: "PLAN-EXP",
      ticker: "TSLA",
      status: "expired",
    },
    {
      ...base,
      id: "PLAN-OLD",
      ticker: "MSFT",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  trades: [],
  reservations: [],
  now: "2026-07-29T00:00:00.000Z",
});

assert.equal(sections.actionNow.some((row) => row.planId === "PLAN-ARM"), true);
assert.equal(
  sections.needsReview.some((row) => row.planId === "PLAN-EXP"),
  true
);
assert.equal(
  sections.needsReview.some((row) => row.planId === "PLAN-OLD"),
  true
);

const ids = sections.needsReview.flatMap((row) => row.alerts.map((a) => a.id));
assert.equal(new Set(ids).size, ids.length);

console.log("test-scout-monitoring: ok");
