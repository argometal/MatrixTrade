/**
 * Plan Outcome + counterfactual learning layer (CURSOR-MTA-PLAN-OUTCOME-LEARNING-001).
 * Plan outcome ≠ realized account P/L. MAF remains a separate attribution layer.
 */

export const PLAN_OUTCOME_STATUSES = [
  "entry_not_triggered",
  "theoretical_win",
  "theoretical_loss",
  "theoretical_breakeven",
  "invalidated_before_entry",
  "inconclusive",
] as const;

export type PlanOutcomeStatus = (typeof PLAN_OUTCOME_STATUSES)[number];

export const PLAN_OUTCOME_SOURCES = [
  "trade",
  "counterfactual_observation",
  "manual_review",
] as const;

export type PlanOutcomeSource = (typeof PLAN_OUTCOME_SOURCES)[number];

export const PLAN_OUTCOME_EVIDENCE_STATUSES = [
  "verified",
  "partial",
  "inconclusive",
] as const;

export type PlanOutcomeEvidenceStatus =
  (typeof PLAN_OUTCOME_EVIDENCE_STATUSES)[number];

export const EXECUTION_READINESS_STATES = [
  "draft",
  "approved",
  "armed",
  "confirmation_required",
  "submitted",
  "cancelled",
  "expired",
] as const;

export type ExecutionReadinessState =
  (typeof EXECUTION_READINESS_STATES)[number];

/** Architecture flag — never auto-submit broker orders. */
export const AUTOMATIC_EXECUTION_ENABLED = false;

export const PLAN_COUNTERFACTUAL_OBSERVATION_KIND =
  "plan_counterfactual_observation" as const;

export const TRIGGERED_UNEXECUTED_PLAN_UNIT = "triggered_unexecuted_plan" as const;

export type PlanOutcomeRecord = {
  planId: string;
  recordedAt: string;
  status: PlanOutcomeStatus;
  tradeExecuted: boolean;
  entryTriggered: boolean | null;
  stopTriggered: boolean | null;
  targetTriggered: boolean | null;
  theoreticalResultR: number | null;
  realizedResultR: number;
  outcomeSource: PlanOutcomeSource;
  evidenceStatus: PlanOutcomeEvidenceStatus;
  notes?: string;
  evidenceRefs: string[];
  createdBy?: string;
  updatedAt: string;
  /** Legacy UI fields (optional, preserved). */
  reason?: string;
  strategyStillValid?: boolean;
  externalFactors?: string[];
  lesson?: string;
};

export type PlanOutcomeProposalInput = {
  planId: string;
  status: PlanOutcomeStatus;
  tradeExecuted: boolean;
  entryTriggered: boolean | null;
  stopTriggered: boolean | null;
  targetTriggered: boolean | null;
  theoreticalResultR: number | null;
  realizedResultR: number;
  outcomeSource: PlanOutcomeSource;
  evidenceStatus: PlanOutcomeEvidenceStatus;
  notes?: string;
  evidenceRefs?: string[];
  createdBy?: string;
  /** Optional legacy-compatible fields. */
  reason?: string;
  strategyStillValid?: boolean;
  externalFactors?: string[];
  lesson?: string;
};
