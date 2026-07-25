/**
 * Apply schema contract — schema-first handshake for AI.
 * Never invent keys: use only types/fields listed here or in accepted samples.
 */
import {
  AI_BLOCK_SAMPLES,
  TECHNICAL_ASSESSMENT_MIN_EXAMPLE,
  type AiBlockType,
} from "./ai-block";
import {
  STOCK_CASE_CREATE_ALLOWED_KEYS,
  STOCK_CASE_LEVELS_ALLOWED_KEYS,
  STOCK_CASE_RISK_ALLOWED_KEYS,
  STOCK_CASE_SCOUT_ALLOWED_KEYS,
} from "./stock-case-schema";
import {
  MTAE_DOMINANT_CONDITIONS,
  MTAE_EXPANSION_POTENTIALS,
  MTAE_EXPANSION_STATES,
  MTAE_MOMENTUM_CURRENT_STATES,
  MTAE_SCOUT_IMPLICATIONS,
} from "./mtae-types";

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

/** Matches runtime validator trend enum in mtae-validate (bullish|neutral|bearish). */
export const MTAE_TREND_VALUES = ["bullish", "neutral", "bearish"] as const;

/** Nested paths required by validateTechnicalAssessmentProposal (export contract). */
export const TECHNICAL_ASSESSMENT_REQUIRED_PATHS = [
  "stockProfileId",
  "ticker",
  "timeframeRoles.strategic_tf",
  "timeframeRoles.opportunity_tf",
  "timeframeRoles.refinement_tf",
  "timeframeRoles.execution_tf",
  "perTimeframe[]",
  "perTimeframe[].timeframe",
  "perTimeframe[].trend",
  "perTimeframe[].structuralInvalidation",
  "perTimeframe[].summary",
  "integrated",
  "integrated.structureSpine",
  "integrated.opportunityNote",
  "integrated.executionContext",
  "technicalSummary",
  "technicalSummary.trend",
  "technicalSummary.structureNote",
  "technicalSummary.structuralInvalidation",
] as const;

export type TechnicalAssessmentContractDetail = {
  required: string[];
  optionalWhenPresent: {
    participationSynthesis: string[];
    momentumAssessment: string[];
  };
  fieldTypes: Record<string, string>;
  shapes: {
    participationSynthesis: string;
    momentumAssessment: string;
  };
  forbiddenInTechnicalSummary: string[];
  notes: string[];
};

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
  technicalAssessment: TechnicalAssessmentContractDetail;
  /** Contract examples — technical-assessment uses the minimum valid example. */
  examples: Partial<Record<AiBlockType, Record<string, unknown>>>;
  /** Rich demo (participation + momentum); not the contract minimum. */
  richExamples?: Partial<Record<"technical-assessment", Record<string, unknown>>>;
};

export function buildApplySchemaContract(): ApplySchemaContract {
  return {
    schemaVersion: "2026-07-25.technical-assessment-export",
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
      "Evidence First labels (Supports / Resistances / Bias / Confidence) are display-only — serialize exact JSON keys.",
      "technical-assessment: use examples[\"technical-assessment\"] (minimum valid). Rich demo is richExamples only.",
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
      "technical-assessment": [...TECHNICAL_ASSESSMENT_REQUIRED_PATHS],
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
      "trend": [...MTAE_TREND_VALUES],
      "momentumAssessment.expansionPotential": [...MTAE_EXPANSION_POTENTIALS],
      "momentumAssessment.currentState": [...MTAE_MOMENTUM_CURRENT_STATES],
      "momentumAssessment.scoutImplication": [...MTAE_SCOUT_IMPLICATIONS],
      "participationSynthesis.dominantCondition": [...MTAE_DOMINANT_CONDITIONS],
      "movementCharacter.state": [...MTAE_EXPANSION_STATES],
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
    technicalAssessment: {
      required: [...TECHNICAL_ASSESSMENT_REQUIRED_PATHS],
      optionalWhenPresent: {
        participationSynthesis: [
          "dominantCondition",
          "buyingEvidence",
          "sellingEvidence",
          "unresolvedSignals",
          "confidence",
        ],
        momentumAssessment: [
          "expansionPotential",
          "currentState",
          "capitalEfficiencyConcern",
          "rationale",
          "scoutImplication",
          "confidence",
        ],
      },
      fieldTypes: {
        "momentumAssessment.capitalEfficiencyConcern": "boolean",
        "momentumAssessment.rationale": "string[] (non-empty)",
        "momentumAssessment.confidence": "number 0-100",
        "participationSynthesis.buyingEvidence": "string[]",
        "participationSynthesis.sellingEvidence": "string[]",
        "participationSynthesis.unresolvedSignals": "string[]",
        "participationSynthesis.confidence": "number 0-100",
      },
      shapes: {
        participationSynthesis:
          "{ dominantCondition, buyingEvidence[], sellingEvidence[], unresolvedSignals[], confidence } — optional; if present dominantCondition required",
        momentumAssessment:
          "{ expansionPotential, currentState, capitalEfficiencyConcern:boolean, rationale:string[] (non-empty), scoutImplication, confidence } — optional; if present all listed fields required",
      },
      forbiddenInTechnicalSummary: [
        "maximumEntry",
        "recommendedEntry",
        "plannedEntry",
        "minimumRR",
        "riskReward",
        "rr",
        "shares",
        "positionSize",
        "scoutVerdict",
        "verdict",
        "whalesAreBuying",
        "whalesBuying",
      ],
      notes: [
        "Evidence First presentation order is display-only — serialize exact JSON keys above.",
        "movementCharacter.state uses MTAE_EXPANSION_STATES — NOT the same enum as momentumAssessment.currentState (MTAE_MOMENTUM_CURRENT_STATES).",
        "Omit momentumAssessment / participationSynthesis when not assessed — never invent false evidence.",
        "examples[\"technical-assessment\"] is the minimum valid example. richExamples[\"technical-assessment\"] is the optional rich demo.",
      ],
    },
    examples: {
      "stock-case-create": AI_BLOCK_SAMPLES["stock-case-create"],
      "scout-plan-create": AI_BLOCK_SAMPLES["scout-plan-create"],
      "technical-assessment": TECHNICAL_ASSESSMENT_MIN_EXAMPLE,
      "decision-update": AI_BLOCK_SAMPLES["decision-update"],
    },
    richExamples: {
      "technical-assessment": AI_BLOCK_SAMPLES["technical-assessment"],
    },
  };
}

/** Compact TECHNICAL-ASSESSMENT section for Train AI text + MTAE snapshot. */
export function buildTechnicalAssessmentContractSection(): string {
  const contract = buildApplySchemaContract();
  const ta = contract.technicalAssessment;
  return [
    "=== TECHNICAL-ASSESSMENT (hard) ===",
    "Minimum valid example: examples[\"technical-assessment\"] (also TECHNICAL_ASSESSMENT_MIN_EXAMPLE).",
    "Rich demo (optional): richExamples[\"technical-assessment\"] — not required for Apply.",
    "",
    "REQUIRED nested paths:",
    ...ta.required.map((p) => `- ${p}`),
    "",
    "ENUMS (from lib/mtae-types consts):",
    `- trend: ${contract.allowedEnums["trend"].join(" | ")}`,
    `- momentumAssessment.expansionPotential: ${contract.allowedEnums["momentumAssessment.expansionPotential"].join(" | ")}`,
    `- momentumAssessment.currentState: ${contract.allowedEnums["momentumAssessment.currentState"].join(" | ")}`,
    `- momentumAssessment.scoutImplication: ${contract.allowedEnums["momentumAssessment.scoutImplication"].join(" | ")}`,
    `- participationSynthesis.dominantCondition: ${contract.allowedEnums["participationSynthesis.dominantCondition"].join(" | ")}`,
    `- movementCharacter.state (optional participation; DISTINCT from currentState): ${contract.allowedEnums["movementCharacter.state"].join(" | ")}`,
    "",
    "FIELD TYPES:",
    ...Object.entries(ta.fieldTypes).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "OPTIONAL SHAPES (when present):",
    `- participationSynthesis: ${ta.shapes.participationSynthesis}`,
    `- momentumAssessment: ${ta.shapes.momentumAssessment}`,
    "",
    "FORBIDDEN in technicalSummary:",
    ta.forbiddenInTechnicalSummary.join(", "),
    "",
    ...ta.notes.map((n) => `- ${n}`),
    "",
    "=== MINIMUM VALID EXAMPLE JSON ===",
    JSON.stringify(TECHNICAL_ASSESSMENT_MIN_EXAMPLE, null, 2),
  ].join("\n");
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
    buildTechnicalAssessmentContractSection(),
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
