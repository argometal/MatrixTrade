export const MARKET_EVIDENCE_CATEGORIES = [
  "structure",
  "volatility",
  "relative_strength",
  "volume",
  "regime",
  "catalyst",
  "level",
  "other",
] as const;

export type MarketEvidenceCategory = (typeof MARKET_EVIDENCE_CATEGORIES)[number];

export type MarketEvidenceSource = "human" | "ai" | "import" | "migration";

export interface MarketEvidence {
  id: string;
  stockProfileId: string;
  ticker: string;
  timeframe: string;
  category: MarketEvidenceCategory;
  value: string;
  confidence: number;
  source: MarketEvidenceSource;
  observedAt: string;
  createdAt: string;
  supersededBy?: string;
  note?: string;
}

export type EvidenceAddInput = {
  stockProfileId: string;
  ticker: string;
  timeframe: string;
  category: MarketEvidenceCategory;
  value: string;
  confidence: number;
  source?: MarketEvidenceSource;
  note?: string;
};

export function parseMarketEvidenceCategory(raw: unknown): MarketEvidenceCategory {
  const value = String(raw ?? "").trim().toLowerCase();
  if ((MARKET_EVIDENCE_CATEGORIES as readonly string[]).includes(value)) {
    return value as MarketEvidenceCategory;
  }
  return "other";
}

export function clampConfidence(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
