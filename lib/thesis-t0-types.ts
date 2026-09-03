/**
 * Thesis T0 freeze + finite evaluation horizon (Prompt #8).
 * Analytical ThesisEpisode — no separate episode table.
 * Compact immutable freeze at first committed Scout decision.
 */

import type { ConfirmationCost } from "./asymmetry-types";
import type {
  DecisionVerdict,
  ExecutionRisk,
  PlanningRisk,
  ScoutDecisionSource,
} from "./scout-decision-types";
import type { LayeredEntryPlan } from "./layered-entry-types";
import type { StockThesisLevels, StockThesisRiskRules } from "./stock-thesis-types";

/** Existing playbook/trade-evaluation default (~1 quarter). */
export { DEFAULT_EXPECTED_HORIZON_DAYS as DEFAULT_THESIS_HORIZON_DAYS } from "./trade-evaluation-types";

export type ThesisT0Confidence = "verified" | "partial" | "unavailable";

export type ThesisEpisodeStatus =
  | "open"
  | "closed_confirmed"
  | "closed_partial"
  | "closed_invalidated"
  | "expired_inconclusive";

/** Compact Stock File / thesis context as-of T0 (not a full Stock File copy). */
export type ThesisT0StockContext = {
  stockThesisId: string;
  stockThesisVersion: number | null;
  thesis: string | null;
  currentHypothesis: string | null;
  levels: StockThesisLevels | null;
  riskRules: StockThesisRiskRules | null;
};

export type ThesisT0DecisionSlice = {
  decisionId: string;
  decidedAt: string;
  verdict: DecisionVerdict;
  reasoning: string | null;
  challenges: string[];
  decidedBy: ScoutDecisionSource | null;
  /** Criteria fields from ScoutDecision — frozen when present at commit. */
  decisionConfidence?: number | null;
  opportunityQuality?: number | null;
  thesisQuality?: number | null;
  planningRisk?: PlanningRisk | null;
  executionRisk?: ExecutionRisk | null;
  locationEvidence?: string | null;
  confirmationEvidence?: string | null;
  confirmationCost?: ConfirmationCost | null;
};

export type ThesisT0PlanGeometry = {
  planId: string;
  plannedEntry: number | null;
  /** Immutable original executable at T0 (P10). */
  originalEntry?: number | null;
  participationBlocker?: string | null;
  reviseIf?: string[] | null;
  stopPrice: number | null;
  targetPrice: number | null;
  plannedRR: number | null;
  layeredEntry: LayeredEntryPlan | null;
  executionInstruction: string | null;
  validFrom: string | null;
  /** Highest limit / no-chase proxy when layered; not a separate persisted plan field. */
  maximumEntryProxy: number | null;
  /** Contemporaneous playbook linkage at T0 (optional). */
  playbookId?: string | null;
};

/**
 * Immutable T0 freeze for one thesis evaluation episode.
 * Keyed by freeze id; open episode uniqueness is (stockThesisId) while status=open.
 */
export type ThesisT0Freeze = {
  id: string;
  stockThesisId: string;
  /** ISO T0 — first committed ScoutDecision.decidedAt (or legacy fallback). */
  t0: string;
  /** ISO evaluation horizon end (finite). */
  evaluationHorizonEndsAt: string;
  /** Days used to compute horizon (default or override). */
  evaluationHorizonDays: number;
  evaluationHorizonOverride: boolean;
  beliefFingerprint: string | null;
  planIds: string[];
  stock: ThesisT0StockContext;
  decision: ThesisT0DecisionSlice | null;
  plan: ThesisT0PlanGeometry;
  confidence: ThesisT0Confidence;
  status: ThesisEpisodeStatus;
  /** ISO T1 when closed/expired; null while open. */
  t1: string | null;
  createdAt: string;
  /** Never mutate freeze payload after create — only status/t1/planIds append may update. */
  updatedAt: string;
};
