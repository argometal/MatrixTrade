/**
 * Apply schema contract — schema-first handshake for AI.
 * Never invent keys: use only types/fields listed here or in accepted samples.
 */
import { AI_BLOCK_SAMPLES, type AiBlockType } from "./ai-block";
import { AI_BRIDGE_BLOCK_TYPES } from "./ai-bridge-types";
import {
  buildLegacyTradeCompletionContractText,
  buildLegacyTradeUpdateExample,
  LEGACY_ABSENT_PLAN_ID,
  LEGACY_ABSENT_PLAYBOOK_ID,
} from "./legacy-trade-completion";
import { buildLegacyDateCorrectionContractText } from "./legacy-date-correction";
import {
  buildObservationUpdateContractText,
  OBSERVATION_UPDATE_ALLOWED_KEYS,
} from "./observation-validate";
import {
  STOCK_CASE_CREATE_ALLOWED_KEYS,
  STOCK_CASE_LEVELS_ALLOWED_KEYS,
  STOCK_CASE_RISK_ALLOWED_KEYS,
  STOCK_CASE_SCOUT_ALLOWED_KEYS,
} from "./stock-case-schema";

export {
  STOCK_CASE_CREATE_ALLOWED_KEYS,
  STOCK_CASE_LEVELS_ALLOWED_KEYS,
  STOCK_CASE_RISK_ALLOWED_KEYS,
  STOCK_CASE_SCOUT_ALLOWED_KEYS,
  listUnknownStockCaseCreateKeys,
} from "./stock-case-schema";

/** Layer ownership — never mix into the wrong Apply block. */
export const APPLY_LAYER_OWNERSHIP = {
  MTAE: [
    "structure",
    "zones",
    "targets (structural)",
    "invalidation (structural)",
    "participation",
    "momentumAssessment",
  ],
  StockFile: [
    "currentHypothesis",
    "levels (primaryZone/secondaryZone/majorSupport/targets)",
    "riskRules.invalidation (observable event)",
    "historicalAnalysis / evidence",
    "strategic memory",
  ],
  Scout: [
    "plannedEntry",
    "stopPrice",
    "targetPrice",
    "plannedRR",
    "verdict go|wait|probe|no",
    "capital gate / asymmetry",
  ],
  Trade: ["entry fill", "exit", "shares", "execution reality"],
  ExternalPosition: [
    "shares / averageCost / valuation (server-owned; average_cost only)",
    "capitalTreatment / liquidityStatus / settlementStatus",
    "optional exit plan",
    "reduction → pending_settlement; settle → settled cash once",
    "never Scout / Trade / MAF / experiment metrics",
  ],
} as const;

export type ApplySchemaContract = {
  schemaVersion: string;
  product: "MTA";
  rules: string[];
  acceptedTypes: AiBlockType[];
  requiredFields: Record<string, string[]>;
  allowedEnums: Record<string, string[]>;
  layerOwnership: typeof APPLY_LAYER_OWNERSHIP;
  stockCaseCreate: {
    allowedProposalKeys: readonly string[];
    allowedLevelsKeys: readonly string[];
    allowedRiskRulesKeys: readonly string[];
    allowedInitialScoutKeys: readonly string[];
    required: string[];
    notes: string[];
  };
  examples: Partial<Record<AiBlockType, Record<string, unknown>>>;
};

export function buildApplySchemaContract(): ApplySchemaContract {
  return {
    schemaVersion: "2026-09-05.mxt-029-correctability",
    product: "MTA",
    rules: [
      "SCHEMA-FIRST: before any Apply JSON, open Control → Apply and copy the visible row Apply schema contract.",
      "Never invent JSON keys, enum values, nesting, or field formats.",
      "If that exact copy row is unavailable, stop and ask the human to open Control → Apply and copy Apply schema contract — do not guess.",
      "Separate analysis (conceptual levels) from serialization (exact MTA keys).",
      "A validator error on one field does not validate the rest of the object.",
      "stock-case-create REQUIRES initialScout.plannedEntry + stopPrice + targetPrice.",
      "scout-plan-create REQUIRES plannedEntry + stopPrice + targetPrice.",
      "riskRules.invalidation must be an observable event string, not a bare price.",
      "Do not put Scout capital fields into technical-assessment.",
      "Do not put Entry Solver / R:R / shares into MTAE.",
      "MTAE presentation is evidence-first (Analysis Mode); explain only on request.",
      `Legacy closed trades: never invent playbookId/planId — use ${LEGACY_ABSENT_PLAYBOOK_ID} / ${LEGACY_ABSENT_PLAN_ID} for historical absence.`,
      "Legacy date correction: trade-update with datesReconstructed:true + dateCorrectionNote; closed legacy only; audit prior dates.",
      "thesis-t0-repair: Plan-specific T0 reconstruct (missing) or correct (wrong); note+evidence required; prior body in correctionAudit; never share freeze across Plans via stockThesisId; hindsight P/L alone insufficient.",
      "observation-update: one of observationId|tradeId|planId + at least one measurable field; never invent prices; observation ≠ attribution.",
      "plan-outcome: one mutation per block; human-confirmed event order; AI must not invent prices, timestamps, fills or risk.",
      "plan-outcome: unexecuted_plan_loss = entry reached + stop before target + execution-failure reason; counterfactualR server −1.",
      "plan-outcome: missed_opportunity = entry never reached + target before stop + entry_not_reached; counterfactualR server +planned R; no Trade; no chase.",
      "plan-outcome: no Trade created; realized P/L unchanged; Stock File thesis unchanged; MAF separate.",
      "plan-outcome: wrong persisted outcome → repairKind=corrected + repairNote/note (≥8); prior outcome in correctionAudit; LO/OBS re-sync.",
      "External Position: outside Scout→Trade pipeline; experimentEligible=false; never creates Trade/MAF; capital only via Capital Planner.",
      "external-position-reduction: requires reductionId|executionReference; server computes proceeds/realized P/L; proceeds start pending_settlement (not settled cash).",
      "external-position-settle: credits settled cash once via settlement ledger; pending ≠ settled.",
      "External Position costBasisMethod is average_cost only — FIFO/specific-lot not implemented.",
      "Capital Planner Model A (cash_ledger): never derive settledCash from totalEquity; availableCapital = deployableCapital; unconfigured ≠ known zero.",
      "Capital configuration location: Settings → Capital (`/settings/capital`). Account balances are global — never embed in Scout/Stock/Trade/MTAE/Learning snapshots.",
      "Settings → Capital prepares capital-configuration-* proposals only; persistence remains Control → Apply. Never mix External Position fields into Capital Configuration.",
      "capital-configuration-create: at least one complete balance pair (cash+as-of or equity+as-of); orphan balance or as-of rejected; null invalid; 0 valid; never infer cash↔equity.",
      "capital-configuration-update: id + changed fields only; omitted=unchanged; number (incl. 0)=set; null=explicit clear; never Number(null).",
      "capital-configuration-update: balance changes require matching fresh as-of; clearing a balance requires clearing its as-of (both null); configured balance requires configured as-of.",
      "Settings status snapshot omits balances; private full snapshot requires explicit confirmation and is never attached to ticker packages.",
      "capital-configuration-*: settledCashBase and totalEquityBase are independent; Scout approval does not auto-reserve.",
      "capital-reservation-*: Apply-only; does not create Trade; one active reservation per Plan.",
      "capital-ledger-adjustment: idempotencyKey required; settled amounts immutable; reversals are separate events.",
      "Human mutations only via Control → Apply → Validate → Accept.",
    ],
    acceptedTypes: [...AI_BRIDGE_BLOCK_TYPES] as AiBlockType[],
    requiredFields: {
      "stock-case-create": [
        "ticker",
        "currentHypothesis",
        "levels",
        "riskRules.minimumRR",
        "riskRules.invalidation",
        "initialScout.plannedEntry",
        "initialScout.stopPrice",
        "initialScout.targetPrice",
      ],
      "scout-plan-create": [
        "stockFileId|stockThesisId",
        "ticker",
        "plannedEntry",
        "stopPrice",
        "targetPrice",
      ],
      "file-update": ["id", "at least one updatable field"],
      "decision-update": ["planId", "decision mode OR tactical fields (including operationalAssessment)"],
      "technical-assessment": [
        "stockProfileId",
        "ticker",
        "timeframeRoles",
        "perTimeframe[]",
        "integrated",
        "technicalSummary",
      ],
      "trade-proposal": ["id", "ticker", "entry", "stop", "shares"],
      "trade-update": [
        "id",
        "at least one of: playbookId, planId, thesis, riskRewardPlanned, lossClassification, postStopStudy, notes, datesReconstructed+dateCorrectionNote, …",
      ],
      "trade-review": ["id", "qualityEntry", "qualityExit", "qualityMgmt"],
      "observation-update": [
        "observationId|tradeId|planId",
        "at least one measurable field",
        `allowed keys: ${OBSERVATION_UPDATE_ALLOWED_KEYS.join(", ")}`,
      ],
      "evidence-add": [
        "stockProfileId",
        "ticker",
        "timeframe",
        "category",
        "value",
        "confidence (0-100)",
        "note?",
      ],
      "plan-outcome": [
        "planId",
        "outcomeKind (unexecuted_plan_loss|missed_opportunity|duplicate_creation)",
        "entryReached",
        "stopReachedBeforeTarget",
        "targetReachedBeforeStop",
        "nonExecutionReason",
        "notes?",
        "evidenceRefs?",
        "repairKind=corrected + repairNote/note (≥8) when superseding a wrong persisted outcome",
      ],
      "thesis-t0-repair": [
        "planId",
        "repairKind (reconstructed|corrected)",
        "note (≥8 chars)",
        "t0 (required when reconstructed)",
        "plannedEntry+stopPrice+targetPrice (required when reconstructed)",
        "evidenceRefs?",
      ],
      "external-position-create": [
        "ticker",
        "shares",
        "averageCost",
        "currentPrice?",
        "valuationSource?",
        "acquisitionSource?",
        "capitalTreatment?",
        "liquidityStatus?",
        "notes?",
      ],
      "external-position-update": [
        "id",
        "currentPrice?",
        "valuationSource?",
        "liquidityStatus?",
        "reviewAt?",
        "notes?",
      ],
      "external-position-reduction": [
        "positionId",
        "reductionId|executionReference",
        "sharesReduced",
        "executionPrice",
        "executedAt?",
        "fees?",
        "notes?",
      ],
      "external-position-settle": ["positionId", "reductionId?", "settledAt?"],
      "external-position-exit-plan-update": [
        "positionId",
        "targetPrice?",
        "targetShares?",
        "defensivePrice?",
        "defensiveAction?",
        "status?",
        "notes?",
      ],
      "capital-configuration-create": [
        "settledCashBase+settledCashAsOf and/or totalEquityBase+totalEquityAsOf",
        "liquidityBuffer?",
        "source?",
        "externalCreditsIncludedInCash?",
      ],
      "capital-configuration-update": ["id", "at least one updatable field"],
      "capital-reservation-create": [
        "planId",
        "requestedCapital",
        "estimatedRisk",
        "ticker?",
        "expiresAt?",
      ],
      "capital-reservation-update": ["id", "at least one updatable field"],
      "capital-reservation-release": ["id", "reason?"],
      "capital-ledger-adjustment": ["idempotencyKey", "amount", "notes?"],
    },
    allowedEnums: {
      "plan-outcome.outcomeKind": [
        "unexecuted_plan_loss",
        "missed_opportunity",
        "duplicate_creation",
      ],
      "external-position.acquisitionSource": [
        "external_program",
        "legacy_holding",
        "transferred_position",
        "manual_external",
        "other",
      ],
      "external-position.status": [
        "open",
        "partially_reduced",
        "closed",
        "archived",
      ],
      "external-position.capitalTreatment": [
        "invested",
        "restricted",
        "pending_release",
        "released",
      ],
      "external-position.liquidityStatus": ["liquid", "restricted", "unknown"],
      "external-position.costBasisMethod": ["average_cost"],
      "external-position.valuationSource": ["manual", "import", "unspecified"],
      "external-position.reduction.settlementStatus": [
        "pending_settlement",
        "settled",
      ],
      "external-position.exitPlan.status": [
        "draft",
        "active",
        "partially_executed",
        "completed",
        "cancelled",
        "expired",
      ],
      "plan-outcome.nonExecutionReason": [
        "order_not_staged",
        "discretionary_skip",
        "operational_unavailable",
        "alert_missed",
        "broker_rejection",
        "insufficient_buying_power",
        "unknown",
        "entry_not_reached",
      ],
      "decision.verdict": ["go", "wait", "probe", "no"],
      "stockThesis.status": [
        "draft",
        "watching",
        "actionable",
        "invalidated",
        "archived",
      ],
      "momentumAssessment.expansionPotential": [
        "high",
        "moderate",
        "low",
        "uncertain",
      ],
      "momentumAssessment.scoutImplication": [
        "normal_entry_standard",
        "require_better_entry",
        "require_momentum_improvement",
        "standby",
      ],
    },
    layerOwnership: APPLY_LAYER_OWNERSHIP,
    stockCaseCreate: {
      allowedProposalKeys: STOCK_CASE_CREATE_ALLOWED_KEYS,
      allowedLevelsKeys: STOCK_CASE_LEVELS_ALLOWED_KEYS,
      allowedRiskRulesKeys: STOCK_CASE_RISK_ALLOWED_KEYS,
      allowedInitialScoutKeys: STOCK_CASE_SCOUT_ALLOWED_KEYS,
      required: [
        "ticker",
        "currentHypothesis",
        "levels",
        "riskRules",
        "initialScout.plannedEntry",
        "initialScout.stopPrice",
        "initialScout.targetPrice",
      ],
      notes: [
        "levels keys ONLY: majorSupport, majorResistance, primaryZone, secondaryZone, targets",
        "Do NOT invent primarySupportZone, probableTarget, extendedTargets, technicalNotes",
        "Structural targets (Stock File levels.targets) ≠ Scout operational targetPrice",
        "Strategy stop (initialScout.stopPrice) ≠ structural invalidation (riskRules.invalidation)",
        "invalidation example: Weekly close below 130 — not 130 alone",
      ],
    },
    examples: {
      "stock-case-create": AI_BLOCK_SAMPLES["stock-case-create"],
      "scout-plan-create": AI_BLOCK_SAMPLES["scout-plan-create"],
      "technical-assessment": AI_BLOCK_SAMPLES["technical-assessment"],
      "decision-update": AI_BLOCK_SAMPLES["decision-update"],
      "file-update": AI_BLOCK_SAMPLES["file-update"],
      "evidence-add": AI_BLOCK_SAMPLES["evidence-add"],
      "trade-update": buildLegacyTradeUpdateExample("H002"),
      "trade-review": AI_BLOCK_SAMPLES["trade-review"],
      "observation-update": AI_BLOCK_SAMPLES["observation-update"],
      "plan-outcome": AI_BLOCK_SAMPLES["plan-outcome"],
      "thesis-t0-repair": AI_BLOCK_SAMPLES["thesis-t0-repair"],
      "external-position-create": AI_BLOCK_SAMPLES["external-position-create"],
      "external-position-update": AI_BLOCK_SAMPLES["external-position-update"],
      "external-position-reduction":
        AI_BLOCK_SAMPLES["external-position-reduction"],
      "external-position-settle": AI_BLOCK_SAMPLES["external-position-settle"],
      "external-position-exit-plan-update":
        AI_BLOCK_SAMPLES["external-position-exit-plan-update"],
      "capital-configuration-create":
        AI_BLOCK_SAMPLES["capital-configuration-create"],
      "capital-configuration-update":
        AI_BLOCK_SAMPLES["capital-configuration-update"],
      "capital-reservation-create":
        AI_BLOCK_SAMPLES["capital-reservation-create"],
      "capital-reservation-update":
        AI_BLOCK_SAMPLES["capital-reservation-update"],
      "capital-reservation-release":
        AI_BLOCK_SAMPLES["capital-reservation-release"],
      "capital-ledger-adjustment":
        AI_BLOCK_SAMPLES["capital-ledger-adjustment"],
    },
  };
}

/** Human-visible correctability section — must appear above CONTRACT JSON. */
export function buildDataCorrectabilityContractText(): string {
  return [
    "=== DATA CORRECTABILITY (MXT 029) — authoritative Apply types ===",
    "Freshness check: schemaVersion MUST be 2026-09-05.mxt-029-correctability.",
    "If that marker is missing, discard this paste — it is STALE vs implementation.",
    "",
    "thesis-t0-repair (acceptedTypes MUST include this string):",
    "  · Use when T0 is Missing (reconstructed) or persisted freeze is wrong (corrected).",
    "  · Required: planId, repairKind (reconstructed|corrected), note (≥8 chars).",
    "  · reconstructed also requires: t0 (ISO), plannedEntry, stopPrice, targetPrice.",
    "  · corrected: patches the Plan-specific freeze; prior body stays in correctionAudit[].",
    "  · recordKind on freeze becomes reconstructed|corrected; prior values remain auditable.",
    "  · NEVER inherit another Plan's freeze via shared stockThesisId / Stock File.",
    "  · Hindsight price/P&L alone is NEVER sufficient evidence.",
    "  · Evaluation/reconstruction analysis does NOT auto-mutate T0 — only this Apply type does.",
    "",
    "plan-outcome supersede (same type plan-outcome — not a new type):",
    "  · After outcome.recordedAt, a DIFFERENT outcomeKind is rejected unless repairKind=corrected.",
    "  · Required for supersede: repairKind=corrected + repairNote or note (≥8) + full event-order fields for the NEW kind.",
    "  · Prior outcome snapshot is appended to plan.outcome.correctionAudit[]; recordKind=corrected.",
    "  · LO/OBS re-sync on Accept. Same-kind re-Accept remains idempotent WITHOUT repairKind.",
    "",
    "Legacy trade dates (existing): trade-update + datesReconstructed + dateCorrectionNote → dateCorrectionAudit[].",
  ].join("\n");
}

export function buildApplySchemaContractText(): string {
  const contract = buildApplySchemaContract();
  return [
    "=== MTA APPLY SCHEMA CONTRACT (schema-first handshake) ===",
    `schemaVersion: ${contract.schemaVersion}`,
    "",
    "WHERE TO COPY THIS",
    "Open Control → Apply, then tap the visible copy row labeled Apply schema contract.",
    "That row sits above the paste box in Apply — it is not under Start Here or Mechanics body.",
    "Write path after JSON: Control → Apply → Validate → Accept (or sidebar Proposals /mxt/inbox).",
    "",
    buildDataCorrectabilityContractText(),
    "",
    "ACCEPTED TYPES (authoritative — thesis-t0-repair MUST appear below)",
    ...contract.acceptedTypes.map((t) => `- ${t}`),
    "",
    "RULES",
    ...contract.rules.map((r) => `- ${r}`),
    "",
    "LAYER OWNERSHIP",
    ...Object.entries(contract.layerOwnership).flatMap(([layer, items]) => [
      `${layer}:`,
      ...items.map((i) => `  - ${i}`),
    ]),
    "",
    "STOCK-CASE-CREATE (hard)",
    `allowed proposal keys: ${contract.stockCaseCreate.allowedProposalKeys.join(", ")}`,
    `allowed levels keys: ${contract.stockCaseCreate.allowedLevelsKeys.join(", ")}`,
    `allowed riskRules keys: ${contract.stockCaseCreate.allowedRiskRulesKeys.join(", ")}`,
    `allowed initialScout keys: ${contract.stockCaseCreate.allowedInitialScoutKeys.join(", ")}`,
    `required: ${contract.stockCaseCreate.required.join(", ")}`,
    ...contract.stockCaseCreate.notes.map((n) => `- ${n}`),
    "",
    "REQUIRED FIELDS (summary)",
    ...Object.entries(contract.requiredFields).map(
      ([type, fields]) => `- ${type}: ${fields.join("; ")}`
    ),
    "",
    buildLegacyTradeCompletionContractText(),
    "",
    buildLegacyDateCorrectionContractText(),
    "",
    buildObservationUpdateContractText(),
    "",
    "Before producing Apply JSON: read this contract. Do not rely on memory or semantic guesses.",
    "Full JSON examples are in this contract (examples.*) and in Mechanics samples when pasted.",
    "",
    "=== CONTRACT JSON ===",
    JSON.stringify(contract, null, 2),
  ].join("\n");
}

const ANALYZE_SCOPED_TYPES = [
  "technical-assessment",
  "decision-update",
  "scout-plan-create",
  "file-update",
  "evidence-add",
  "plan-outcome",
  "thesis-t0-repair",
] as const;

const ANALYZE_SCOPED_RULE_NEEDLES = [
  "SCHEMA-FIRST",
  "Never invent JSON",
  "If that exact copy",
  "Separate analysis",
  "validator error",
  "scout-plan-create",
  "riskRules.invalidation",
  "Do not put Scout capital",
  "Do not put Entry Solver",
  "MTAE presentation",
  "thesis-t0-repair",
  "plan-outcome",
  "observation-update",
  "evidence-add",
  "Human mutations only",
] as const;

/**
 * Scoped Apply contract for Stock File Analyze with AI — one-copy return path.
 * Full Mechanics constitution remains available under Control → Mechanics.
 */
export function buildScopedAnalyzeApplyContractText(): string {
  const contract = buildApplySchemaContract();
  const required = ANALYZE_SCOPED_TYPES.map((type) => {
    const fields = contract.requiredFields[type];
    return fields ? `- ${type}: ${fields.join("; ")}` : null;
  }).filter(Boolean);

  const examples = ANALYZE_SCOPED_TYPES.map((type) => {
    const sample = contract.examples[type];
    if (!sample) return null;
    return [`--- example:${type} ---`, JSON.stringify(sample, null, 2)].join("\n");
  }).filter(Boolean);

  const scopedRules = contract.rules.filter((r) =>
    ANALYZE_SCOPED_RULE_NEEDLES.some((n) => r.includes(n))
  );

  return [
    "=== SCOPED APPLY CONTRACT (Analyze with AI return path) ===",
    "Write path: Control → Apply → Validate → Accept (human gate — no silent persist). Sidebar Proposals (/mxt/inbox) is the same gate.",
    "Do NOT ask the human to copy the full Apply schema from Mechanics — this scoped contract is enough for this ticker loop.",
    "If you need a type outside this list, say so explicitly.",
    "",
    "SUPPORTED TYPES FOR THIS PACKAGE",
    ...ANALYZE_SCOPED_TYPES.map((t) => `- ${t}`),
    "",
    "REQUIRED FIELDS",
    ...required,
    "",
    "RULES (scoped — includes plan-outcome / thesis-t0-repair)",
    ...scopedRules.map((r) => `- ${r}`),
    "",
    "EXAMPLES",
    ...examples,
  ].join("\n");
}
