/** Scout plan-outcome Apply contract (Prompt ID 25-29). */

export const PLAN_OUTCOME_KINDS = [
  "missed_opportunity",
  "unexecuted_plan_loss",
  "cancelled",
  "expired",
  "duplicate_creation",
] as const;

export type PlanOutcomeKind = (typeof PLAN_OUTCOME_KINDS)[number];

export const PLAN_NON_EXECUTION_REASONS = [
  "monitoring_failure",
  "manual_skip",
  "capital_unavailable",
  "technical_failure",
  "duplicate_creation",
  "other",
] as const;

export type PlanNonExecutionReason = (typeof PLAN_NON_EXECUTION_REASONS)[number];

export const PLAN_OUTCOME_PROPOSAL_ALLOWED_KEYS = [
  "planId",
  "outcome",
  "entryReached",
  "stopReachedBeforeTarget",
  "targetReachedBeforeStop",
  "nonExecutionReason",
  "notes",
  "canonicalPlanId",
  "strategyStillValid",
  "counterfactualR",
] as const;

export type PlanOutcomeProposal = {
  planId: string;
  outcome: PlanOutcomeKind;
  entryReached?: boolean;
  stopReachedBeforeTarget?: boolean;
  targetReachedBeforeStop?: boolean;
  nonExecutionReason?: PlanNonExecutionReason;
  notes?: string;
  canonicalPlanId?: string;
  strategyStillValid?: boolean;
};

export function isPlanOutcomeKind(value: unknown): value is PlanOutcomeKind {
  return (
    typeof value === "string" &&
    (PLAN_OUTCOME_KINDS as readonly string[]).includes(value)
  );
}

export function isPlanNonExecutionReason(
  value: unknown
): value is PlanNonExecutionReason {
  return (
    typeof value === "string" &&
    (PLAN_NON_EXECUTION_REASONS as readonly string[]).includes(value)
  );
}
