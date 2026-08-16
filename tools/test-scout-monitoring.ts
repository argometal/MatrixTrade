/**
 * PROMPT 15-0C + 16-03 — Scout monitoring buckets.
 * Run: npm run test:scout-monitoring
 */
import assert from "node:assert/strict";
import {
  buildScoutMonitoringSections,
  resolveScoutMonitoringBucket,
  scoutHasActionNowReason,
  scoutIsNearTermWaiting,
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

function evalPlan(plan: TradePlan, now = NOW, currentPrice?: number) {
  return evaluateScoutOperationalState({
    plan,
    linkedTrades: [],
    reservations: [],
    now,
    minimumRR: 3,
    currentPrice,
  });
}

function withConfirmed(
  plan: TradePlan,
  oa: NonNullable<NonNullable<TradePlan["decision"]>["operationalAssessment"]>
): TradePlan {
  return {
    ...plan,
    decision: {
      id: "DEC-1",
      verdict: "wait",
      decisionConfidence: 60,
      challenges: ["timing"],
      decidedAt: NOW,
      operationalAssessment: oa,
    },
  };
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
  const row = sections.actionNow.find((r) => r.planId === "PLAN-ARM")!;
  assert.match(row.headline, /Armed/i);
  assert.ok(row.traceLine.includes("Detected"));
  assert.ok(row.detail.length > 0);
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

// --- 16-03: approaching is Waiting, not Action now ---
{
  const approaching = withConfirmed(
    { ...base, id: "PLAN-APR", ticker: "AMD" },
    {
      thesisState: "valid",
      operationalState: "approaching",
      waitHorizon: "weeks",
      nextAction: "monitor",
      freshness: "current",
      reviewRequired: false,
      reasonCodes: ["distance_weeks_band"],
      source: "manual_override",
      confirmedAt: NOW,
    }
  );
  const evaluation = evalPlan(approaching);
  assert.equal(scoutHasActionNowReason(approaching, evaluation), false);
  assert.equal(scoutIsNearTermWaiting(approaching, evaluation), true);
  assert.equal(resolveScoutMonitoringBucket(approaching, evaluation), "waiting");
  const sections = buildScoutMonitoringSections({
    plans: [approaching],
    trades: [],
    reservations: [],
    now: NOW,
  });
  assert.equal(sections.actionNow.length, 0);
  assert.equal(sections.needsReview.some((r) => r.planId === "PLAN-APR"), false);
  assert.equal(sections.waiting[0]?.planId, "PLAN-APR");
  assert.match(sections.waiting[0]!.headline, /Approaching/i);
}

// Detected approaching (live price) also lands in Waiting.
{
  const plain: TradePlan = { ...base, id: "PLAN-APR2", ticker: "AMD" };
  const evaluation = evalPlan(plain, NOW, 98);
  assert.equal(evaluation.detectedAssessment.operationalState, "approaching");
  assert.equal(resolveScoutMonitoringBucket(plain, evaluation), "waiting");
}

// --- 16-03: in_zone stays Action now ---
{
  const inZone = withConfirmed(
    { ...base, id: "PLAN-ZONE" },
    {
      thesisState: "valid",
      operationalState: "in_zone",
      waitHorizon: "now",
      nextAction: "prepare",
      freshness: "current",
      reviewRequired: false,
      reasonCodes: ["price_inside_entry_zone"],
      source: "manual_override",
      confirmedAt: NOW,
    }
  );
  const evaluation = evaluateScoutOperationalState({
    plan: inZone,
    linkedTrades: [],
    reservations: [],
    now: NOW,
    minimumRR: 3,
    currentPrice: 100,
  });
  assert.equal(evaluation.detectedAssessment.operationalState, "in_zone");
  assert.equal(scoutHasActionNowReason(inZone, evaluation), true);
  assert.equal(resolveScoutMonitoringBucket(inZone, evaluation), "actionNow");
}

// --- 16-03: distant / month wait is NOT Dashboard Waiting (Scout Desk owns it) ---
{
  const distant: TradePlan = { ...base, id: "PLAN-FAR", ticker: "INTC" };
  const evaluation = evaluateScoutOperationalState({
    plan: distant,
    linkedTrades: [],
    reservations: [],
    now: NOW,
    minimumRR: 3,
    currentPrice: 80,
    atr: 5, // |100-80|/5 = 4 ATR → distant quarter band
  });
  assert.equal(evaluation.detectedAssessment.operationalState, "distant");
  assert.equal(scoutIsNearTermWaiting(distant, evaluation), false);
  assert.equal(resolveScoutMonitoringBucket(distant, evaluation), null);
}

// Confirmed distant with month horizon — still not Waiting / Action now on Dashboard.
{
  const distantOa = withConfirmed(
    { ...base, id: "PLAN-FAR2" },
    {
      thesisState: "valid",
      operationalState: "distant",
      waitHorizon: "month",
      nextAction: "none",
      freshness: "current",
      reviewRequired: false,
      reasonCodes: ["distance_month_band"],
      source: "manual_override",
      confirmedAt: NOW,
    }
  );
  const bucket = resolveScoutMonitoringBucket(distantOa, evalPlan(distantOa));
  assert.equal(bucket, null);
}

console.log("test-scout-monitoring: ok");
