/**
 * Before/after report for War Universe 16-04 (Case / Compare / Allocation).
 * Run: npx tsx tools/report-war-universe-16-04.ts
 */
import { getPlans } from "../lib/plans";
import {
  isWarReadyScoutPlan,
  planNeedsLearningSyncRepair,
  planNeedsStrategyReview,
} from "../lib/plan-helpers";
import {
  formatConsolidatedOperationalTag,
  getConfirmedOperationalAssessment,
  evaluateScoutOperationalState,
} from "../lib/scout-operational-state";
import { getStockTheses } from "../lib/stock-theses";
import { isActiveStockThesisStatus } from "../lib/stock-thesis-types";
import type { TradePlan } from "../lib/plan-types";

function legacyActive(plan: TradePlan): boolean {
  return plan.status === "watching" || plan.status === "ready";
}

function legacyAlloc(plan: TradePlan): boolean {
  return (
    plan.status === "watching" ||
    plan.status === "ready" ||
    plan.status === "expired"
  );
}

/** Legacy Case primaryPlan pick (pre-16-04). */
function legacyPrimary(thesisPlans: TradePlan[]): TradePlan | undefined {
  const active = thesisPlans.filter(legacyActive);
  const needsLearningClose =
    thesisPlans.find(planNeedsStrategyReview) ??
    thesisPlans.find(planNeedsLearningSyncRepair);
  return (
    active[0] ??
    needsLearningClose ??
    thesisPlans.find((p) => p.status === "entered") ??
    thesisPlans.find((p) => p.status === "expired") ??
    thesisPlans[0]
  );
}

function tagFor(plan: TradePlan): string {
  const ev = evaluateScoutOperationalState({
    plan,
    linkedTrades: [],
    reservations: [],
    now: new Date().toISOString(),
    minimumRR: 3,
  });
  const auth = ev.confirmedAssessment ?? ev.detectedAssessment;
  return formatConsolidatedOperationalTag({
    verdict: plan.decision?.verdict,
    assessment: auth,
  });
}

async function main() {
  const [plans, theses] = await Promise.all([getPlans(), getStockTheses()]);
  const activeTheses = theses.filter((t) => isActiveStockThesisStatus(t.status));

  console.log("=== PLAN inventory ===");
  for (const p of plans) {
    const oa = getConfirmedOperationalAssessment(p);
    console.log(
      JSON.stringify({
        id: p.id,
        ticker: p.ticker,
        status: p.status,
        outcome: Boolean(p.outcome?.recordedAt),
        replacedBy: p.replacedByPlanId ?? null,
        oa: oa?.operationalState ?? null,
        needsOutcome: planNeedsStrategyReview(p),
        needsSync: planNeedsLearningSyncRepair(p),
        legacyCaseEligible: legacyActive(p) || planNeedsStrategyReview(p) || planNeedsLearningSyncRepair(p),
        legacyCompare: legacyActive(p),
        legacyAlloc: legacyAlloc(p),
        war: isWarReadyScoutPlan(p),
        tag: tagFor(p),
      })
    );
  }

  console.log("\n=== Case dropdown before (legacy primary per thesis) ===");
  for (const thesis of activeTheses) {
    const thesisPlans = plans.filter((p) => p.stockThesisId === thesis.id);
    const primary = legacyPrimary(thesisPlans);
    if (!primary) continue;
    console.log(
      `  BEFORE ${thesis.ticker}: ${primary.id} · ${tagFor(primary)} · status=${primary.status}`
    );
  }

  console.log("\n=== Case dropdown after (war-ready only) ===");
  for (const thesis of activeTheses) {
    const war = plans.filter(
      (p) => p.stockThesisId === thesis.id && isWarReadyScoutPlan(p)
    );
    if (war.length === 0) {
      console.log(`  AFTER ${thesis.ticker}: (removed — no war-ready plan)`);
      continue;
    }
    console.log(
      `  AFTER ${thesis.ticker}: ${war[0].id} · ${tagFor(war[0])} · status=${war[0].status}`
    );
  }

  const removedCompare = plans.filter((p) => legacyCompare(p) && !isWarReadyScoutPlan(p));
  const removedAlloc = plans.filter((p) => legacyAlloc(p) && !isWarReadyScoutPlan(p));
  console.log("\n=== Removed from Compare (legacy watching|ready ∩ !war) ===");
  for (const p of removedCompare) {
    console.log(`  - ${p.id} ${p.ticker} · ${tagFor(p)}`);
  }
  console.log("\n=== Removed from Allocation (legacy watching|ready|expired ∩ !war) ===");
  for (const p of removedAlloc) {
    console.log(`  - ${p.id} ${p.ticker} · ${tagFor(p)}`);
  }
}

function legacyCompare(plan: TradePlan): boolean {
  return legacyActive(plan);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
