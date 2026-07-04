import { parseTradingInboxPayload, validateProposalPayload } from "./bridge";
import type { TradingInboxPayload } from "./bridge";

export const AI_BLOCK_TYPES = [
  "trade-proposal",
  "trade-close",
  "trade-review",
  "analysis",
] as const;

export type AiBlockType = (typeof AI_BLOCK_TYPES)[number];

export const DEFAULT_AI_BLOCK_REQUEST = `Return ONE AI Block only — plain JSON or a single \`\`\`json fenced block.
Required shape:
{
  "type": "trade-proposal" | "trade-close" | "trade-review" | "analysis",
  "proposal": { ... }
}
Valid types:
- trade-proposal: new trade (id, ticker, entry, stop, shares required)
- trade-close: close trade (id, exit required)
- trade-review: post-close review (id, qualityEntry, qualityExit, qualityMgmt)
- analysis: Obsidian fields (id + thesis/psychology/lessons/notes)
If this snapshot is not enough, ask the user for ONE focused follow-up using a single next_focus_suggestions item (ticker, playbook, or review trade_id). Do not ask for multiple.
Do NOT apply changes. Human imports the block in MatrixTrade → Inbox → Apply.`;

export function extractJsonFromAiBlock(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json|ai-block)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

export function parseAiBlock(raw: string):
  | { ok: true; payload: TradingInboxPayload; body: Record<string, unknown> }
  | { ok: false; error: string; details?: string[] } {
  const jsonText = extractJsonFromAiBlock(raw);
  if (!jsonText) {
    return { ok: false, error: "AI Block is empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      error: "Invalid JSON. Paste plain JSON or a ```json fenced block from your AI assistant.",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "AI Block must be a JSON object with type and proposal." };
  }

  const body = parsed as Record<string, unknown>;
  const inboxPayload = parseTradingInboxPayload(body);
  if (!inboxPayload) {
    return {
      ok: false,
      error: `Invalid type. Supported: ${AI_BLOCK_TYPES.join(", ")}`,
    };
  }

  const validation = validateProposalPayload(inboxPayload);
  if (!validation.ok) {
    return { ok: false, error: "Validation failed", details: validation.errors };
  }

  return { ok: true, payload: inboxPayload, body };
}

export function sampleTradeAiBlock(): string {
  return JSON.stringify(
    {
      type: "trade-proposal",
      source: "ai-block",
      proposal: {
        id: "H002",
        ticker: "TICKER",
        entry: 100,
        stop: 95,
        shares: 10,
        target: 110,
        thesis: "Setup per snapshot context.",
      },
    },
    null,
    2
  );
}
