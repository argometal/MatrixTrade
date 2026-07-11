import type { StockThesis, StockThesisStatus } from "../stock-thesis-types";

export interface StockThesisRow {
  id: string;
  ticker: string;
  status: StockThesisStatus;
  version: number;
  style: string;
  thesis: string;
  current_hypothesis: string;
  notes: string | null;
  historical_analysis: StockThesis["historicalAnalysis"];
  levels: StockThesis["levels"];
  risk_rules: StockThesis["riskRules"];
  created_at: string;
  updated_at: string;
}

export function thesisRowToThesis(row: StockThesisRow): StockThesis {
  return {
    id: row.id,
    ticker: row.ticker,
    status: row.status,
    version: row.version,
    style: row.style,
    thesis: row.thesis,
    currentHypothesis: row.current_hypothesis,
    notes: row.notes ?? undefined,
    historicalAnalysis: Array.isArray(row.historical_analysis) ? row.historical_analysis : [],
    levels: row.levels ?? {},
    riskRules: row.risk_rules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function thesisToRow(thesis: StockThesis): StockThesisRow {
  return {
    id: thesis.id,
    ticker: thesis.ticker.toUpperCase(),
    status: thesis.status,
    version: thesis.version,
    style: thesis.style,
    thesis: thesis.thesis,
    current_hypothesis: thesis.currentHypothesis,
    notes: thesis.notes ?? null,
    historical_analysis: thesis.historicalAnalysis,
    levels: thesis.levels,
    risk_rules: thesis.riskRules,
    created_at: thesis.createdAt,
    updated_at: thesis.updatedAt,
  };
}
