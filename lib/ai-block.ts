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
- stock-case-create: NEW Stock Profile — ticker, currentHypothesis, levels{}, riskRules{minimumRR, invalidation EVENT string}, REQUIRED initialScout{plannedEntry, stopPrice, targetPrice}; optional thesis, notes, historicalAnalysis[]. Creation WITHOUT entry+stop+target is REJECTED. Never invent keys outside schema contract.
- evidence-add: MarketEvidence row — stockProfileId, ticker, timeframe, category, value, confidence (0-100) required; optional note
- decision-update: scout decision on PLAN — planId required; decision mode: verdict (go|wait|probe|no), decisionConfidence (0-100), challenges[] (min 1); tactical mode: at least one of plannedEntry, stopPrice, targetPrice, minimumRR, thesis, notes, validUntil, status, layeredEntry, familyBAssessment (verdict optional); layeredEntry may include stopModel, sizingMode, authorizedRiskAmount, primaryTargetPrice, commonStopPrice, limits[{price,allocationPercent,role?,stopPrice?,rationale?,confidence?}]; Family B may include familyBAssessment{state,trendIntegrity,extension,pullbackQuality,participationCase,evidenceFor[],evidenceAgainst[],unresolved[]}; Matrix recomputes R/risk derived fields server-side — do not forge rr; optional thesisQuality, opportunityQuality (0-100), confirmationCost{...}, locationEvidence, confirmationEvidence, singleEntryOnly, reasoning, planningRisk{}, executionRisk{}, probe{} when verdict=probe, layeredEntry when verdict=go
- layered-entry-update: record fill outcome on PLAN — planId, filledThroughIndex (0-based, -1=none) or status (missed|partial|full|active)
- scout-assessment: validate Stock File — stockFileId, ticker, verdict (go|wait|no|probe), reasons[] (min 1), challengesToThesis[] (min 1) required; optional conditionsToAdvance[], minimumRRMet, invalidationClear — appends to profile notes (decision-update is canonical for PLAN decisions)
- file-update: update Stock File — id required; at least one of status (draft|watching|actionable|invalidated|archived), currentHypothesis, notes, thesis, levels{}, riskRules{}, initialScout{}; initialScout backfills a missing Scout Plan only when no linked active plan exists (plannedEntry, stopPrice, targetPrice required)
- scout-plan-create: NEW Scout Plan window on an EXISTING Stock File — stockFileId (or stockThesisId), ticker, plannedEntry, stopPrice, targetPrice required; optional verdict+decisionConfidence+challenges, playbookId/playbookIds, status (watching|ready|active), thesis, notes, reasoning. Allocates a NEW PLAN-xxx. Do NOT use stock-case-create for same ticker. Do NOT reuse an old planId.
- technical-assessment: MTAE technical JSON only — stockProfileId, ticker, timeframeRoles{strategic_tf,opportunity_tf,refinement_tf,execution_tf}, perTimeframe[] (optional participation{volumeBehavior,wickAnalysis,candleSignals,movementCharacter{primary?|state+directionalEfficiency+rangeProgression,evidence,confidence},historicalReactionZones,largeParticipantFootprint}), integrated{} (optional participationSynthesis, optional momentumAssessment{expansionPotential,currentState,capitalEfficiencyConcern,rationale,scoutImplication,confidence}), technicalSummary{} (trend, zones, probableTarget vs extendedTarget, structuralInvalidation, contradictions, confidence). FORBIDDEN in technicalSummary: maximumEntry, recommendedEntry, minimumRR, shares, scoutVerdict, whalesAreBuying. Optional patchStockFile (default true).
- technical-calibration: human procedure correction — assessmentId, stockProfileId, ticker, errorType, fieldPath, aiValue, humanValue, reason; optional magnitude, confidenceAdjustment
- stock-case-delete: remove Stock Profile — id required; confirmDelete: true required; optional reason. Deletes linked evidence and scout plans. Irreversible — human Apply only.

Trade layer (use only when scouting approves):
- trade-proposal: new trade — id, ticker, entry, stop, shares required; optional target, thesis, setupId, status
- trade-close: close trade — id, exit required; optional confirmExternalClose (true)
- trade-review: post-close review — id, qualityEntry, qualityExit, qualityMgmt (1-5); optional mistakes, lesson, actionItem
- analysis: notes on existing trade — id required; at least one of thesis, psychology, lessons, notes
- trade-update: id required; at least one field to change
- attribution: MAF component attribution — tradeId and/or planId (or experimentId); components[] with component, classification, aiInterpretationConfidence (0-100), reasoning; optional tag, suggestedImprovement, summary, primaryDragComponent, observation{mfe,mae,…}. NEVER invent prices — only supply observation numbers the human stated.
- observation-update: Observation Engine — observationId or tradeId or planId; at least one of targetReached, targetReachedAt, thesisInvalidated, invalidationReachedAt, firstTerminalEvent, maxPrice, minPrice, mfe, mae, betterEntryAvailable, status (observing|concluded). Never invent prices.
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
- New Scout Plan / new window on existing Stock File → scout-plan-create
  · stockFileId (or stockThesisId), ticker, plannedEntry, stopPrice, targetPrice required
  · optional verdict + decisionConfidence + challenges (creates plan + initial decision)
  · NEVER stock-case-create when the Stock File already exists
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
  · or attribution when attributing expectancy to pipeline components (MAF)
- Adjust existing Scout Plan → decision-update (planId required)
All Apply-ready block types:
- stock-case-create: NEW Stock Profile — ticker, currentHypothesis, levels{}, riskRules, REQUIRED initialScout{plannedEntry,stopPrice,targetPrice}
- evidence-add: MarketEvidence — stockProfileId, ticker, timeframe, category, value, confidence required
- decision-update: scout decision or tactical correction — planId required; decision mode needs verdict, decisionConfidence, challenges[]; tactical mode needs at least one of plannedEntry, stopPrice, targetPrice, minimumRR, thesis, notes, validUntil, status, layeredEntry
- layered-entry-update: record fill outcome on PLAN — planId, filledThroughIndex or status (missed|partial|full|active)
- scout-assessment: validate Stock File — stockFileId, ticker, verdict (go|wait|no|probe), reasons[], challengesToThesis[] required
- file-update: Stock File — id required; at least one of status, currentHypothesis, notes, thesis, levels, riskRules, initialScout (backfill missing Scout Plan only)
- scout-plan-create: NEW PLAN on existing Stock File — stockFileId, ticker, plannedEntry, stopPrice, targetPrice; optional verdict+challenges; allocates NEW PLAN-xxx (same-ticker new window)
- technical-assessment: MTAE technical-only multi-TF JSON — stockProfileId, ticker, timeframeRoles, perTimeframe[] (+ optional participation / movementCharacter expansion fields), integrated{} (+ optional participationSynthesis, momentumAssessment), technicalSummary{} (no Entry Solver / RR / Scout verdict / whalesAreBuying)
- technical-calibration: MTAE human procedure correction — assessmentId, errorType, fieldPath, aiValue, humanValue, reason
- stock-case-delete: remove Stock Profile — id required; confirmDelete: true required; optional reason (duplicate cleanup)
- trade-proposal: new trade — id, ticker, entry, stop, shares required; optional target, thesis, setupId, status
- trade-close: close trade — id, exit required; optional confirmExternalClose (true)
- trade-review: post-close review — id, qualityEntry, qualityExit, qualityMgmt (1-5); optional mistakes, lesson, actionItem
- analysis: notes on existing trade — id required; at least one of thesis, psychology, lessons, notes
- trade-update: id required; at least one field to change
- attribution: MAF — tradeId/planId/experimentId; components[{component, classification, aiInterpretationConfidence, reasoning}]; optional observation{} (never invent prices)
- observation-update: Observation Engine — observationId|tradeId|planId + measurable fields (targetReached, mfe/mae, …)
- playbook-create / playbook-update: playbook CRUD

Rules:
- Return exactly one block. No arrays of blocks.
- Do not apply changes — human imports in MtA AI Bridge → Inbox → Apply.
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
        "Could not read this proposal. Return ONE AI Block JSON with a known type (e.g. scout-plan-create, decision-update, trade-proposal, file-update, technical-assessment). Not Open/Adjust/Close alone — those are trade intents mapped to trade-* blocks.",
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
    label: "stock-case-create — new Stock Profile + required Scout window",
    hint: "Profile + REQUIRED initialScout plannedEntry/stopPrice/targetPrice — schema-first, no invented keys",
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
    type: "scout-plan-create",
    label: "scout-plan-create — new PLAN on existing Stock File",
    hint: "Same-ticker new window: stockFileId + entry/stop/target → NEW PLAN-xxx (not stock-case-create)",
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
    type: "technical-assessment",
    label: "technical-assessment — MTAE technical JSON",
    hint: "Multi-TF structure/zones/targets/invalidation + optional Phase A participation — no Entry Solver / capital",
  },
  {
    type: "technical-calibration",
    label: "technical-calibration — MTAE human correction",
    hint: "Procedure error (e.g. support 220→225) — trains Matrix, not P/L",
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
    type: "attribution",
    label: "attribution — MAF component attribution",
    hint: "Which pipeline component dragged expectancy — not a journal",
  },
  {
    type: "observation-update",
    label: "observation-update — post-trade/scout observation",
    hint: "Target/invalidation timestamps, MFE/MAE — never invent prices",
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
  "scout-plan-create": {
    type: "scout-plan-create",
    source: "ai-block",
    proposal: {
      stockFileId: "ST-AMZN-001",
      ticker: "AMZN",
      status: "watching",
      verdict: "wait",
      decisionConfidence: 82,
      plannedEntry: 215,
      stopPrice: 200,
      targetPrice: 260,
      minimumRR: 3,
      playbookIds: ["expectancy-asymmetry", "structural-pullback-entry"],
      thesis:
        "New tactical window on existing Stock File. Wait for structural pullback; probable target 260.",
      reasoning: "Entry 215 / stop 200 / target 260 ≈ 3R inside preferred battle zone.",
      challenges: [
        "Price may defend higher and never reach 215",
        "Deterioration into 215 may require re-check before fill",
      ],
      notes: "Create NEW PLAN linked to ST-AMZN-001. Do not reuse finished plans or closed H00x ids.",
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
      id: "ST-SHOP-001",
      initialScout: {
        plannedEntry: 138.75,
        stopPrice: 125,
        targetPrice: 180,
        verdict: "wait",
        minimumRR: 3,
        thesis: "Only enter if SHOP reaches the maximum admissible entry while the bullish thesis remains valid.",
        notes: "Target 180 is the probable three-month objective. Target 200 is extended upside only.",
      },
    },
  },
  "technical-assessment": {
    type: "technical-assessment",
    source: "ai-block",
    proposal: {
      stockProfileId: "ST-TSLA-001",
      ticker: "TSLA",
      asOfPrice: 248,
      timeframeMapId: "swing-6m",
      timeframeRoles: {
        strategic_tf: "6M",
        opportunity_tf: "3M",
        refinement_tf: "1M",
        execution_tf: "1W",
      },
      perTimeframe: [
        {
          timeframe: "6M",
          role: "strategic_tf",
          trend: "bullish",
          trendConfidence: 74,
          structure: { higherHighs: true, higherLows: true, channel: true },
          supports: [
            {
              rank: 1,
              price: 180,
              strength: 80,
              reason: "Multi-touch demand shelf on 6M",
              confidence: 78,
            },
          ],
          resistances: [
            {
              rank: 1,
              price: 280,
              strength: 70,
              reason: "Prior distribution high",
              confidence: 65,
            },
          ],
          battleZones: [
            {
              id: "bz-6m-1",
              low: 200,
              high: 215,
              reachProbability: "medium",
              asymmetryQuality: "good",
              technicalImportance: 72,
              reason: "Mid-channel reaccumulation band",
            },
          ],
          probableTarget: 260,
          extendedTarget: 300,
          structuralInvalidation: "Monthly close below 180",
          contradictions: ["Momentum cooler than structure"],
          summary: "Secular uptrend intact; channel support still defining structure.",
          participation: {
            volumeBehavior: {
              state: "expanding",
              directionalBias: "buying",
              priceVolumeRelationship: "confirming",
              relativeVolume: "high",
              interpretation: "Advances on expanding volume; pullbacks quieter.",
              confidence: 74,
            },
            wickAnalysis: {
              upperRejections: [
                {
                  zone: { low: 270, high: 280 },
                  frequency: 2,
                  strength: 68,
                  volumeConfirmation: "present",
                  interpretation: "Repeated supply near prior high",
                },
              ],
              lowerRejections: [
                {
                  zone: { low: 178, high: 185 },
                  frequency: 3,
                  strength: 80,
                  volumeConfirmation: "present",
                  interpretation: "Repeated demand defense",
                },
              ],
              liquiditySweeps: [],
              netMessage: "buyer_rejection",
            },
            candleSignals: [
              {
                pattern: "hammer",
                location: "major_support",
                context: "after_orderly_pullback",
                confirmation: "confirmed",
                symbolicMeaning: "demand_response_at_shelf",
                confidence: 70,
              },
            ],
            movementCharacter: {
              primary: "orderly_correction",
              secondary: ["volatility_compression"],
              state: "contracting",
              directionalEfficiency: "medium",
              rangeProgression: "compressing",
              evidence: [
                "higher-TF channel intact",
                "slow pullback",
                "contracting volume on dips",
                "support shelf held",
              ],
              confidence: 72,
              caveat: "Visual/probabilistic — not proof of positioning.",
            },
            historicalReactionZones: [
              {
                zone: { low: 180, high: 185 },
                reactionCount: 4,
                successfulDefenses: 3,
                averageReactionPercent: 12.0,
                volumeCharacter: "expanding_on_rebound",
                confidence: 84,
                interpretation: "Repeated demand response",
              },
            ],
            largeParticipantFootprint: {
              signal: "possible_accumulation",
              evidence: [
                "high volume with limited downside at 180–185",
                "repeated lower-wick defense",
                "quieter pullbacks after thrusts",
              ],
              confidence: 71,
            },
          },
        },
        {
          timeframe: "1M",
          role: "refinement_tf",
          trend: "neutral",
          trendConfidence: 55,
          structure: { range: true, compression: true },
          supports: [
            {
              rank: 1,
              zone: { low: 220, high: 228 },
              strength: 68,
              reason: "1M pivot demand",
              confidence: 70,
            },
          ],
          resistances: [
            {
              rank: 1,
              price: 255,
              strength: 60,
              reason: "Range high supply",
              confidence: 62,
            },
          ],
          battleZones: [
            {
              id: "bz-1m-1",
              low: 220,
              high: 228,
              reachProbability: "high",
              asymmetryQuality: "good",
              technicalImportance: 80,
              reason: "Primary fight for continuation vs failed swing",
            },
          ],
          probableTarget: 255,
          extendedTarget: 280,
          structuralInvalidation: "Monthly close below 210",
          contradictions: [],
          summary: "Compression under resistance; battle zone 220–228 is the refinement fight.",
          participation: {
            volumeBehavior: {
              state: "muted",
              directionalBias: "neutral",
              priceVolumeRelationship: "inconclusive",
              relativeVolume: "low",
              interpretation: "Compression with muted volume — participation undecided.",
              confidence: 60,
            },
            movementCharacter: {
              primary: "volatility_compression",
              state: "stagnant",
              directionalEfficiency: "low",
              rangeProgression: "compressing",
              evidence: [
                "overlapping candles",
                "shrinking ranges",
                "volume muted",
                "repeated range rotation under resistance",
              ],
              confidence: 68,
            },
            wickAnalysis: {
              upperRejections: [],
              lowerRejections: [],
              liquiditySweeps: [],
              netMessage: "inconclusive",
            },
            candleSignals: [
              {
                pattern: "inside_bar",
                location: "mid_range",
                context: "into_resistance",
                confirmation: "pending",
                symbolicMeaning: "pause_before_resolution",
                confidence: 58,
              },
            ],
            historicalReactionZones: [
              {
                zone: { low: 220, high: 228 },
                reactionCount: 2,
                successfulDefenses: 2,
                confidence: 70,
                interpretation: "Recent demand pivot",
              },
            ],
            largeParticipantFootprint: {
              signal: "indeterminate",
              evidence: ["muted volume; no clear absorption signature on 1M"],
              confidence: 45,
            },
          },
        },
      ],
      integrated: {
        structureSpine: "6M channel bullish; 1M compressing into mid-channel.",
        opportunityNote: "Asymmetry improves only inside 220–228 battle zone.",
        battleZoneRanking: [
          {
            id: "bz-1m-1",
            low: 220,
            high: 228,
            reachProbability: "high",
            asymmetryQuality: "good",
            technicalImportance: 80,
            reason: "Primary fight for continuation vs failed swing",
          },
        ],
        executionContext: "1W timing only — wait for zone interaction; do not chase.",
        contradictions: ["Structure bullish while 1M momentum soft"],
        participationSynthesis: {
          dominantCondition: "correction",
          buyingEvidence: [
            "6M expanding volume on advances",
            "repeated defense 180–185",
            "possible_accumulation footprint at shelf",
          ],
          sellingEvidence: ["upper rejection near 270–280", "1M muted into resistance"],
          unresolvedSignals: ["1M compression resolution pending"],
          confidence: 68,
        },
        momentumAssessment: {
          expansionPotential: "moderate",
          currentState: "constructive_compression",
          capitalEfficiencyConcern: true,
          rationale: [
            "Higher-TF structure intact but 1M shows muted directional efficiency",
            "Compression under resistance — expansion not yet confirmed",
            "Capital may stagnate until zone resolution; Scout should demand stronger asymmetry",
          ],
          scoutImplication: "require_better_entry",
          confidence: 66,
        },
      },
      technicalSummary: {
        trend: "bullish",
        structureNote: "Higher-timeframe channel intact; refine entries only in 220–228.",
        majorSupport: 180,
        majorResistance: 280,
        primaryBattleZone: { low: 220, high: 228 },
        secondaryBattleZone: { low: 200, high: 215 },
        probableTarget: 255,
        extendedTarget: 300,
        structuralInvalidation: "Monthly close below 180",
        contradictions: ["Structure bullish while 1M momentum soft"],
        confidence: 70,
      },
      patchStockFile: true,
    },
  },
  "technical-calibration": {
    type: "technical-calibration",
    source: "ai-block",
    proposal: {
      assessmentId: "MTAE-TSLA-001",
      stockProfileId: "ST-TSLA-001",
      ticker: "TSLA",
      errorType: "support_hierarchy",
      fieldPath: "technicalSummary.majorSupport",
      aiValue: 180,
      humanValue: 190,
      magnitude: "+10 dollars",
      confidenceAdjustment: -8,
      reason: "180 was wick liquidity; true demand shelf is 190 on 6M closes",
    },
  },
  "stock-case-delete": {
    type: "stock-case-delete",
    source: "ai-block",
    proposal: {
      id: "ST-MSFT-002",
      confirmDelete: true,
      reason: "Duplicate profile from repeated import — keeping ST-MSFT-001",
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
      playbookId: "weekly-breakout",
      planId: "PLAN-AMZN-001",
      plannedRisk: 100,
      exitReason: "stop",
      lossClassification: "pending_study",
      thesis: "Weekly breakout attempt; chased entry above planned zone.",
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
  attribution: {
    type: "attribution",
    source: "ai-block",
    proposal: {
      tradeId: "H001",
      planId: "PLAN-AMZN-001",
      primaryDragComponent: "stop_quality",
      summary:
        "Thesis later worked in post-stop study; primary drag was stop tightness, not thesis failure.",
      components: [
        {
          component: "thesis_quality",
          classification: "good",
          tag: "thesis_later_validated",
          aiInterpretationConfidence: 78,
          reasoning: "Post-stop study shows target reached after stop; structural thesis held.",
          suggestedImprovement: "Keep thesis gate; do not invalidate solely because stop hit.",
          evidenceRefs: ["targetReachedAfterStop", "thesisOutcome"],
        },
        {
          component: "stop_quality",
          classification: "weak",
          tag: "stop_too_tight",
          aiInterpretationConfidence: 82,
          reasoning: "Stop hit then price recovered to target — stop likely inside normal noise.",
          suggestedImprovement: "Widen strategy stop toward structural invalidation when R still qualifies.",
          evidenceRefs: ["exitReason", "targetReachedAfterStop", "rAchieved"],
        },
        {
          component: "entry_quality",
          classification: "acceptable",
          aiInterpretationConfidence: 60,
          reasoning: "Fill near plan; limited evidence of a materially better entry in observation.",
          evidenceRefs: ["plannedEntry", "executedEntry", "slippageVsPlan"],
        },
      ],
      observation: {
        mfe: 14.2,
        mae: 4.1,
        mfeMaeUnit: "price",
        betterEntryAvailable: false,
      },
    },
  },
  "observation-update": {
    type: "observation-update",
    source: "ai-block",
    proposal: {
      tradeId: "H001",
      targetReached: true,
      targetReachedAt: "2026-02-10T15:30:00.000Z",
      thesisInvalidated: false,
      firstTerminalEvent: "target",
      maxPrice: 128.4,
      minPrice: 93.1,
      mfe: 14.2,
      mae: 4.1,
      mfeMaeUnit: "price",
      status: "concluded",
      dataSource: "ai",
      notes: "Target hit 36 days after stop; thesis invalidation never reached.",
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
      thesis: "Already filled at broker before MtA entry.",
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
