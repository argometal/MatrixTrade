/**
 * MXT 035 — post-delete verification (Supabase). LOCAL ONLY.
 */
import { readFileSync } from "node:fs";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();
process.env.TRADES_STORE = "supabase";

async function main() {
  const { createSupabaseAdmin } = await import("../lib/supabase/server");
  const { getPlans } = await import("../lib/plans");
  const { getLearningOutcomes } = await import("../lib/learning-outcome-store");
  const {
    buildInsightsCaseSpine,
  } = await import("../lib/insights-case-spine");
  const {
    buildInsightsCaseSpineView,
    independentEconomicCaseRows,
  } = await import("../lib/insights-case-spine-view");

  const sb = createSupabaseAdmin();
  const target = ["PLAN-010", "PLAN-011", "PLAN-012"];
  const { data: plansRows } = await sb
    .from("trade_plans")
    .select("id")
    .in("id", target);
  const { data: loRows } = await sb
    .from("learning_outcomes")
    .select("id,plan_id")
    .in("plan_id", target);

  const plans = await getPlans();
  const los = await getLearningOutcomes();
  const nflxPlans = plans.filter((p) => p.ticker?.toUpperCase() === "NFLX");
  const group = nflxPlans.filter((p) =>
    ["PLAN-010", "PLAN-011", "PLAN-012"].includes(p.id.toUpperCase())
  );

  const spine = await buildInsightsCaseSpine();
  const nflxSpine = spine.filter((r) => r.ticker?.toUpperCase() === "NFLX");
  const groupSpine = nflxSpine.filter((r) =>
    ["PLAN-010", "PLAN-011", "PLAN-012"].includes(r.planId.toUpperCase())
  );
  const view = buildInsightsCaseSpineView(groupSpine);
  const economic = independentEconomicCaseRows(view.rows);
  const zeroR = groupSpine.filter((r) => (r.realizedR ?? 0) === 0);
  const indeterminate = groupSpine.filter(
    (r) =>
      r.noEntryDiagnosis === "INDETERMINATE" ||
      r.reality === "INDETERMINATE" ||
      r.decisionQuality === "INDETERMINATE"
  );

  console.log(
    JSON.stringify(
      {
        remainingTargetPlanIds: (plansRows ?? []).map((p) => p.id).sort(),
        remainingTargetLos: loRows ?? [],
        nflxPlanIds: nflxPlans.map((p) => p.id).sort(),
        groupRawPlanCount: group.length,
        groupSpineCount: groupSpine.length,
        independentEconomicN: economic.length,
        independentPlanIds: economic.map((r) => r.planId),
        zeroRObservationCount: zeroR.length,
        indeterminateishCaseCount: indeterminate.length,
        plan010Outcome: plans.find((p) => p.id === "PLAN-010")?.outcome ?? null,
        loKindsForNflx: los
          .filter((lo) => lo.ticker?.toUpperCase() === "NFLX")
          .map((lo) => ({ id: lo.id, planId: lo.planId, kind: lo.kind })),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
