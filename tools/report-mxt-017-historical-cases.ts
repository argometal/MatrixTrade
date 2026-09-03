/**
 * MXT 017-P04 — honest historical Case recovery report (no T0 fabrication).
 * Run: npx tsx tools/report-mxt-017-historical-cases.ts
 */
import { buildInsightsCaseSpine } from "../lib/insights-case-spine";

async function main() {
  const rows = await buildInsightsCaseSpine();
  console.log(`TOTAL_DECIDED_CASES=${rows.length}`);
  let withT0 = 0;
  let missingT0 = 0;
  const byFamily: Record<string, number> = {};
  const byNe: Record<string, number> = {};
  const unlinkedThesis: string[] = [];
  const unlinkedPb: string[] = [];
  for (const r of rows) {
    if (r.t0Available) withT0 += 1;
    else missingT0 += 1;
    byFamily[r.family] = (byFamily[r.family] ?? 0) + 1;
    if (r.noEntryDiagnosis) {
      byNe[r.noEntryDiagnosis] = (byNe[r.noEntryDiagnosis] ?? 0) + 1;
    }
    if (r.linkage?.planThesis === "UNLINKED") unlinkedThesis.push(r.planId);
    if (r.linkage?.planPlaybook === "UNLINKED") unlinkedPb.push(r.planId);
    console.log(
      [
        r.planId,
        r.ticker,
        `family=${r.family}`,
        `ne=${r.noEntryDiagnosis ?? "-"}`,
        `eq=${r.equationId}`,
        `t0=${r.t0Available ? "yes" : "NO"}`,
        `thesis=${r.linkage?.planThesis ?? "?"}`,
        `pb=${r.linkage?.planPlaybook ?? "?"}`,
        `trade=${r.linkage?.tradePlan ?? "?"}`,
      ].join(" | ")
    );
  }
  console.log("---");
  console.log(`withT0=${withT0} missingT0=${missingT0}`);
  console.log("families", byFamily);
  console.log("noEntry", byNe);
  console.log("UNLINKED thesis", unlinkedThesis.join(",") || "(none)");
  console.log("UNLINKED playbook", unlinkedPb.join(",") || "(none)");
  console.log(
    "RECOVERY_POLICY=no fabricated T0; classifications only where freeze+reality allow"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
