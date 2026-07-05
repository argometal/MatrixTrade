import { AI_BRIDGE_BLOCK_TYPES } from "./ai-bridge-types";
import { parseTradingInboxPayload, validateProposalPayload } from "./bridge";
import type { TradingInboxPayload } from "./bridge";

export { AI_BRIDGE_BLOCK_TYPES as AI_BLOCK_TYPES };
export type AiBlockType = (typeof AI_BRIDGE_BLOCK_TYPES)[number];

export const DEFAULT_AI_BLOCK_REQUEST = `The human speaks naturally about trading: Open, Adjust, Close, Analyze.
You infer the correct internal block type and return exactly ONE AI Block — plain JSON or a single \`\`\`json fenced block.

Required shape:
{
  "type": "<internal-type>",
  "proposal": { ... }
}

Human action → internal type (choose automatically — never ask the human to pick a type):
- Open Trade → trade-proposal
  · status "pending" (default) or "open" if already filled at the broker
  · required: id, ticker, entry, stop, shares
- Adjust Trade → trade-update
  · id required; at least one field to change (stop, target, entry, shares, thesis, notes, status, …)
- Close Trade → trade-close
  · id and exit required
  · confirmExternalClose: true only when closing a pending trade already executed at the broker
- Analyze Trade → analysis (notes: thesis, psychology, lessons, notes)
  · or trade-review when post-close review with qualityEntry/Exit/Mgmt (1-5), mistakes, lesson

Rules:
- Return exactly one block. No arrays of blocks.
- Do not apply changes — human imports in MatrixTrade AI Bridge → Inbox → Apply.
- Reply to the human in trading language, not internal type names.
- If the snapshot is not enough, ask for ONE missing detail (ticker, trade id, or exit price).`;

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
      error:
        "Could not read this proposal. Ask your AI to return one JSON block for Open, Adjust, Close, or Analyze.",
    };
  }

  const validation = validateProposalPayload(inboxPayload);
  if (!validation.ok) {
    return { ok: false, error: "Validation failed", details: validation.errors };
  }

  return { ok: true, payload: inboxPayload, body };
}

export interface AiBlockSampleOption {
  type: AiBlockType;
  label: string;
  hint: string;
}

export const AI_BLOCK_SAMPLE_OPTIONS: AiBlockSampleOption[] = [
  {
    type: "trade-proposal",
    label: "trade-proposal — create trade",
    hint: "New trade: id, ticker, entry, stop, shares",
  },
  {
    type: "trade-update",
    label: "trade-update — update trade",
    hint: "Change fields on existing trade (stop, target, thesis, …)",
  },
  {
    type: "trade-close",
    label: "trade-close — close trade",
    hint: "Close with exit price",
  },
  {
    type: "trade-review",
    label: "trade-review — post-close review",
    hint: "Quality scores 1–5 + optional lesson",
  },
  {
    type: "analysis",
    label: "analysis — notes on trade",
    hint: "Thesis, psychology, lessons, or notes on existing trade",
  },
  {
    type: "playbook-create",
    label: "playbook-create — new playbook",
    hint: "Name, status, checklist",
  },
  {
    type: "playbook-update",
    label: "playbook-update — edit playbook",
    hint: "Update name, status, description, or checklist",
  },
];

const SAMPLE_BLOCKS: Record<AiBlockType, Record<string, unknown>> = {
  "trade-proposal": {
    type: "trade-proposal",
    source: "ai-block",
    proposal: {
      id: "H00X",
      ticker: "TICKER",
      entry: 100,
      stop: 95,
      shares: 10,
      target: 110,
      thesis: "Setup per snapshot context.",
    },
  },
  "trade-update": {
    type: "trade-update",
    source: "ai-block",
    proposal: {
      id: "H001",
      stop: 95,
      target: 110,
      thesis: "Updated stop and target after review.",
    },
  },
  "trade-close": {
    type: "trade-close",
    source: "ai-block",
    proposal: {
      id: "H001",
      exit: 108.5,
    },
  },
  "trade-review": {
    type: "trade-review",
    source: "ai-block",
    proposal: {
      id: "H001",
      qualityEntry: 4,
      qualityExit: 3,
      qualityMgmt: 4,
      mistakes: ["none"],
      lesson: "Waited for confirmation; exit was early.",
      actionItem: "Hold to target when trend intact.",
    },
  },
  analysis: {
    type: "analysis",
    source: "ai-block",
    proposal: {
      id: "H001",
      thesis: "Breakout held above prior high; trend intact.",
      psychology: "Patient entry; no FOMO.",
      lessons: "Let winners run when structure supports it.",
      notes: "Watch next resistance at target.",
    },
  },
  "playbook-create": {
    type: "playbook-create",
    source: "ai-block",
    proposal: {
      id: "momentum-pullback",
      name: "Momentum Pullback",
      status: "TESTING",
      description: "Pullback to support in an uptrend.",
      checklist: ["HTF trend up", "Pullback to support", "Trigger on lower timeframe"],
    },
  },
  "playbook-update": {
    type: "playbook-update",
    source: "ai-block",
    proposal: {
      id: "weekly-breakout",
      status: "ACTIVE",
      description: "Promoted after positive sample size.",
    },
  },
};

export function sampleAiBlock(type: AiBlockType): string {
  const block = SAMPLE_BLOCKS[type];
  return JSON.stringify(block, null, 2);
}

export function sampleTradeAiBlock(): string {
  return sampleAiBlock("trade-proposal");
}
