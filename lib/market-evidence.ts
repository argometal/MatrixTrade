import { getMarketEvidenceStore } from "./market-evidence-store";
import {
  clampConfidence,
  parseMarketEvidenceCategory,
  type EvidenceAddInput,
  type MarketEvidence,
  type MarketEvidenceCategory,
} from "./market-evidence-types";
import { formatMarketEvidenceSection } from "./market-evidence-format";
import { getStockThesisById } from "./stock-theses";

export { formatMarketEvidenceSection } from "./market-evidence-format";

export function nextMarketEvidenceId(
  rows: MarketEvidence[],
  ticker: string
): string {
  const normalized = ticker.trim().toUpperCase();
  let max = 0;
  const prefix = `ME-${normalized}-`;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const suffix = row.id.slice(prefix.length);
    const n = Number(suffix);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function getMarketEvidence(): Promise<MarketEvidence[]> {
  return getMarketEvidenceStore().readAll();
}

export async function getActiveEvidenceForProfile(
  stockProfileId: string
): Promise<MarketEvidence[]> {
  const id = stockProfileId.toUpperCase();
  const all = await getMarketEvidence();
  const superseded = new Set(
    all.map((row) => row.supersededBy).filter(Boolean) as string[]
  );
  return all
    .filter((row) => row.stockProfileId === id && !row.supersededBy && !superseded.has(row.id))
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}

export async function appendMarketEvidence(
  input: EvidenceAddInput
): Promise<{ evidence?: MarketEvidence; errors?: string[] }> {
  const errors: string[] = [];
  const stockProfileId = input.stockProfileId.trim().toUpperCase();
  const ticker = input.ticker.trim().toUpperCase();
  const value = input.value.trim();
  const timeframe = input.timeframe.trim();

  if (!stockProfileId) errors.push("stockProfileId is required.");
  if (!ticker) errors.push("ticker is required.");
  if (!value) errors.push("value is required.");
  if (!timeframe) errors.push("timeframe is required.");

  const profile = await getStockThesisById(stockProfileId);
  if (!profile) errors.push(`Stock profile ${stockProfileId} not found.`);
  if (profile && profile.ticker !== ticker) {
    errors.push(`Ticker ${ticker} does not match profile ${profile.ticker}.`);
  }

  if (errors.length > 0) return { errors };

  const all = await getMarketEvidence();
  const now = new Date().toISOString();
  const evidence: MarketEvidence = {
    id: nextMarketEvidenceId(all, ticker),
    stockProfileId,
    ticker,
    timeframe,
    category: input.category,
    value,
    confidence: clampConfidence(input.confidence),
    source: input.source ?? "human",
    observedAt: now,
    createdAt: now,
    note: input.note?.trim() || undefined,
  };

  await getMarketEvidenceStore().append(evidence);
  return { evidence };
}

export async function appendMarketEvidenceFromProposal(
  proposal: Record<string, unknown>
): Promise<{ evidence?: MarketEvidence; errors?: string[] }> {
  return appendMarketEvidence({
    stockProfileId: String(proposal.stockProfileId ?? ""),
    ticker: String(proposal.ticker ?? ""),
    timeframe: String(proposal.timeframe ?? ""),
    category: parseMarketEvidenceCategory(proposal.category),
    value: String(proposal.value ?? ""),
    confidence: clampConfidence(proposal.confidence),
    source:
      proposal.source === "ai" || proposal.source === "import" || proposal.source === "human"
        ? proposal.source
        : "ai",
    note: proposal.note ? String(proposal.note) : undefined,
  });
}

/** One-time style migration: seed evidence rows from profile historicalAnalysis if empty. */
export async function ensureProfileEvidenceSeeded(stockProfileId: string): Promise<void> {
  const id = stockProfileId.toUpperCase();
  const existing = await getActiveEvidenceForProfile(id);
  if (existing.length > 0) return;

  const profile = await getStockThesisById(id);
  if (!profile || profile.historicalAnalysis.length === 0) return;

  for (const row of profile.historicalAnalysis) {
    await appendMarketEvidence({
      stockProfileId: id,
      ticker: profile.ticker,
      timeframe: row.timeframe,
      category: "structure",
      value: row.summary,
      confidence: 65,
      source: "migration",
      note: "Migrated from historicalAnalysis",
    });
  }
}

