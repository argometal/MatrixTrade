import type { SaveStockThesisInput } from "./stock-thesis-types";
import { saveStockThesis } from "./stock-theses";

function parseZone(raw: unknown): { low: number; high: number } | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const z = raw as Record<string, unknown>;
  const low = Number(z.low);
  const high = Number(z.high);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return undefined;
  return { low, high };
}

function parseLevels(raw: unknown): SaveStockThesisInput["levels"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const l = raw as Record<string, unknown>;
  const targets = Array.isArray(l.targets)
    ? l.targets.map((t) => Number(t)).filter((n) => Number.isFinite(n))
    : undefined;

  return {
    majorSupport: Number.isFinite(Number(l.majorSupport)) ? Number(l.majorSupport) : undefined,
    majorResistance: Number.isFinite(Number(l.majorResistance))
      ? Number(l.majorResistance)
      : undefined,
    primaryZone: parseZone(l.primaryZone),
    secondaryZone: parseZone(l.secondaryZone),
    targets: targets?.length ? targets : undefined,
  };
}

function parseRiskRules(
  raw: unknown
): { ok: true; value: SaveStockThesisInput["riskRules"] } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["proposal.riskRules required"] };
  }
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
  const minimumRR = Number(r.minimumRR);
  if (!Number.isFinite(minimumRR) || minimumRR <= 0) {
    errors.push("proposal.riskRules.minimumRR required (positive number)");
  }
  const invalidation = String(r.invalidation ?? "").trim();
  if (!invalidation) errors.push("proposal.riskRules.invalidation required");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      minimumRR,
      invalidation,
      notes: r.notes !== undefined ? String(r.notes).trim() || undefined : undefined,
    },
  };
}

function parseHistoricalAnalysis(raw: unknown): SaveStockThesisInput["historicalAnalysis"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const timeframe = String(row.timeframe ?? "").trim();
      const summary = String(row.summary ?? "").trim();
      if (!timeframe || !summary) return null;
      return { timeframe, summary };
    })
    .filter((row): row is { timeframe: string; summary: string } => row !== null);
}

export function proposalToStockCaseInput(
  proposal: Record<string, unknown>
): { input?: SaveStockThesisInput; errors?: string[] } {
  const errors: string[] = [];
  const ticker = String(proposal.ticker ?? "").trim().toUpperCase();
  if (!ticker) errors.push("proposal.ticker required");

  const thesis = String(proposal.thesis ?? "").trim();
  if (!thesis) errors.push("proposal.thesis required");

  const currentHypothesis = String(proposal.currentHypothesis ?? "").trim();
  if (!currentHypothesis) errors.push("proposal.currentHypothesis required");

  const riskParsed = parseRiskRules(proposal.riskRules);
  if (!riskParsed.ok) return { errors: riskParsed.errors };

  if (errors.length) return { errors };

  const statusRaw = proposal.status;
  const status =
    statusRaw !== undefined &&
    ["draft", "watching", "actionable", "invalidated", "archived"].includes(String(statusRaw))
      ? (String(statusRaw) as SaveStockThesisInput["status"])
      : "watching";

  return {
    input: {
      ticker,
      style: String(proposal.style ?? "swing").trim() || "swing",
      thesis,
      currentHypothesis,
      status,
      levels: parseLevels(proposal.levels),
      riskRules: riskParsed.value,
      historicalAnalysis: parseHistoricalAnalysis(proposal.historicalAnalysis),
      notes: proposal.notes !== undefined ? String(proposal.notes).trim() || undefined : undefined,
    },
  };
}

export async function createStockCaseFromProposal(
  proposal: Record<string, unknown>
): Promise<{ thesis?: Awaited<ReturnType<typeof saveStockThesis>>["thesis"]; errors?: string[] }> {
  const parsed = proposalToStockCaseInput(proposal);
  if (parsed.errors?.length) return { errors: parsed.errors };
  return saveStockThesis(parsed.input!);
}
