/**
 * MXT 017-P13 — historical Case recovery audit table.
 * Run: npx tsx tools/report-mxt-017-historical-cases.ts
 */
import { buildInsightsCaseSpine } from "../lib/insights-case-spine";

const AMZN_NOTE =
  "The intent was to enter on the decline. Entry was not near a sufficiently strong structural location; price swept the stops. Later corrections occurred, but R/location quality was poor. These trades were pre-MXT.";

async function main() {
  const rows = await buildInsightsCaseSpine({
    historicalReconstructionNotes: { H001: AMZN_NOTE },
  });
  console.log(`TOTAL_SPINE_ROWS=${rows.length}`);
  let fabricated = 0;
  let recoverable = 0;
  let partial = 0;
  let indeterminate = 0;
  console.log(
    "Case | Ticker | Trade/Plan | T0 | historical | provenance | attribution | unresolved | origin"
  );
  for (const r of rows) {
    const hist = r.historicalAttribution;
    if (hist?.fabricatedT0) fabricated += 1;
    const attrib =
      hist?.components.map((c) => `${c.component}:${c.band}`).join(",") ||
      "-";
    const prov =
      hist?.components.map((c) => c.provenance).join(",") ||
      (r.t0Available ? "t0_modern" : "unavailable");
    const hasHistComponents = (hist?.components.length ?? 0) > 0;
    if (r.caseOrigin === "historical_trade" && hasHistComponents) {
      recoverable += 1;
    } else if (r.t0Available && r.family !== "INDETERMINATE") {
      recoverable += 1;
    } else if (hasHistComponents || r.evidenceSummary) {
      partial += 1;
    } else {
      indeterminate += 1;
    }
    console.log(
      [
        r.caseId,
        r.ticker,
        r.linkage?.tradeId ?? r.planId,
        r.t0Available ? "yes" : "NO",
        r.caseOrigin === "historical_trade" ? "yes" : "modern",
        prov,
        attrib,
        hist?.unsupportedConclusions.slice(0, 1).join(";") ??
          (r.missingInputs.join(",") || "-"),
        r.caseOrigin ?? "modern",
      ].join(" | ")
    );
  }
  console.log("---");
  console.log(
    `recoverable≈${recoverable} partial≈${partial} indeterminate≈${indeterminate} fabricatedT0=${fabricated}`
  );
  console.log("POLICY=no fabricated T0; reconstructed ≠ contemporaneous");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
