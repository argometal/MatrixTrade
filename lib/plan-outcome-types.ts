/**
 * Plan Outcome + Unexecuted Plan Loss (CURSOR-MTA-PLAN-OUTCOME-UPL-25-29).
 * Scout outcome ≠ realized account P/L. MAF remains a separate attribution layer.
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

/** Canonical Apply outcome kinds for Scout closure without a Trade. */
export const PLAN_OUTCOME_KINDS = [
  "unexecuted_plan_loss",
  "duplicate_creation",
] as const;

export type PlanOutcomeKind = (typeof PLAN_OUTCOME_KINDS)[number];

export const NON_EXECUTION_REASONS = [
  "order_not_staged",
  "discretionary_skip",
  "operational_unavailable",
  "alert_missed",
  "broker_rejection",
  "insufficient_buying_power",
  "unknown",
] as const;

export type NonExecutionReason = (typeof NON_EXECUTION_REASONS)[number];

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
  status?: PlanOutcomeStatus;
  /** Canonical Scout outcome kind when recorded via UPL Apply. */
  outcomeKind?: PlanOutcomeKind;
  tradeExecuted: boolean;
  entryTriggered: boolean | null;
  stopTriggered: boolean | null;
  targetTriggered: boolean | null;
  /** Aliases mirrored for Learning Outcome / UPL contract. */
  entryReached?: boolean | null;
  stopReachedBeforeTarget?: boolean | null;
  targetReachedBeforeStop?: boolean | null;
  nonExecutionReason?: NonExecutionReason;
  theoreticalResultR: number | null;
  realizedResultR: number;
  realizedPnL?: number;
  counterfactualDollarResult?: number | null;
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

/** Normalized proposal after validation (server-derived R already applied for UPL). */
export type PlanOutcomeProposalInput = {
  planId: string;
  status: PlanOutcomeStatus;
  outcomeKind?: PlanOutcomeKind;
  tradeExecuted: boolean;
  entryTriggered: boolean | null;
  stopTriggered: boolean | null;
  targetTriggered: boolean | null;
  entryReached?: boolean | null;
  stopReachedBeforeTarget?: boolean | null;
  targetReachedBeforeStop?: boolean | null;
  nonExecutionReason?: NonExecutionReason;
  theoreticalResultR: number | null;
  realizedResultR: number;
  realizedPnL?: number;
  /** Set at persist when authorizedRiskAmount available. */
  counterfactualDollarResult?: number | null;
  outcomeSource: PlanOutcomeSource;
  evidenceStatus: PlanOutcomeEvidenceStatus;
  notes?: string;
  evidenceRefs?: string[];
  createdBy?: string;
  reason?: string;
  strategyStillValid?: boolean;
  externalFactors?: string[];
  lesson?: string;
  /** True when proposal used UPL Apply field names. */
  uplContract?: boolean;
};
