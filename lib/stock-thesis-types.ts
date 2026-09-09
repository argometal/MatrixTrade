export type StockThesisStatus =
  | "draft"
  | "watching"
  | "actionable"
  | "invalidated"
  | "archived";

export const STOCK_THESIS_STATUSES: StockThesisStatus[] = [
  "draft",
  "watching",
  "actionable",
  "invalidated",
  "archived",
];

export const STOCK_THESIS_STATUS_LABELS: Record<StockThesisStatus, string> = {
  draft: "Draft",
  watching: "Watching",
  actionable: "Actionable",
  invalidated: "Invalidated",
  archived: "Archived",
};

export interface StockThesisHistoricalAnalysis {
  timeframe: string;
  summary: string;
}

export function normalizeHistoricalAnalysis(
  raw: unknown
): { ok: true; value: StockThesisHistoricalAnalysis[] } | { ok: false; errors: string[] } {
  if (raw === undefined) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, errors: ["proposal.historicalAnalysis must be an array"] };
  }
  const value: StockThesisHistoricalAnalysis[] = [];
  const errors: string[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`proposal.historicalAnalysis[${index}] must be an object`);
      return;
    }
    const timeframe = String((item as { timeframe?: unknown }).timeframe ?? "").trim();
    const summary = String((item as { summary?: unknown }).summary ?? "").trim();
    if (!timeframe) errors.push(`proposal.historicalAnalysis[${index}].timeframe required`);
    if (!summary) errors.push(`proposal.historicalAnalysis[${index}].summary required`);
    if (timeframe && summary) value.push({ timeframe, summary });
  });
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export interface StockThesisZone {
  low: number;
  high: number;
}

export interface StockThesisLevels {
  majorSupport?: number;
  majorResistance?: number;
  primaryZone?: StockThesisZone;
  secondaryZone?: StockThesisZone;
  targets?: number[];
}

export interface StockThesisRiskRules {
  minimumRR: number;
  /** Thesis invalidation — broader Stock File case no longer valid. */
  invalidation: string;
  /** Setup invalidation — this specific entry setup failed (may be tighter). */
  setupInvalidation?: string;
  notes?: string;
}

export interface StockThesis {
  id: string;
  ticker: string;
  status: StockThesisStatus;
  version: number;
  style: string;
  thesis: string;
  historicalAnalysis: StockThesisHistoricalAnalysis[];
  levels: StockThesisLevels;
  riskRules: StockThesisRiskRules;
  currentHypothesis: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SaveStockThesisInput = {
  id?: string;
  ticker: string;
  status?: StockThesisStatus;
  style: string;
  thesis: string;
  historicalAnalysis?: StockThesisHistoricalAnalysis[];
  levels?: StockThesisLevels;
  riskRules: StockThesisRiskRules;
  currentHypothesis: string;
  notes?: string;
};

export type UpdateStockThesisFieldsInput = {
  status?: StockThesisStatus;
  currentHypothesis?: string;
  notes?: string;
};

export function isActiveStockThesisStatus(status: StockThesisStatus): boolean {
  return status === "watching" || status === "actionable";
}

export function formatStockThesisZone(zone?: StockThesisZone): string {
  if (!zone) return "—";
  return `${zone.low}–${zone.high}`;
}
