export type TradeEvaluationStatus = "pending" | "observing" | "concluded";

export type ThesisOutcome = "validated" | "invalidated" | "inconclusive";
export type TimingOutcome = "on_time" | "early" | "late" | "inconclusive";
export type ExecutionOutcome = "clean" | "acceptable" | "poor" | "inconclusive";

export type TradeExitReason =
  | "target"
  | "stop"
  | "manual"
  | "time"
  | "discipline"
  | "other";

export const DEFAULT_EXPECTED_HORIZON_DAYS = 90;
export const DEFAULT_MAXIMUM_OBSERVATION_DAYS = 120;

export interface TradeEvaluation {
  id: string;
  tradeId: string;
  planId?: string;
  expectedHorizonDays: number;
  observationEndsAt: string;
  status: TradeEvaluationStatus;
  startedAt: string;
  concludedAt?: string;
  thesisOutcome?: ThesisOutcome;
  timingOutcome?: TimingOutcome;
  executionOutcome?: ExecutionOutcome;
  finalLesson?: string;
}

export interface ConcludeEvaluationInput {
  thesisOutcome: ThesisOutcome;
  timingOutcome?: TimingOutcome;
  executionOutcome?: ExecutionOutcome;
  finalLesson?: string;
}

export const THESIS_OUTCOME_LABELS: Record<ThesisOutcome, string> = {
  validated: "Validated",
  invalidated: "Invalidated",
  inconclusive: "Inconclusive",
};

export const TIMING_OUTCOME_LABELS: Record<TimingOutcome, string> = {
  on_time: "On time",
  early: "Early",
  late: "Late",
  inconclusive: "Inconclusive",
};

export const EXECUTION_OUTCOME_LABELS: Record<ExecutionOutcome, string> = {
  clean: "Clean",
  acceptable: "Acceptable",
  poor: "Poor",
  inconclusive: "Inconclusive",
};

export const EVALUATION_STATUS_LABELS: Record<TradeEvaluationStatus, string> = {
  pending: "Pending",
  observing: "Observing",
  concluded: "Concluded",
};
