/**
 * PROMPT 15-0C — Scout monitoring Needs review = human decisions only.
 * Run: npm run test:scout-monitoring
 */
import assert from "node:assert/strict";
import {
  buildScoutMonitoringSections,
  resolveScoutMonitoringBucket,
  scoutNeedsHumanReview,
} from "../lib/scout-monitoring";
import { evaluateScoutOperationalState } from "../lib/scout-operational-state";
import type { TradePlan } from "../lib/plan-types";

const NOW = "2026-07-29T00:00:00.000Z";

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

function evalPlan(plan: TradePlan, now = NOW) {
  return evaluateScoutOperationalState({
    plan,
    linkedTrades: [],
    reservations: [],
    now,
    minimumRR: 3,
  });
}

// --- Armed stays actionNow ---
{
  const armed: TradePlan = {
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
  };
  const sections = buildScoutMonitoringSections({
    plans: [armed],
    trades: [],
    reservations: [],
    now: NOW,
  });
  assert.equal(sections.actionNow.some((r) => r.planId === "PLAN-ARM"), true);
  assert.equal(sections.needsReview.some((r) => r.planId === "PLAN-ARM"), false);
}

// --- Terminal expired → Plans to evaluate path, NOT monitoring Needs review ---
{
  const expired: TradePlan = { ...base, id: "PLAN-EXP", ticker: "TSLA", status: "expired" };
  const evaluation = evalPlan(expired);
  assert.equal(scoutNeedsHumanReview(expired, evaluation), false);
  assert.equal(resolveScoutMonitoringBucket(expired, evaluation), null);
  const sections = buildScoutMonitoringSections({
    plans: [expired],
    trades: [],
    reservations: [],
    now: NOW,
  });
  assert.equal(sections.needsReview.some((r) => r.planId === "PLAN-EXP"), false);
}

// --- Stale + missing market data alone → no Needs review card ---
{
  const stale: TradePlan = {
    ...base,
    id: "PLAN-OLD",
    ticker: "MSFT",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
  const evaluation = evalPlan(stale);
  assert.ok(evaluation.detectedAssessment.reasonCodes.includes("missing_market_data"));
  assert.equal(scoutNeedsHumanReview(stale, evaluation), false);
  assert.equal(resolveScoutMonitoringBucket(stale, evaluation), null);
}

// --- Calendar expired while still watching → not Needs review (noise) ---
{
  const calExpired: TradePlan = {
    ...base,
    id: "PLAN-CAL",
    validUntil: "2026-07-01T00:00:00.000Z",
  };
  const evaluation = evalPlan(calExpired);
  assert.equal(evaluation.detectedAssessment.operationalState, "expired");
  assert.equal(scoutNeedsHumanReview(calExpired, evaluation), false);
  assert.equal(resolveScoutMonitoringBucket(calExpired, evaluation), null);
}

// --- Superseded → archive path, not reassess Needs review ---
{
  const superseded: TradePlan = {
    ...base,
    id: "PLAN-OLD-A",
    replacedByPlanId: "PLAN-NEW",
  };
  const evaluation = evalPlan(superseded);
  assert.equal(evaluation.detectedAssessment.operationalState, "superseded");
  assert.equal(scoutNeedsHumanReview(superseded, evaluation), false);
  assert.equal(resolveScoutMonitoringBucket(superseded, evaluation), null);
}

// --- Geometry missing → Needs review (human) ---
{
  const noGeom: TradePlan = {
    ...base,
    id: "PLAN-GEOM",
    plannedEntry: undefined,
    stopPrice: undefined,
    targetPrice: undefined,
    plannedRR: undefined,
  };
  const evaluation = evalPlan(noGeom);
  assert.equal(evaluation.detectedAssessment.operationalState, "needs_reanalysis");
  assert.ok(
    evaluation.detectedAssessment.reasonCodes.includes("execution_geometry_missing")
  );
  assert.equal(scoutNeedsHumanReview(noGeom, evaluation), true);
  assert.equal(resolveScoutMonitoringBucket(noGeom, evaluation), "needsReview");
}

// --- Explicit human Review 1D (confirmed reviewRequired) → Needs review ---
{
  const review1d: TradePlan = {
    ...base,
    id: "PLAN-REV",
    decision: {
      id: "DEC-1",
      verdict: "wait",
      decisionConfidence: 60,
      challenges: ["timing"],
      decidedAt: NOW,
      operationalAssessment: {
        thesisState: "unknown",
        operationalState: "approaching",
        waitHorizon: "days",
        nextAction: "monitor",
        freshness: "current",
        reviewRequired: true,
        reasonCodes: ["distance_days_band"],
        source: "manual_override",
        confirmedAt: NOW,
        nextReviewAt: "2026-07-31T12:00:00.000Z",
      },
    },
  };
  const evaluation = evalPlan(review1d);
  assert.equal(scoutNeedsHumanReview(review1d, evaluation), true);
  assert.equal(resolveScoutMonitoringBucket(review1d, evaluation), "needsReview");
}

console.log("test-scout-monitoring: ok");
