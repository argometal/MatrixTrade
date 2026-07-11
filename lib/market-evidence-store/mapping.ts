import type { MarketEvidence } from "../market-evidence-types";

export interface MarketEvidenceRow {
  id: string;
  stock_profile_id: string;
  ticker: string;
  timeframe: string;
  category: MarketEvidence["category"];
  value: string;
  confidence: number;
  source: MarketEvidence["source"];
  observed_at: string;
  created_at: string;
  superseded_by: string | null;
  note: string | null;
}

export function evidenceRowToEvidence(row: MarketEvidenceRow): MarketEvidence {
  return {
    id: row.id,
    stockProfileId: row.stock_profile_id,
    ticker: row.ticker,
    timeframe: row.timeframe,
    category: row.category,
    value: row.value,
    confidence: row.confidence,
    source: row.source,
    observedAt: row.observed_at,
    createdAt: row.created_at,
    supersededBy: row.superseded_by ?? undefined,
    note: row.note ?? undefined,
  };
}

export function evidenceToRow(evidence: MarketEvidence): MarketEvidenceRow {
  return {
    id: evidence.id,
    stock_profile_id: evidence.stockProfileId.toUpperCase(),
    ticker: evidence.ticker.toUpperCase(),
    timeframe: evidence.timeframe,
    category: evidence.category,
    value: evidence.value,
    confidence: evidence.confidence,
    source: evidence.source,
    observed_at: evidence.observedAt,
    created_at: evidence.createdAt,
    superseded_by: evidence.supersededBy ?? null,
    note: evidence.note ?? null,
  };
}
