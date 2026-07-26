/** Learning Outcome — Scout/Trade experiment result. See md/matrix/maf-matrix-attribution-framework.md */

export const LEARNING_OUTCOME_KINDS = [
  "executed_win",
  "executed_loss",
  "missed_opportunity",
  "cancelled",
  "expired",
  /** Entry triggered, stop before target, no fill — counterfactual loss (≠ missed_opportunity). */
  "unexecuted_plan_loss",
  /** Duplicate scout window excluded from denominators. */
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
  /** Realized R (0 when no trade). */
  realizedR?: number;
  /** Counterfactual / theoretical R from plan outcome evidence. */
  counterfactualR?: number;
  /** Realized account P/L (0 when no trade). */
  realizedPnL?: number;
  /** Dollar counterfactual — only when authorizedRiskAmount persisted; else null. */
  counterfactualDollarResult?: number | null;
  entryReached?: boolean;
  stopReachedBeforeTarget?: boolean;
  targetReachedBeforeStop?: boolean;
  nonExecutionReason?: string;
  excludedFromMetrics?: boolean;
  lifecycleStatus: LearningOutcomeLifecycle;
  /** Explicit null clears notes (DB null). undefined preserves existing on merge. */
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  source: LearningOutcomeSource;
};

export const LEARNING_OUTCOME_KIND_LABELS: Record<LearningOutcomeKind, string> = {
  executed_win: "Executed win",
  executed_loss: "Executed loss",
  missed_opportunity: "Missed opportunity",
  cancelled: "Cancelled",
  expired: "Expired",
  unexecuted_plan_loss: "Unexecuted Plan Loss",
  duplicate_creation: "Duplicate Creation",
};

/** Scout LO kinds that count toward evaluatedScoutCount (when not excluded). */
export const SCOUT_EVALUATED_LO_KINDS: ReadonlySet<LearningOutcomeKind> = new Set([
  "unexecuted_plan_loss",
  "missed_opportunity",
  "cancelled",
  "expired",
]);
