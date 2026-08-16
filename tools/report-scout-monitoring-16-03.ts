/**
 * PROMPT 16-03 — before/after report for Action now / Waiting.
 * Run: npx tsx tools/report-scout-monitoring-16-03.ts
 */
import {
  buildScoutMonitoringSections,
  resolveScoutMonitoringBucket,
  scoutHasActionNowReason,
  scoutIsNearTermWaiting,
  scoutNeedsHumanReview,
} from "../lib/scout-monitoring";
import { evaluateScoutOperationalState } from "../lib/scout-operational-state";
import { getPlans } from "../lib/plans";
import { getTrades } from "../lib/storage";
import { listCapitalReservations } from "../lib/capital-reservation";
import type { TradePlan } from "../lib/plan-types";

/** Legacy (pre-16-03) bucket rules — for before/after comparison only. */
function resolveLegacyBucket(
  plan: TradePlan,
  evaluation: ReturnType<typeof evaluateScoutOperationalState>
): string | null {
  const confirmed = evaluation.confirmedAssessment;
  const detected = evaluation.detectedAssessment;
  const state = confirmed?.operationalState ?? detected.operationalState;
  const authWaitHorizon = confirmed?.waitHorizon ?? detected.waitHorizon;

  if (state === "missed") return "passed";
  if (plan.executionReadiness === "armed") return "actionNow";
  if (state === "superseded" || Boolean(plan.replacedByPlanId)) return null;
  if (state === "improbable") return "lowProbability";
  if (scoutNeedsHumanReview(plan, evaluation)) return "needsReview";
  if (
    state === "armed" ||
    state === "in_zone" ||
    (state === "approaching" && confirmed?.reviewRequired !== true)
  ) {
    return "actionNow";
  }
  if (state === "distant" || authWaitHorizon !== "unknown") return "waiting";
  return null;
}

async function main() {
  const [plans, trades, reservations] = await Promise.all([
    getPlans().catch(() => [] as TradePlan[]),
    getTrades().catch(() => []),
    listCapitalReservations().catch(() => []),
  ]);
  const now = new Date().toISOString();

  const before: Record<string, string[]> = {
    actionNow: [],
    waiting: [],
    needsReview: [],
    passed: [],
    lowProbability: [],
    none: [],
  };
  const after: Record<string, string[]> = {
    actionNow: [],
    waiting: [],
    needsReview: [],
    passed: [],
    lowProbability: [],
    none: [],
  };

  for (const plan of plans) {
    const evaluation = evaluateScoutOperationalState({
      plan,
      linkedTrades: trades.filter(
        (t) => t.planId === plan.id || t.id === plan.linkedTradeId
      ),
      reservations: reservations.filter((r) => r.planId === plan.id),
      now,
      minimumRR: 3,
    });
    const legacy = resolveLegacyBucket(plan, evaluation) ?? "none";
    const next = resolveScoutMonitoringBucket(plan, evaluation) ?? "none";
    before[legacy].push(`${plan.id} ${plan.ticker}`);
    after[next].push(`${plan.id} ${plan.ticker}`);
    if (legacy !== next) {
      console.log(
        `MOVE ${plan.id} ${plan.ticker}: ${legacy} → ${next}` +
          ` (actionNowReason=${scoutHasActionNowReason(plan, evaluation)}` +
          ` nearWait=${scoutIsNearTermWaiting(plan, evaluation)})`
      );
    }
  }

  const sections = buildScoutMonitoringSections({ plans, trades, reservations, now });

  console.log("\n=== BEFORE (legacy bucket counts) ===");
  for (const [k, v] of Object.entries(before)) {
    console.log(`  ${k}: ${v.length}`, v.length ? v.join("; ") : "");
  }
  console.log("\n=== AFTER (16-03 bucket counts) ===");
  for (const [k, v] of Object.entries(after)) {
    console.log(`  ${k}: ${v.length}`, v.length ? v.join("; ") : "");
  }
  console.log("\n=== AFTER card presentation ===");
  for (const key of ["actionNow", "waiting", "needsReview", "passed", "lowProbability"] as const) {
    for (const row of sections[key]) {
      console.log(`  [${key}] ${row.ticker} ${row.planId}`);
      console.log(`    headline: ${row.headline}`);
      console.log(`    detail:   ${row.detail}`);
      console.log(`    trace:    ${row.traceLine}`);
    }
  }

  // Fixture before/after (local store may be empty).
  const fixtures: TradePlan[] = [
    {
      id: "FX-ARM",
      ticker: "NVDA",
      status: "watching",
      analysisTimeframes: ["1D"],
      entryTimeframe: "1D",
      plannedEntry: 100,
      stopPrice: 90,
      targetPrice: 140,
      plannedRR: 4,
      executionReadiness: "armed",
      createdAt: now,
      updatedAt: now,
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
    } as TradePlan,
    {
      id: "FX-APR",
      ticker: "AMD",
      status: "watching",
      analysisTimeframes: ["1D"],
      entryTimeframe: "1D",
      plannedEntry: 100,
      stopPrice: 90,
      targetPrice: 140,
      plannedRR: 4,
      createdAt: now,
      updatedAt: now,
      decision: {
        id: "DEC",
        verdict: "wait",
        decisionConfidence: 60,
        challenges: ["timing"],
        decidedAt: now,
        operationalAssessment: {
          thesisState: "valid",
          operationalState: "approaching",
          waitHorizon: "weeks",
          nextAction: "monitor",
          freshness: "current",
          reviewRequired: false,
          reasonCodes: ["distance_weeks_band"],
          source: "manual_override",
          confirmedAt: now,
        },
      },
    } as TradePlan,
    {
      id: "FX-FAR",
      ticker: "INTC",
      status: "watching",
      analysisTimeframes: ["1D"],
      entryTimeframe: "1D",
      plannedEntry: 100,
      stopPrice: 90,
      targetPrice: 140,
      plannedRR: 4,
      createdAt: now,
      updatedAt: now,
      decision: {
        id: "DEC2",
        verdict: "wait",
        decisionConfidence: 60,
        challenges: ["timing"],
        decidedAt: now,
        operationalAssessment: {
          thesisState: "valid",
          operationalState: "distant",
          waitHorizon: "month",
          nextAction: "none",
          freshness: "current",
          reviewRequired: false,
          reasonCodes: ["distance_month_band"],
          source: "manual_override",
          confirmedAt: now,
        },
      },
    } as TradePlan,
  ];

  console.log("\n=== FIXTURE before → after ===");
  for (const plan of fixtures) {
    const evaluation = evaluateScoutOperationalState({
      plan,
      linkedTrades: [],
      reservations: [],
      now,
      minimumRR: 3,
    });
    const legacy = resolveLegacyBucket(plan, evaluation) ?? "none";
    const next = resolveScoutMonitoringBucket(plan, evaluation) ?? "none";
    console.log(`  ${plan.id} ${plan.ticker}: ${legacy} → ${next}`);
  }
  const fixtureSections = buildScoutMonitoringSections({
    plans: fixtures,
    trades: [],
    reservations: [],
    now,
  });
  console.log("\n=== FIXTURE cards ===");
  for (const key of ["actionNow", "waiting"] as const) {
    for (const row of fixtureSections[key]) {
      console.log(`  [${key}] ${row.ticker} · ${row.headline} · ${row.detail}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
