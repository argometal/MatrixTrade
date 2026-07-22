/** Learning Outcome — Scout/Trade experiment result. See md/matrix/maf-matrix-attribution-framework.md */

export const LEARNING_OUTCOME_KINDS = [
  "executed_win",
  "executed_loss",
  "missed_opportunity",
  "cancelled",
  "expired",
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
  lifecycleStatus: LearningOutcomeLifecycle;
  notes?: string;
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
};
