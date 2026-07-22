/**
 * Apply schema contract — schema-first handshake for AI.
 * Never invent keys: use only types/fields listed here or in accepted samples.
 */
import { AI_BLOCK_SAMPLES, type AiBlockType } from "./ai-block";
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
    schemaVersion: "2026-07-22.schema-discipline",
    product: "MTA",
    rules: [
      "SCHEMA-FIRST: before any Apply JSON, read this contract (or an accepted export example).",
      "Never invent JSON keys, enum values, nesting, or field formats.",
      "If the exact contract is unavailable, stop and request schema or a valid example — do not guess.",
      "Separate analysis (conceptual levels) from serialization (exact MTA keys).",
      "A validator error on one field does not validate the rest of the object.",
      "stock-case-create REQUIRES initialScout.plannedEntry + stopPrice + targetPrice.",
      "scout-plan-create REQUIRES plannedEntry + stopPrice + targetPrice.",
      "riskRules.invalidation must be an observable event string, not a bare price.",
      "Do not put Scout capital fields into technical-assessment.",
      "Do not put Entry Solver / R:R / shares into MTAE.",
      "MTAE presentation is evidence-first (Analysis Mode); explain only on request.",
    ],
    acceptedTypes: Object.keys(AI_BLOCK_SAMPLES) as AiBlockType[],
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
      "decision-update": ["planId", "decision mode OR tactical fields"],
      "technical-assessment": [
        "stockProfileId",
        "ticker",
        "timeframeRoles",
        "perTimeframe[]",
        "integrated",
        "technicalSummary",
      ],
      "trade-proposal": ["id", "ticker", "entry", "stop", "shares"],
    },
    allowedEnums: {
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
    },
  };
}

export function buildApplySchemaContractText(): string {
  const contract = buildApplySchemaContract();
  return [
    "=== MTA APPLY SCHEMA CONTRACT (schema-first handshake) ===",
    `schemaVersion: ${contract.schemaVersion}`,
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
    "Before producing Apply JSON: read this contract. Do not rely on memory or semantic guesses.",
    "Full JSON examples are available via Control → Train AI → Schema contract / sample blocks.",
    "",
    "=== CONTRACT JSON ===",
    JSON.stringify(contract, null, 2),
  ].join("\n");
}
