import { AI_BRIDGE_BLOCK_TYPES } from "./ai-bridge-types";
import { parseTradingInboxPayload, validateProposalPayload } from "./bridge";
import type { TradingInboxPayload } from "./bridge";

export { AI_BRIDGE_BLOCK_TYPES as AI_BLOCK_TYPES };
export type AiBlockType = (typeof AI_BRIDGE_BLOCK_TYPES)[number];

export const DEFAULT_AI_BLOCK_REQUEST = `Return ONE AI Block only — plain JSON or a single \`\`\`json fenced block.
Required shape:
{
  "type": "<block-type>",
  "proposal": { ... }
}
Block types (all Apply ready):
- trade-proposal: new trade — id, ticker, entry, stop, shares required; optional target, thesis, setupId
- trade-close: close trade — id, exit required
- trade-review: post-close review — id, qualityEntry, qualityExit, qualityMgmt (1-5); optional mistakes, lesson, actionItem
- analysis: notes on existing trade — id required; at least one of thesis, psychology, lessons, notes
- trade-update: id required; at least one field to change (entry, stop, target, shares, ticker, thesis, notes, playbookId, setupId, status)
- playbook-create: name required; optional id, description, status (TESTING|ACTIVE|RETIRED), checklist[]
- playbook-update: id required; at least one of name, description, status, checklist
Rules:
- Return exactly one block. No arrays of blocks.
- Do not apply changes — human imports in MatrixTrade AI Bridge → Inbox → Apply.
- If this snapshot is not enough, ask for ONE next_focus_suggestions item (ticker, playbook, or review trade_id).`;

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
      error: `Invalid type. Supported: ${AI_BRIDGE_BLOCK_TYPES.join(", ")}`,
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
