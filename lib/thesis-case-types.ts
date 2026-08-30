/**
 * Prompt #9 — Thesis Case read projection (Blind / Reveal).
 * Case is NOT a source of truth — derived from T0 freeze + canonical records.
 */

import type { DecisionVerdict, ScoutDecision } from "./scout-decision-types";
import type { LayeredEntryPlan } from "./layered-entry-types";
import type { PlanOutcome } from "./plan-types";
import type { ObservationRecord } from "./observation-types";
import type { LearningOutcome } from "./learning-outcome-types";
import type { MafExperiment } from "./maf-types";
import type {
  ThesisEpisodeStatus,
  ThesisT0Confidence,
  ThesisT0Freeze,
} from "./thesis-t0-types";
import type { StockThesisLevels, StockThesisRiskRules } from "./stock-thesis-types";

export type CaseT0Source =
  | "scout_decision"
  | "plan_valid_from"
  | "plan_created_at"
  | "none";

export type CaseIdentity = {
  anchorPlanId: string;
  stockThesisId: string | null;
  ticker: string;
  relatedPlanIds: string[];
  t0: string | null;
  t1: string | null;
  evaluationHorizonDays: number | null;
  evaluationHorizonEndsAt: string | null;
  episodeStatus: ThesisEpisodeStatus | "no_freeze";
  confidence: ThesisT0Confidence;
};

export type CaseTemporalIntegrity = {
  t0Source: CaseT0Source;
  t0: string | null;
  freezeId: string | null;
  freezeAvailable: boolean;
  confidence: ThesisT0Confidence;
  /** True only when confidence === verified and freeze has decision + stock snapshot. */
  blindSafeForStrictReview: boolean;
};

export type CaseBlindPreEvent = {
  thesis: string | null;
  currentHypothesis: string | null;
  levels: StockThesisLevels | null;
  riskRules: StockThesisRiskRules | null;
  stockThesisVersion: number | null;
};

export type CaseBlindPlan = {
  planId: string;
  plannedEntry: number | null;
  maximumEntryProxy: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  plannedRR: number | null;
  layeredEntry: LayeredEntryPlan | null;
  executionInstruction: string | null;
};

export type CaseBlindDecision = {
  decisionId: string;
  decidedAt: string;
  verdict: DecisionVerdict;
  reasoning: string | null;
  challenges: string[];
};

/**
 * Blind packet — ONLY T0-knowable information from the immutable freeze.
 * Never populated from live Stock File.
 */
export type CaseBlindPacket = {
  available: boolean;
  integrity: ThesisT0Confidence;
  reason?: string;
  preEvent: CaseBlindPreEvent | null;
  plan: CaseBlindPlan | null;
  decision: CaseBlindDecision | null;
};

export type CaseExecutionTrade = {
  kind: "trade";
  tradeId: string;
  status: string;
  entry: number | null;
  exit: number | null;
  stop: number | null;
  target: number | null;
  closedAt: string | null;
  exitReason: string | null;
  riskRewardActual: number | null;
  /** Present only when canonical trade data supports it. */
  realizedPnLHint: number | null;
};

export type CaseExecutionNoTrade = {
  kind: "no_trade";
  disposition: string | null;
  scoutVerdict: DecisionVerdict | null;
  planStatus: string | null;
};

export type CaseMarketReality = {
  completeness: "available" | "incomplete" | "unavailable";
  observations: Array<{
    id: string;
    startedAt: string;
    endsAt: string;
    status: string;
    maxPrice: number | null;
    minPrice: number | null;
    targetReached: boolean | null;
    thesisInvalidated: boolean | null;
    firstTerminalEvent: string | null;
    observedAfterT0: boolean;
  }>;
  horizonExpired: boolean;
};

export type CaseOutcomeSlice = {
  planOutcome: PlanOutcome | null;
  tradeReviewedAt: string | null;
  tradeLesson: string | null;
};

export type CaseLearningEvidence = {
  learningOutcome: LearningOutcome | null;
  observations: ObservationRecord[];
  mafExperiment: MafExperiment | null;
  laterDecisions: ScoutDecision[];
};

export type CaseRevealPacket = {
  execution: CaseExecutionTrade | CaseExecutionNoTrade;
  marketReality: CaseMarketReality;
  outcome: CaseOutcomeSlice;
  learningEvidence: CaseLearningEvidence;
};

/** Deterministic read projection — no persistence. */
export type ThesisCase = {
  identity: CaseIdentity;
  temporalIntegrity: CaseTemporalIntegrity;
  freeze: ThesisT0Freeze | null;
  blind: CaseBlindPacket;
  reveal: CaseRevealPacket;
};
