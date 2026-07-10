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
  invalidation: string;
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
