import type { MarketEvidence } from "./market-evidence-types";

export function formatMarketEvidenceSection(rows: MarketEvidence[]): string {
  const lines = ["=== MARKET EVIDENCE (active) ==="];
  if (rows.length === 0) {
    lines.push("count:0");
    return lines.join("\n");
  }
  lines.push(`count:${rows.length}`);
  for (const row of rows.slice(0, 25)) {
    lines.push(
      `- id:${row.id} tf:${row.timeframe} cat:${row.category} conf:${row.confidence} value:${row.value.replace(/\s+/g, " ").slice(0, 160)}`
    );
  }
  return lines.join("\n");
}
