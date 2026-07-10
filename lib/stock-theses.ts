import { getStockThesesStore } from "./stock-theses-store";
import {
  type SaveStockThesisInput,
  type StockThesis,
  type StockThesisStatus,
  type UpdateStockThesisFieldsInput,
} from "./stock-thesis-types";

export interface ThesisLinkCheck {
  allowed: boolean;
  warning?: string;
  error?: string;
}

export async function getStockTheses(): Promise<StockThesis[]> {
  return getStockThesesStore().readAll();
}

export async function getStockThesisById(id: string): Promise<StockThesis | undefined> {
  const theses = await getStockTheses();
  return theses.find((t) => t.id === id.toUpperCase());
}

export async function getStockThesesByTicker(ticker: string): Promise<StockThesis[]> {
  const normalized = ticker.trim().toUpperCase();
  const theses = await getStockTheses();
  return theses.filter((t) => t.ticker.toUpperCase() === normalized);
}

export function canLinkThesisToPlan(thesis: StockThesis): ThesisLinkCheck {
  if (thesis.status === "invalidated") {
    return {
      allowed: false,
      error: `Stock thesis ${thesis.id} is invalidated — cannot link to a new plan.`,
    };
  }
  if (thesis.status === "archived") {
    return {
      allowed: false,
      error: `Stock thesis ${thesis.id} is archived — cannot link to a new plan.`,
    };
  }
  if (thesis.status === "draft") {
    return {
      allowed: true,
      warning: `Stock thesis ${thesis.id} is still a draft — consider finalizing before planning.`,
    };
  }
  if (thesis.status === "watching" || thesis.status === "actionable") {
    return { allowed: true };
  }
  return { allowed: false, error: `Stock thesis ${thesis.id} cannot be linked.` };
}

export function nextStockThesisId(theses: StockThesis[], ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  let max = 0;
  const prefix = `ST-${normalized}-`;
  for (const thesis of theses) {
    if (!thesis.id.startsWith(prefix)) continue;
    const suffix = thesis.id.slice(prefix.length);
    const n = Number(suffix);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function saveStockThesis(
  input: SaveStockThesisInput
): Promise<{ thesis?: StockThesis; errors?: string[] }> {
  const errors: string[] = [];
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) errors.push("Ticker is required.");
  if (!input.thesis.trim()) errors.push("Thesis is required.");
  if (!input.currentHypothesis.trim()) errors.push("Current hypothesis is required.");
  if (errors.length > 0) return { errors };

  const theses = await getStockTheses();
  const now = new Date().toISOString();
  const existing = input.id
    ? theses.find((t) => t.id === input.id!.toUpperCase())
    : undefined;

  const thesis: StockThesis = {
    id: existing?.id ?? nextStockThesisId(theses, ticker),
    ticker,
    status: input.status ?? existing?.status ?? "draft",
    version: existing ? existing.version + 1 : 1,
    style: input.style.trim() || existing?.style || "swing",
    thesis: input.thesis.trim(),
    historicalAnalysis: input.historicalAnalysis ?? existing?.historicalAnalysis ?? [],
    levels: input.levels ?? existing?.levels ?? {},
    riskRules: input.riskRules,
    currentHypothesis: input.currentHypothesis.trim(),
    notes: input.notes?.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await getStockThesesStore().upsert(thesis);
  return { thesis };
}

export async function updateStockThesisStatus(
  id: string,
  status: StockThesisStatus
): Promise<{ thesis?: StockThesis; errors?: string[] }> {
  const thesis = await getStockThesisById(id);
  if (!thesis) return { errors: ["Stock thesis not found."] };

  const updated: StockThesis = {
    ...thesis,
    status,
    version: thesis.version + 1,
    updatedAt: new Date().toISOString(),
  };
  await getStockThesesStore().upsert(updated);
  return { thesis: updated };
}

export async function applyStockFileInboxUpdate(
  id: string,
  proposal: Record<string, unknown>
): Promise<{ thesis?: StockThesis; errors?: string[] }> {
  const thesis = await getStockThesisById(id);
  if (!thesis) return { errors: ["Stock file not found."] };

  const now = new Date().toISOString();
  const stamp = now.slice(0, 16).replace("T", " ");
  let notes = thesis.notes;

  if (proposal.notes !== undefined) {
    const incoming = String(proposal.notes).trim();
    const block = `### AI import · ${stamp}\n${incoming}`;
    notes = notes ? `${notes}\n\n${block}` : block;
  }

  const statusRaw = proposal.status;
  const status =
    statusRaw !== undefined &&
    ["draft", "watching", "actionable", "invalidated", "archived"].includes(String(statusRaw))
      ? (String(statusRaw) as StockThesisStatus)
      : undefined;

  const updated: StockThesis = {
    ...thesis,
    status: status ?? thesis.status,
    thesis: proposal.thesis !== undefined ? String(proposal.thesis).trim() : thesis.thesis,
    currentHypothesis:
      proposal.currentHypothesis !== undefined
        ? String(proposal.currentHypothesis).trim()
        : thesis.currentHypothesis,
    notes,
    version: thesis.version + 1,
    updatedAt: now,
  };

  await getStockThesesStore().upsert(updated);
  return { thesis: updated };
}

export async function appendScoutAssessment(
  id: string,
  proposal: Record<string, unknown>
): Promise<{ thesis?: StockThesis; errors?: string[] }> {
  const thesis = await getStockThesisById(id);
  if (!thesis) return { errors: ["Stock file not found."] };

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const reasons = Array.isArray(proposal.reasons)
    ? proposal.reasons.map((r) => String(r)).join("\n- ")
    : "";
  const challenges = Array.isArray(proposal.challengesToThesis)
    ? proposal.challengesToThesis.map((c) => String(c)).join("\n- ")
    : "";
  const conditions = Array.isArray(proposal.conditionsToAdvance)
    ? proposal.conditionsToAdvance.map((c) => String(c)).join("\n- ")
    : "";

  const block = [
    `## Scout assessment · ${stamp}`,
    `Verdict: **${String(proposal.verdict)}**`,
    reasons ? `Reasons:\n- ${reasons}` : null,
    challenges ? `Challenges to thesis:\n- ${challenges}` : null,
    conditions ? `Conditions to advance:\n- ${conditions}` : null,
    proposal.minimumRRMet !== undefined ? `minimumRRMet: ${proposal.minimumRRMet}` : null,
    proposal.invalidationClear !== undefined ? `invalidationClear: ${proposal.invalidationClear}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const notes = thesis.notes ? `${thesis.notes}\n\n${block}` : block;
  const updated: StockThesis = {
    ...thesis,
    notes,
    version: thesis.version + 1,
    updatedAt: new Date().toISOString(),
  };
  await getStockThesesStore().upsert(updated);
  return { thesis: updated };
}

export async function updateStockThesisFields(
  id: string,
  input: UpdateStockThesisFieldsInput
): Promise<{ thesis?: StockThesis; errors?: string[] }> {
  const thesis = await getStockThesisById(id);
  if (!thesis) return { errors: ["Stock thesis not found."] };

  const updated: StockThesis = {
    ...thesis,
    status: input.status ?? thesis.status,
    currentHypothesis: input.currentHypothesis?.trim() ?? thesis.currentHypothesis,
    notes: input.notes !== undefined ? input.notes.trim() || undefined : thesis.notes,
    version: thesis.version + 1,
    updatedAt: new Date().toISOString(),
  };
  await getStockThesesStore().upsert(updated);
  return { thesis: updated };
}
