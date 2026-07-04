import type { TradingInboxPayload } from "./bridge";
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

export async function verifyApplyPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
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
    default:
      return { ok: false, detail: "Unsupported proposal type for verification." };
  }
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
  if (type === "trade-review") {
    return trade.reviewedAt ? `reviewedAt: ${trade.reviewedAt}` : null;
  }
  if (type === "trade-close") {
    return trade.status === "closed" ? `status: closed · exit: ${trade.exit}` : null;
  }
  return `${trade.ticker} · ${trade.status}`;
}
