import type { MarketEvidence } from "./market-evidence-types";
import type { StockThesis } from "./stock-thesis-types";

export interface StockProfileSynthesis {
  stockProfileId: string;
  ticker: string;
  version: number;
  thesisConfidence: number;
  evidenceCount: number;
  activeEvidenceIds: string[];
  synthesisSummary: string;
  categoryBreakdown: Record<string, number>;
  generatedAt: string;
}

function averageConfidence(rows: MarketEvidence[]): number {
  if (rows.length === 0) return 50;
  const sum = rows.reduce((acc, row) => acc + row.confidence, 0);
  return Math.round(sum / rows.length);
}

function buildCategoryBreakdown(rows: MarketEvidence[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

function buildSynthesisSummary(profile: StockThesis, rows: MarketEvidence[]): string {
  if (rows.length === 0) {
    return profile.currentHypothesis || profile.thesis;
  }
  const top = [...rows]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((row) => `${row.timeframe} ${row.category}: ${row.value}`)
    .join(" · ");
  return `${profile.currentHypothesis} | Evidence: ${top}`;
}

export function buildStockProfileSynthesis(
  profile: StockThesis,
  activeEvidence: MarketEvidence[]
): StockProfileSynthesis {
  return {
    stockProfileId: profile.id,
    ticker: profile.ticker,
    version: profile.version,
    thesisConfidence: averageConfidence(activeEvidence),
    evidenceCount: activeEvidence.length,
    activeEvidenceIds: activeEvidence.map((row) => row.id),
    synthesisSummary: buildSynthesisSummary(profile, activeEvidence),
    categoryBreakdown: buildCategoryBreakdown(activeEvidence),
    generatedAt: new Date().toISOString(),
  };
}

export function formatSynthesisSection(synthesis: StockProfileSynthesis): string {
  const cats = Object.entries(synthesis.categoryBreakdown)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
  return [
    "=== PROFILE SYNTHESIS (read model) ===",
    `stock_profile_id:${synthesis.stockProfileId}`,
    `ticker:${synthesis.ticker}`,
    `profile_version:${synthesis.version}`,
    `thesis_confidence:${synthesis.thesisConfidence}`,
    `active_evidence:${synthesis.evidenceCount}`,
    `categories:${cats || "none"}`,
    `summary:${synthesis.synthesisSummary.replace(/\s+/g, " ").slice(0, 300)}`,
  ].join("\n");
}
