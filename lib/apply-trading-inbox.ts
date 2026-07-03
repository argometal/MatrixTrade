import { readNoteBody, writeTradeFile } from "./obsidian";
import { absoluteNotePath } from "./trade-links";
import {
  parseMistakes,
  parseTradingInboxPayload,
  type TradingInboxPayload,
} from "./bridge";
import {
  closeTrade,
  createTrade,
  getRules,
  getTradeById,
  saveTradeReview,
} from "./storage";
import type { CreateTradeInput, SaveReviewInput } from "./types";

export async function applyTradingProposal(
  payload: Record<string, unknown>
): Promise<{ ok: true; message: string } | { ok: false; errors: string[] }> {
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
    default:
      return { ok: false, errors: ["Unsupported proposal type."] };
  }
}

async function applyTradeProposal(
  parsed: TradingInboxPayload
): Promise<{ ok: true; message: string } | { ok: false; errors: string[] }> {
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
  return { ok: true, message: `Created trade ${input.id} · ${input.ticker}` };
}

async function applyTradeClose(
  parsed: TradingInboxPayload
): Promise<{ ok: true; message: string } | { ok: false; errors: string[] }> {
  const id = String(parsed.proposal.id).toUpperCase();
  const exit = Number(parsed.proposal.exit);
  const result = await closeTrade(id, { exit });
  if (result.errors?.length) return { ok: false, errors: result.errors };
  return { ok: true, message: `Closed trade ${id} at ${exit}` };
}

async function applyTradeReview(
  parsed: TradingInboxPayload
): Promise<{ ok: true; message: string } | { ok: false; errors: string[] }> {
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
  return { ok: true, message: `Saved review for ${id}` };
}

async function applyAnalysis(
  parsed: TradingInboxPayload
): Promise<{ ok: true; message: string } | { ok: false; errors: string[] }> {
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

  await writeTradeFile(
    { ...trade, obsidianNote: trade.obsidianNote!, notePath: trade.notePath! },
    rules,
    nextBody
  );

  return { ok: true, message: `Appended analysis to Obsidian note for ${id}` };
}
