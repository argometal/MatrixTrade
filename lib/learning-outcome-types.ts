/** Learning Outcome — Scout/Trade experiment result. See md/matrix/maf-matrix-attribution-framework.md */

export const LEARNING_OUTCOME_KINDS = [
  "executed_win",
  "executed_loss",
  "missed_opportunity",
  "cancelled",
  "expired",
  "unexecuted_plan_loss",
  "duplicate_creation",
] as const;

export type LearningOutcomeKind = (typeof LEARNING_OUTCOME_KINDS)[number];

export const LEARNING_OUTCOME_LIFECYCLES = [
  "open",
  "observing",
  "ready_for_attribution",
  "attributed",
  "concluded",
] as const;

export type LearningOutcomeLifecycle = (typeof LEARNING_OUTCOME_LIFECYCLES)[number];

export type LearningOutcomeSource =
  | "trade_close"
  | "plan_outcome"
  | "manual"
  | "ai";

export type LearningOutcome = {
  id: string;
  kind: LearningOutcomeKind;
  ticker: string;
  stockThesisId?: string;
  planId?: string;
  tradeId?: string;
  playbookId?: string;
  observationId?: string;
  mafExperimentId?: string;
  rAchieved?: number;
  /** Realized R from an executed Trade — 0 when no fill. */
  realizedR?: number;
  /** Counterfactual Scout R (server-derived) — never invent. */
  counterfactualR?: number;
  /** Realized P/L from an executed Trade — 0 when no fill. */
  realizedPnL?: number;
  /** Counterfactual $ only when authorizedRiskAmount is persisted on the plan. */
  counterfactualDollarResult?: number;
  entryReached?: boolean;
  stopReachedBeforeTarget?: boolean;
  targetReachedBeforeStop?: boolean;
  nonExecutionReason?: string;
  /** true for duplicate_creation — excluded from all statistical denominators. */
  excludedFromMetrics?: boolean;
  canonicalPlanId?: string;
  lifecycleStatus: LearningOutcomeLifecycle;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  source: LearningOutcomeSource;
};

/** Compat defaults for older LO rows. */
export function learningOutcomeExcludedFromMetrics(lo: LearningOutcome): boolean {
  if (lo.kind === "duplicate_creation") return true;
  return lo.excludedFromMetrics ?? false;
}

export function learningOutcomeRealizedR(lo: LearningOutcome): number {
  if (lo.realizedR !== undefined && Number.isFinite(lo.realizedR)) return lo.realizedR;
  if (lo.kind === "executed_win" || lo.kind === "executed_loss") {
    return lo.rAchieved ?? 0;
  }
  return 0;
}

export function learningOutcomeRealizedPnL(lo: LearningOutcome): number {
  return lo.realizedPnL ?? 0;
}

export const LEARNING_OUTCOME_KIND_LABELS: Record<LearningOutcomeKind, string> = {
  executed_win: "Executed win",
  executed_loss: "Executed loss",
  missed_opportunity: "Missed opportunity",
  cancelled: "Cancelled",
  expired: "Expired",
  unexecuted_plan_loss: "Unexecuted Plan Loss",
  duplicate_creation: "Duplicate Creation",
};
