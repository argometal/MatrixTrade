/**
 * One-shot report: 15-0C Needs review vs real data/plans.json
 * Run: npx tsx tools/report-needs-review-15-0c.ts
 */
import { readFileSync } from "node:fs";
import {
  buildScoutMonitoringSections,
  resolveScoutMonitoringBucket,
  scoutNeedsHumanReview,
} from "../lib/scout-monitoring";
import { evaluateScoutOperationalState } from "../lib/scout-operational-state";
import { countPlansNeedingReview, planNeedsStrategyReview } from "../lib/plan-helpers";
import type { TradePlan } from "../lib/plan-types";

const raw = JSON.parse(readFileSync("data/plans.json", "utf8"));
const plans: TradePlan[] = Array.isArray(raw) ? raw : (raw.plans ?? []);
const now = new Date().toISOString();

console.log(`=== Real plans @ ${now.slice(0, 10)} ===`);
for (const p of plans) {
  console.log(
    `- ${p.id} ${p.ticker} status=${p.status} validUntil=${p.validUntil ?? "—"} outcome=${p.outcome?.recordedAt ? "yes" : "no"} replacedBy=${p.replacedByPlanId ?? "—"}`
  );
}

const sections = buildScoutMonitoringSections({
  plans,
  trades: [],
  reservations: [],
  now,
});

console.log(`\nPlans to evaluate (strategy): ${countPlansNeedingReview(plans)}`);
console.log(`Needs review cards: ${sections.needsReview.length}`);
for (const row of sections.needsReview) {
  console.log(`  KEEP ${row.planId} ${row.ticker} reason="${row.reason}" next=${row.nextAction}`);
}

console.log("\nPer-plan gate:");
for (const plan of plans) {
  const evaluation = evaluateScoutOperationalState({
    plan,
    linkedTrades: [],
    reservations: [],
    now,
    minimumRR: 3,
  });
  const bucket = resolveScoutMonitoringBucket(plan, evaluation);
  const human = scoutNeedsHumanReview(plan, evaluation);
  const codes = evaluation.detectedAssessment.reasonCodes.join(",");
  const state = evaluation.detectedAssessment.operationalState;
  const wouldHaveBeenNoise =
    state === "expired" ||
    state === "stale" ||
    codes.includes("missing_market_data") ||
    codes.includes("plan_expired");
  console.log(
    `${plan.id}: state=${state} codes=[${codes}] human=${human} bucket=${bucket ?? "null"} strategy=${planNeedsStrategyReview(plan)} legacyNoiseSignal=${wouldHaveBeenNoise}`
  );
}

console.log("\nOther buckets:");
for (const key of ["passed", "actionNow", "waiting", "lowProbability"] as const) {
  const ids = sections[key].map((r) => r.planId).join(", ") || "(empty)";
  console.log(`  ${key}: ${ids}`);
}
