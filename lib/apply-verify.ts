import type { TradingInboxPayload } from "./bridge";
import { getPlanById } from "./plans";
import { getActiveEvidenceForProfile } from "./market-evidence";
import { getStockThesesByTicker, getStockThesisById } from "./stock-theses";
import { getPlaybookById, slugifyPlaybookId } from "./playbooks";
import { getTradeById } from "./storage";
import type { Trade } from "./types";

export interface ApplyVerifyResult {
  ok: boolean;
  detail: string;
}

function fieldContains(stored: string | undefined, expected: string): boolean {
  if (!expected.trim()) return true;
  if (!stored?.trim()) return false;
  return stored.includes(expected.trim());
}

function numMatch(stored: number | undefined, expected: unknown): boolean {
  if (expected === undefined) return true;
  return stored === Number(expected);
}

export async function verifyApplyPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  switch (parsed.type) {
    case "stock-case-create":
      return verifyStockCaseCreatePersistence(parsed);
    case "evidence-add":
      return verifyEvidenceAddPersistence(parsed);
    case "decision-update":
      return verifyDecisionUpdatePersistence(parsed);
    case "layered-entry-update":
      return verifyLayeredEntryUpdatePersistence(parsed);
    case "scout-assessment":
    case "file-update":
      return verifyStockFilePersistence(parsed);
    case "trade-proposal":
    case "trade-close":
    case "trade-review":
    case "analysis":
    case "trade-update":
      return verifyTradePersistence(parsed);
    case "playbook-create":
    case "playbook-update":
      return verifyPlaybookPersistence(parsed);
    default:
      return { ok: false, detail: "Unsupported proposal type for verification." };
  }
}

async function verifyStockCaseCreatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const ticker = String(p.ticker).toUpperCase();
  const hypothesis = String(p.currentHypothesis ?? "").trim();
  const theses = await getStockThesesByTicker(ticker);
  const match = theses.find((t) => t.currentHypothesis.trim() === hypothesis);
  if (!match) {
    return { ok: false, detail: `Stock Profile for ${ticker} with matching hypothesis not found.` };
  }
  return { ok: true, detail: `Stock Profile ${match.id} · ${match.ticker} verified.` };
}

async function verifyDecisionUpdatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const planId = String(p.planId).toUpperCase();
  const reloaded = await getPlanById(planId);
  if (!reloaded) {
    return { ok: false, detail: `Plan ${planId} not found after apply.` };
  }
  const verdict = String(p.verdict);
  if (!reloaded.decision || reloaded.decision.verdict !== verdict) {
    return { ok: false, detail: `Decision verdict not persisted on ${planId}.` };
  }
  const confidence = Number(p.decisionConfidence);
  if (reloaded.decision.decisionConfidence !== confidence) {
    return { ok: false, detail: `Decision confidence mismatch on ${planId}.` };
  }
  return {
    ok: true,
    detail: `Decision on ${planId} · ${reloaded.decision.verdict} · confidence ${reloaded.decision.decisionConfidence}`,
  };
}

async function verifyLayeredEntryUpdatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const planId = String(p.planId).toUpperCase();
  const reloaded = await getPlanById(planId);
  if (!reloaded?.layeredEntry) {
    return { ok: false, detail: `Layered entry not found on ${planId} after apply.` };
  }
  if (p.status !== undefined && reloaded.layeredEntry.status !== String(p.status)) {
    return { ok: false, detail: `Layered entry status mismatch on ${planId}.` };
  }
  if (p.filledThroughIndex !== undefined) {
    const idx = Number(p.filledThroughIndex);
    const filledCount = reloaded.layeredEntry.limits.filter((l) => l.filled).length;
    const expected = idx < 0 ? 0 : idx + 1;
    if (filledCount !== expected) {
      return {
        ok: false,
        detail: `Filled limits count mismatch on ${planId} (expected ${expected}, got ${filledCount}).`,
      };
    }
  }
  return {
    ok: true,
    detail: `Layered entry on ${planId} · ${reloaded.layeredEntry.status} verified.`,
  };
}

async function verifyEvidenceAddPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const profileId = String(p.stockProfileId).toUpperCase();
  const value = String(p.value ?? "").trim();
  const rows = await getActiveEvidenceForProfile(profileId);
  const match = rows.find((row) => row.value.trim() === value);
  if (!match) {
    return { ok: false, detail: `Evidence value not found for ${profileId} after apply.` };
  }
  return {
    ok: true,
    detail: `Evidence ${match.id} · ${match.category} verified for ${profileId}.`,
  };
}

async function verifyStockFilePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const id =
    parsed.type === "scout-assessment"
      ? String(p.stockFileId).toUpperCase()
      : String(p.id).toUpperCase();
  const reloaded = await getStockThesisById(id);
  if (!reloaded) {
    return { ok: false, detail: `Stock File ${id} not found after apply.` };
  }
  if (parsed.type === "scout-assessment") {
    const verdict = String(p.verdict);
    if (!reloaded.notes?.includes(verdict)) {
      return { ok: false, detail: `Assessment verdict not found in ${id} notes.` };
    }
    return { ok: true, detail: `Scout assessment on ${id} · v${reloaded.version}` };
  }
  if (p.currentHypothesis !== undefined && reloaded.currentHypothesis !== String(p.currentHypothesis).trim()) {
    return { ok: false, detail: `Hypothesis not updated on ${id}.` };
  }
  if (p.status !== undefined && reloaded.status !== String(p.status)) {
    return { ok: false, detail: `Status not updated on ${id}.` };
  }
  return { ok: true, detail: `Stock File ${id} · v${reloaded.version} verified.` };
}

async function verifyTradePersistence(parsed: TradingInboxPayload): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const tradeId = String(p.id).toUpperCase();
  const reloaded = await getTradeById(tradeId);

  switch (parsed.type) {
    case "trade-proposal": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found in active store after apply.` };
      }
      const ticker = String(p.ticker).toUpperCase();
      if (reloaded.ticker !== ticker) {
        return {
          ok: false,
          detail: `Trade ${tradeId} exists but ticker is ${reloaded.ticker}, expected ${ticker}.`,
        };
      }
      const expectedStatus =
        p.status !== undefined ? String(p.status).toLowerCase() : "pending";
      if (reloaded.status !== expectedStatus) {
        return {
          ok: false,
          detail: `Trade ${tradeId} status is ${reloaded.status}, expected ${expectedStatus}.`,
        };
      }
      return { ok: true, detail: `Trade ${tradeId} · ${reloaded.ticker} found in store (${reloaded.status}).` };
    }
    case "trade-close": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after close apply.` };
      }
      const exit = Number(p.exit);
      if (reloaded.status !== "closed") {
        return { ok: false, detail: `Trade ${tradeId} status is ${reloaded.status}, expected closed.` };
      }
      if (reloaded.exit !== exit) {
        return {
          ok: false,
          detail: `Trade ${tradeId} exit is ${reloaded.exit ?? "—"}, expected ${exit}.`,
        };
      }
      return { ok: true, detail: `Trade ${tradeId} closed at ${reloaded.exit} in store.` };
    }
    case "trade-review": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after review apply.` };
      }
      if (!reloaded.reviewedAt) {
        return { ok: false, detail: `Trade ${tradeId} has no reviewedAt after review apply.` };
      }
      return { ok: true, detail: `Review saved for ${tradeId} (reviewedAt set).` };
    }
    case "analysis": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after analysis apply.` };
      }
      const checks: string[] = [];
      const failures: string[] = [];
      if (p.thesis) {
        checks.push("thesis");
        if (!fieldContains(reloaded.thesis, String(p.thesis))) failures.push("thesis");
      }
      if (p.psychology) {
        checks.push("psychology");
        if (!fieldContains(reloaded.psychology, String(p.psychology))) failures.push("psychology");
      }
      if (p.lessons) {
        checks.push("lessons");
        if (!fieldContains(reloaded.lessons, String(p.lessons))) failures.push("lessons");
      }
      if (p.notes) {
        checks.push("notes");
        if (!fieldContains(reloaded.notes, String(p.notes))) failures.push("notes");
      }
      if (checks.length === 0) {
        return { ok: false, detail: "No analysis fields to verify." };
      }
      if (failures.length > 0) {
        return {
          ok: false,
          detail: `Expected fields not found on trade ${tradeId}: ${failures.join(", ")}.`,
        };
      }
      return {
        ok: true,
        detail: `Analysis fields persisted on ${tradeId}: ${checks.join(", ")}.`,
      };
    }
    case "trade-update": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after update apply.` };
      }
      const failures: string[] = [];
      if (p.stop !== undefined && !numMatch(reloaded.stop, p.stop)) failures.push("stop");
      if (p.target !== undefined && !numMatch(reloaded.target, p.target)) failures.push("target");
      if (p.entry !== undefined && !numMatch(reloaded.entry, p.entry)) failures.push("entry");
      if (p.ticker !== undefined && reloaded.ticker !== String(p.ticker).toUpperCase()) {
        failures.push("ticker");
      }
      if (p.thesis !== undefined && !fieldContains(reloaded.thesis, String(p.thesis))) {
        failures.push("thesis");
      }
      if (p.playbookId !== undefined && reloaded.playbookId !== String(p.playbookId)) {
        failures.push("playbookId");
      }
      if (failures.length > 0) {
        return {
          ok: false,
          detail: `Trade ${tradeId} updated but fields mismatch: ${failures.join(", ")}.`,
        };
      }
      return { ok: true, detail: `Trade ${tradeId} update verified in store.` };
    }
    default:
      return { ok: false, detail: "Unsupported trade verification type." };
  }
}

async function verifyPlaybookPersistence(parsed: TradingInboxPayload): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const playbookId =
    parsed.type === "playbook-create"
      ? (p.id ? String(p.id).trim() : slugifyPlaybookId(String(p.name)))
      : String(p.id).trim();
  const reloaded = await getPlaybookById(playbookId);
  if (!reloaded) {
    return { ok: false, detail: `Playbook ${playbookId} not found after apply.` };
  }
  if (parsed.type === "playbook-create" && reloaded.name !== String(p.name).trim()) {
    return { ok: false, detail: `Playbook name mismatch for ${playbookId}.` };
  }
  if (parsed.type === "playbook-update") {
    if (p.name !== undefined && reloaded.name !== String(p.name).trim()) {
      return { ok: false, detail: `Playbook ${playbookId} name not updated.` };
    }
    if (p.status !== undefined && reloaded.status !== String(p.status).toUpperCase()) {
      return { ok: false, detail: `Playbook ${playbookId} status not updated.` };
    }
  }
  return { ok: true, detail: `Playbook ${playbookId} · ${reloaded.name} verified in store.` };
}

export function formatPersistenceTarget(storeMode: string): string {
  return storeMode === "supabase" ? "Supabase" : "local JSON";
}

export function summarizeTradeEvidence(trade: Trade | undefined, type: string): string | null {
  if (!trade) return null;
  if (type === "analysis") {
    const parts = [
      trade.thesis ? `thesis: ${trade.thesis.slice(0, 80)}${trade.thesis.length > 80 ? "…" : ""}` : null,
      trade.notes ? `notes: ${trade.notes.slice(0, 80)}${trade.notes.length > 80 ? "…" : ""}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  if (type === "trade-update") {
    return `stop: ${trade.stop} · target: ${trade.target ?? "—"} · ${trade.ticker}`;
  }
  if (type === "trade-review") {
    return trade.reviewedAt ? `reviewedAt: ${trade.reviewedAt}` : null;
  }
  if (type === "trade-close") {
    return trade.status === "closed" ? `status: closed · exit: ${trade.exit}` : null;
  }
  return `${trade.ticker} · ${trade.status}`;
}

export function summarizePlaybookEvidence(
  playbook: { id: string; name: string; status: string } | undefined
): string | null {
  if (!playbook) return null;
  return `${playbook.id} · ${playbook.name} · ${playbook.status}`;
}
