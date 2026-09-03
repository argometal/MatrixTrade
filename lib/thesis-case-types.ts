/**
 * Thesis Case read projection.
 * Case is NOT a source of truth — derived from T0 freeze + canonical records.
 *
 * Product IA (MTA 012): T0 / Original evidence · Reality · Outcome · Evaluation
 * Blind/Reveal ceremony is DEPRECATED — do not reintroduce hide/reveal gates.
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
  t0VerifiedForReconstruction: boolean;
};

export type CaseT0PreEvent = {
  thesis: string | null;
  currentHypothesis: string | null;
  levels: StockThesisLevels | null;
  riskRules: StockThesisRiskRules | null;
  stockThesisVersion: number | null;
};

export type CaseT0Plan = {
  planId: string;
  plannedEntry: number | null;
  /** P10 — optional on legacy fixtures / pre-capture Cases. */
  originalEntry?: number | null;
  participationBlocker?: string | null;
  reviseIf?: string[] | null;
  maximumEntryProxy: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  plannedRR: number | null;
  layeredEntry: LayeredEntryPlan | null;
  executionInstruction: string | null;
};

export type CaseT0Decision = {
  decisionId: string;
  decidedAt: string;
  verdict: DecisionVerdict;
  reasoning: string | null;
  challenges: string[];
  decidedBy?: ScoutDecision["decidedBy"] | null;
  decisionConfidence?: number | null;
  opportunityQuality?: number | null;
  thesisQuality?: number | null;
  planningRisk?: ScoutDecision["planningRisk"] | null;
  executionRisk?: ScoutDecision["executionRisk"] | null;
  locationEvidence?: string | null;
  confirmationEvidence?: string | null;
  confirmationCost?: import("./asymmetry-types").ConfirmationCost | null;
};

/**
 * T0 / original evidence — ONLY decision-time information from the immutable freeze.
 * Never populated from live Stock File.
 */
export type CaseT0Evidence = {
  available: boolean;
  integrity: ThesisT0Confidence;
  reason?: string;
  preEvent: CaseT0PreEvent | null;
  plan: CaseT0Plan | null;
  decision: CaseT0Decision | null;
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

/** Post-decision evidence: execution, reality summaries, outcomes, learning links. */
export type CasePostDecision = {
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
  t0Evidence: CaseT0Evidence;
  postDecision: CasePostDecision;
};
