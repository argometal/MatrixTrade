/**
 * Prompt #10 — Edge Decomposition Engine types.
 * Measurement substrate only — no scores, attribution, or Cross-Case inference.
 */

import type {
  CaseIdentity,
  CaseTemporalIntegrity,
  ThesisCase,
} from "./thesis-case-types";
import type { DecisionVerdict } from "./scout-decision-types";
import type { LayeredEntryPlan } from "./layered-entry-types";
import type { StockThesisLevels, StockThesisRiskRules } from "./stock-thesis-types";

/** Explicit non-inference states for missing evidence. */
export type EvidenceAvailability =
  | "available"
  | "partial"
  | "unavailable"
  | "unknown";

/**
 * Thesis ↔ subsequent reality (descriptive only — not a quality score).
 * unknown = insufficient reality evidence to relate.
 */
export type ThesisRealityRelationship =
  | "consistent"
  | "inconsistent"
  | "insufficient_to_evaluate"
  | "unknown";

export type EdgeThesisLayer = {
  evidenceAvailable: EvidenceAvailability;
  variables: {
    thesisText: string | null;
    currentHypothesis: string | null;
    levels: StockThesisLevels | null;
    riskRules: StockThesisRiskRules | null;
    stockThesisVersion: number | null;
    evaluationHorizonDays: number | null;
    evaluationHorizonEndsAt: string | null;
  };
  /** Descriptive relationship only when Reveal market/outcome evidence exists. */
  realityRelationship: ThesisRealityRelationship;
};

export type EdgeControllablePlan = {
  planId: string | null;
  plannedEntry: number | null;
  maximumEntryProxy: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  plannedRR: number | null;
  layeredEntry: LayeredEntryPlan | null;
  executionInstruction: string | null;
};

export type EdgeControllableDecision = {
  decisionId: string | null;
  decidedAt: string | null;
  verdict: DecisionVerdict | null;
  reasoning: string | null;
  challenges: string[];
};

export type EdgeControllableExecution = {
  kind: "trade" | "no_trade" | "unknown";
  tradeId: string | null;
  disposition: string | null;
  actualEntry: number | null;
  actualExit: number | null;
  actualStop: number | null;
  actualTarget: number | null;
};

export type EdgeControllableRisk = {
  plannedStop: number | null;
  plannedTarget: number | null;
  plannedRR: number | null;
  invalidationText: string | null;
  minimumRR: number | null;
};

export type EdgeControllableLayer = {
  evidenceAvailable: EvidenceAvailability;
  plan: EdgeControllablePlan;
  decision: EdgeControllableDecision;
  execution: EdgeControllableExecution;
  risk: EdgeControllableRisk;
};

export type EdgeExternalVariables = {
  observationCount: number;
  maxPrice: number | null;
  minPrice: number | null;
  targetReached: boolean | null;
  thesisInvalidated: boolean | null;
  firstTerminalEvent: string | null;
  horizonExpired: boolean | null;
  /** Reserved — no market-data ingestion in #10. */
  volatility: null;
  pullbackDepth: null;
  timeToExpectedMove: null;
  mfe: number | null;
  mae: number | null;
  gapBehavior: null;
  marketRegime: null;
};

export type EdgeExternalConditionsLayer = {
  evidenceAvailable: EvidenceAvailability;
  variables: EdgeExternalVariables;
};

export type EdgeOutcomeVariables = {
  executionKind: "trade" | "no_trade" | "unknown";
  planOutcomePresent: boolean;
  planOutcomeStatus: string | null;
  planOutcomeKind: string | null;
  tradeExecuted: boolean | null;
  realizedResultR: number | null;
  realizedPnL: number | null;
  theoreticalResultR: number | null;
  nonExecutionReason: string | null;
  episodeStatus: string | null;
  t1: string | null;
  horizonExpired: boolean | null;
  learningOutcomeKind: string | null;
};

export type EdgeOutcomeLayer = {
  evidenceAvailable: EvidenceAvailability;
  variables: EdgeOutcomeVariables;
};

export type EdgeUncertaintyLayer = {
  unresolved: boolean;
  reasons: string[];
};

/**
 * Analytical ordering reminder — not an automatic pipeline score.
 * CONTROL → ADAPT → ACCEPT UNCERTAINTY
 */
export type EdgeAnalyticalOrdering = {
  controlFirst: true;
  thenAdapt: true;
  thenAcceptUncertainty: true;
  note: string;
};

/** Deterministic, comparable Case decomposition for future Cross-Case use. */
export type EdgeDecomposition = {
  caseIdentity: CaseIdentity;
  integrity: CaseTemporalIntegrity;
  thesis: EdgeThesisLayer;
  controllable: EdgeControllableLayer;
  externalConditions: EdgeExternalConditionsLayer;
  outcome: EdgeOutcomeLayer;
  uncertainty: EdgeUncertaintyLayer;
  analyticalOrdering: EdgeAnalyticalOrdering;
  /** Source Case snapshot ref — for tests/debug; no mutation. */
  sourceAnchorPlanId: string;
};

export type DecomposeEdgeInput = ThesisCase;
