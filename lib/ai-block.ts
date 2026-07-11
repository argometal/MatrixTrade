import { AI_BRIDGE_BLOCK_TYPES } from "./ai-bridge-types";
import { normalizeAiBlockJson } from "./normalize-ai-block-json";
import { parseTradingInboxPayload, validateProposalPayload } from "./bridge";
import type { TradingInboxPayload } from "./bridge";

export { AI_BRIDGE_BLOCK_TYPES as AI_BLOCK_TYPES };
export type AiBlockType = (typeof AI_BRIDGE_BLOCK_TYPES)[number];

export const SCOUTING_AI_BLOCK_REQUEST = `Return ONE AI Block only — plain JSON or a single \`\`\`json fenced block.
Required shape:
{
  "type": "<block-type>",
  "proposal": { ... }
}
PRIORITY — Scouting (validate thesis; do not rubber-stamp):
- stock-case-create: NEW Stock Profile — ticker, currentHypothesis, levels{}, riskRules{minimumRR, invalidation}; optional thesis, notes, historicalAnalysis[], initialScout{plannedEntry, stopPrice, targetPrice}
- evidence-add: MarketEvidence row — stockProfileId, ticker, timeframe, category, value, confidence (0-100) required; optional note
- decision-update: scout decision on PLAN — planId, verdict (go|wait|probe|no), decisionConfidence (0-100), challenges[] (min 1) required; optional thesisQuality, opportunityQuality (0-100), confirmationCost{currentRR,estimatedConfirmedRR,rewardConsumedPercent,assessment} (supplied prices only), locationEvidence, confirmationEvidence, singleEntryOnly, reasoning, planningRisk{}, executionRisk{}, probe{} when verdict=probe, layeredEntry{executionMethod,limits[{price,allocationPercent}]} when verdict=go (allocations sum 100%)
- layered-entry-update: record fill outcome on PLAN — planId, filledThroughIndex (0-based, -1=none) or status (missed|partial|full|active)
- scout-assessment: validate Stock File — stockFileId, ticker, verdict (go|wait|no|probe), reasons[] (min 1), challengesToThesis[] (min 1) required; optional conditionsToAdvance[], minimumRRMet, invalidationClear — appends to profile notes (decision-update is canonical for PLAN decisions)
- file-update: propose Stock File change — id required; at least one of status (draft|watching|actionable|invalidated|archived), currentHypothesis, notes, thesis, levels{}, riskRules{}

Trade layer (use only when scouting approves):
- trade-proposal: new trade — id, ticker, entry, stop, shares required; optional target, thesis, setupId, status
- trade-close: close trade — id, exit required; optional confirmExternalClose (true)
- trade-review: post-close review — id, qualityEntry, qualityExit, qualityMgmt (1-5); optional mistakes, lesson, actionItem
- analysis: notes on existing trade — id required; at least one of thesis, psychology, lessons, notes
- trade-update: id required; at least one field to change
- playbook-create / playbook-update: playbook CRUD

Rules:
- Challenge the thesis — challengesToThesis must list real risks or contradictions.
- Return exactly one block. No arrays of blocks.
- Do not apply changes — human imports in Inbox → Apply.
- If context is insufficient, ask ONE clarifying question.`;

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

All Apply-ready block types:
- stock-case-create: NEW Stock Profile — ticker, thesis, currentHypothesis, levels{}, riskRules{minimumRR, invalidation} required
- evidence-add: MarketEvidence — stockProfileId, ticker, timeframe, category, value, confidence required
- decision-update: scout decision — planId, verdict (go|wait|probe|no), decisionConfidence, challenges[] required
- layered-entry-update: record fill outcome on PLAN — planId, filledThroughIndex or status (missed|partial|full|active)
- scout-assessment: validate Stock File — stockFileId, ticker, verdict (go|wait|no|probe), reasons[], challengesToThesis[] required
- file-update: Stock File — id required; at least one of status, currentHypothesis, notes, thesis, levels, riskRules
- trade-proposal: new trade — id, ticker, entry, stop, shares required; optional target, thesis, setupId, status
- trade-close: close trade — id, exit required; optional confirmExternalClose (true)
- trade-review: post-close review — id, qualityEntry, qualityExit, qualityMgmt (1-5); optional mistakes, lesson, actionItem
- analysis: notes on existing trade — id required; at least one of thesis, psychology, lessons, notes
- trade-update: id required; at least one field to change
- playbook-create / playbook-update: playbook CRUD

Rules:
- Return exactly one block. No arrays of blocks.
- Do not apply changes — human imports in MatrixTrade AI Bridge → Inbox → Apply.
- Reply to the human in trading language, not internal type names.
- If the snapshot is not enough, ask for ONE missing detail (ticker, trade id, or exit price).`;

export function extractJsonFromAiBlock(raw: string): string {
  return normalizeAiBlockJson(raw);
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
      error:
        "Invalid JSON. Paste plain JSON or a ```json fenced block. Tip: if the paste used curly quotes, re-ask your AI for ASCII JSON only.",
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
    type: "stock-case-create",
    label: "stock-case-create — new Stock Profile",
    hint: "Extract ticker, thesis, zones, stop rule from research",
  },
  {
    type: "evidence-add",
    label: "evidence-add — append observation",
    hint: "structure/volume/regime observation with confidence",
  },
  {
    type: "decision-update",
    label: "decision-update — scout decision on PLAN",
    hint: "verdict + confidence + challenges; probe{} when verdict=probe; layeredEntry{} when verdict=go",
  },
  {
    type: "layered-entry-update",
    label: "layered-entry-update — record fill on PLAN",
    hint: "filledThroughIndex or status (missed) — no thesis change",
  },
  {
    type: "scout-assessment",
    label: "scout-assessment — validate thesis",
    hint: "go/wait/no + reasons + challenges (required)",
  },
  {
    type: "file-update",
    label: "file-update — update Stock File",
    hint: "status, hypothesis, notes on suspect file",
  },
  {
    type: "trade-proposal",
    label: "trade-proposal — create trade",
    hint: "New trade: id, ticker, entry, stop, shares; optional status pending|open",
  },
  {
    type: "trade-update",
    label: "trade-update — update trade",
    hint: "Change fields on existing trade (stop, target, thesis, …)",
  },
  {
    type: "trade-close",
    label: "trade-close — close trade",
    hint: "Close with exit price; add confirmExternalClose:true for pending broker fills",
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
  "stock-case-create": {
    type: "stock-case-create",
    source: "ai-block",
    proposal: {
      ticker: "NVDA",
      style: "swing",
      status: "watching",
      thesis: "Leader in AI infrastructure; buy pullbacks to rising weekly support, not extended momentum.",
      currentHypothesis: "Wait for pullback to 118-125 zone with 3R+ to stop below 112",
      levels: {
        majorSupport: 112,
        majorResistance: 145,
        primaryZone: { low: 118, high: 125 },
        secondaryZone: { low: 108, high: 112 },
        targets: [135, 145, 160],
      },
      riskRules: {
        minimumRR: 3,
        invalidation: "Weekly close below 108",
        notes: "Skip chase entries above primary zone",
      },
      historicalAnalysis: [
        { timeframe: "1W", summary: "HH/HL intact; prior breakout holding as support" },
        { timeframe: "1D", summary: "Pullback from highs; volume contracting near zone" },
      ],
      notes: "AI reasoning snapshot — optional long-form conclusions from the chat.",
      initialScout: {
        plannedEntry: 122,
        supportLevel: 118,
        stopPrice: 112,
        targetPrice: 145,
        validUntil: "2026-07-17T23:59:59.000Z",
        thesis: "Pullback to 118-125; 3R+ to stop at 112",
      },
    },
  },
  "evidence-add": {
    type: "evidence-add",
    source: "ai-block",
    proposal: {
      stockProfileId: "ST-TSLA-001",
      ticker: "TSLA",
      timeframe: "1W",
      category: "structure",
      value: "HH/HL intact on weekly",
      confidence: 72,
    },
  },
  "decision-update": {
    type: "decision-update",
    source: "ai-block",
    proposal: {
      planId: "PLAN-001",
      verdict: "wait",
      decisionConfidence: 68,
      challenges: [
        "Price still above primary zone — chase risk elevated",
        "Weekly structure intact but no trigger at planned entry",
      ],
      reasoning: "Wait for pullback to 340-355 with R:R >= 3 before probe or full entry.",
      thesisQuality: 72,
      opportunityQuality: 41,
      confirmationCost: {
        currentRR: 3.8,
        estimatedConfirmedRR: 2.1,
        rewardConsumedPercent: 35,
        assessment: "Waiting for daily reclaim may push R:R below Stock File minimum 3.",
      },
      locationEvidence: "Price touched lower edge of primary zone once",
      confirmationEvidence: "No reclaim or higher low yet",
      planningRisk: { structure: "HH/HL intact", stop: "below 320", rr: "3R min not met at spot" },
      executionRisk: { earnings: "none this week", emotion: "avoid FOMO chase" },
    },
  },
  "layered-entry-update": {
    type: "layered-entry-update",
    source: "ai-block",
    proposal: {
      planId: "PLAN-002",
      filledThroughIndex: 1,
    },
  },
  "scout-assessment": {
    type: "scout-assessment",
    source: "ai-block",
    proposal: {
      stockFileId: "ST-TSLA-001",
      ticker: "TSLA",
      verdict: "wait",
      reasons: ["Price above primary zone 340-355", "Planned R:R below minimum 3"],
      challengesToThesis: [
        "Pullback thesis may be late if structure breaks before zone",
        "Monthly invalidation not tested but momentum extended",
      ],
      conditionsToAdvance: ["Pullback to 340-355 with stop below 320 and R:R >= 3"],
      minimumRRMet: false,
      invalidationClear: true,
    },
  },
  "file-update": {
    type: "file-update",
    source: "ai-block",
    proposal: {
      id: "ST-TSLA-001",
      currentHypothesis: "Wait for 340-355; reject chase entries above primary zone",
      status: "watching",
    },
  },
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
      status: "pending",
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

export const AI_BLOCK_SAMPLES = SAMPLE_BLOCKS;

export function sampleTradeAiBlock(): string {
  return sampleAiBlock("trade-proposal");
}

/** Protocol examples for AI Bridge inbox proposals (human Apply only). */
export const AI_BRIDGE_PROTOCOL_EXAMPLES: Record<string, Record<string, unknown>> = {
  "create-pending-trade": {
    type: "trade-proposal",
    source: "ai-block",
    proposal: {
      id: "H002",
      ticker: "GOOGL",
      entry: 175.5,
      stop: 170,
      shares: 10,
      status: "pending",
    },
  },
  "create-open-trade": {
    type: "trade-proposal",
    source: "ai-block",
    proposal: {
      id: "H002",
      ticker: "GOOGL",
      entry: 175.5,
      stop: 170,
      shares: 10,
      status: "open",
      thesis: "Already filled at broker before MatrixTrade entry.",
    },
  },
  "close-open-trade": {
    type: "trade-close",
    source: "ai-block",
    proposal: {
      id: "H001",
      exit: 108.5,
    },
  },
  "close-external-pending-trade": {
    type: "trade-close",
    source: "ai-block",
    proposal: {
      id: "H002",
      exit: 172.25,
      confirmExternalClose: true,
    },
  },
};

export function sampleAiBridgeProtocolExample(key: keyof typeof AI_BRIDGE_PROTOCOL_EXAMPLES): string {
  return JSON.stringify(AI_BRIDGE_PROTOCOL_EXAMPLES[key], null, 2);
}
