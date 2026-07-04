import { readNoteBody } from "./obsidian";
import { syncObsidianTradeIfLocal } from "./obsidian-local";
import { absoluteNotePath, enrichTrade } from "./trade-links";
import {
  parseMistakes,
  parseTradingInboxPayload,
  type TradingInboxPayload,
  type TradingProposalType,
} from "./bridge";
import {
  closeTrade,
  createTrade,
  getRules,
  getTradeById,
  saveTradeReview,
} from "./storage";
import { upsertTradeInJson } from "./trades-json";
import type { CreateTradeInput, SaveReviewInput, Trade } from "./types";

export type ApplyTradingProposalResult =
  | {
      ok: true;
      message: string;
      type: TradingProposalType;
      tradeId: string;
      trade?: Trade;
    }
  | { ok: false; errors: string[] };

export async function applyTradingProposal(
  payload: Record<string, unknown>
): Promise<ApplyTradingProposalResult> {
  const parsed = parseTradingInboxPayload(payload);
  if (!parsed) {
    return { ok: false, errors: ["Invalid inbox payload shape."] };
  }

  switch (parsed.type) {
    case "trade-proposal":
      return applyTradeProposal(parsed);
    case "trade-close":
      return applyTradeClose(parsed);
    case "trade-review":
      return applyTradeReview(parsed);
    case "analysis":
      return applyAnalysis(parsed);
    case "trade-update":
    case "playbook-create":
    case "playbook-update":
      return {
        ok: false,
        errors: [
          `Block type "${parsed.type}" is supported by the parser; Apply is pending implementation.`,
        ],
      };
    default:
      return { ok: false, errors: ["Unsupported proposal type."] };
  }
}

async function applyTradeProposal(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const input: CreateTradeInput = {
    id: String(p.id).toUpperCase(),
    ticker: String(p.ticker).toUpperCase(),
    entry: Number(p.entry),
    stop: Number(p.stop),
    shares: Number(p.shares),
    status: "pending",
  };
  if (p.target) input.target = Number(p.target);
  if (p.setupId) input.setupId = String(p.setupId);

  const result = await createTrade(input);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Created trade ${input.id} · ${input.ticker}`,
    type: "trade-proposal",
    tradeId: input.id,
    trade: result.trade,
  };
}

async function applyTradeClose(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const id = String(parsed.proposal.id).toUpperCase();
  const exit = Number(parsed.proposal.exit);
  const result = await closeTrade(id, { exit });
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Closed trade ${id} at ${exit}`,
    type: "trade-close",
    tradeId: id,
    trade: result.trade,
  };
}

async function applyTradeReview(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const id = String(p.id).toUpperCase();
  const input: SaveReviewInput = {
    mistakes: parseMistakes(p.mistakes),
    qualityEntry: Number(p.qualityEntry),
    qualityExit: Number(p.qualityExit),
    qualityMgmt: Number(p.qualityMgmt),
    lesson: p.lesson ? String(p.lesson) : undefined,
    actionItem: p.actionItem ? String(p.actionItem) : undefined,
  };

  const result = await saveTradeReview(id, input);
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return {
    ok: true,
    message: `Saved review for ${id}`,
    type: "trade-review",
    tradeId: id,
    trade: result.trade,
  };
}

async function applyAnalysis(
  parsed: TradingInboxPayload
): Promise<ApplyTradingProposalResult> {
  const p = parsed.proposal;
  const id = String(p.id).toUpperCase();
  const trade = await getTradeById(id);
  if (!trade) return { ok: false, errors: ["Trade not found."] };

  const rules = await getRules();
  const notePath = absoluteNotePath(trade, rules);
  let body = "";
  try {
    body = await readNoteBody(notePath);
  } catch {
    body = "";
  }

  const blocks: string[] = [];
  if (p.thesis) blocks.push(`### Tesis (import)\n${String(p.thesis)}`);
  if (p.psychology) blocks.push(`### Psicología (import)\n${String(p.psychology)}`);
  if (p.lessons) blocks.push(`### Lecciones (import)\n${String(p.lessons)}`);
  if (p.notes) blocks.push(`### Notas (import)\n${String(p.notes)}`);

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const appendix = `\n\n---\n\n## AI import · ${stamp}\n\n${blocks.join("\n\n")}\n`;
  const nextBody = `${body.trim()}${appendix}`;

  const updated = enrichTrade(
    {
      ...trade,
      thesis: p.thesis ? String(p.thesis) : trade.thesis,
      psychology: p.psychology ? String(p.psychology) : trade.psychology,
      lessons: p.lessons ? String(p.lessons) : trade.lessons,
      notes: p.notes
        ? [trade.notes, String(p.notes)].filter(Boolean).join("\n\n")
        : trade.notes,
    },
    rules
  );

  await upsertTradeInJson(updated);
  await syncObsidianTradeIfLocal(updated, rules, nextBody);

  return {
    ok: true,
    message: `Saved analysis for ${id} (trade store + Obsidian when local)`,
    type: "analysis",
    tradeId: id,
    trade: updated,
  };
}
