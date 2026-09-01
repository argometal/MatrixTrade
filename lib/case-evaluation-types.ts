/**
 * Case Evaluation lanes (MXT 016-P04).
 * Descriptive only — no global score. Outcome never drives Decision Quality.
 */

export type DecisionQuality =
  | "supported"
  | "weakly_supported"
  | "not_supported"
  | "INDETERMINATE";

export type ExecutionQuality =
  | "respected"
  | "violated"
  | "not_applicable"
  | "INDETERMINATE";

export type RealityRelationshipLane =
  | "invalidated"
  | "condition_met"
  | "condition_not_met"
  | "mixed"
  | "INDETERMINATE";

/** Traceable chain: T0 evidence → Reality evidence → result. */
export type EvaluationEvidenceLink = {
  t0Ref: string;
  realityRef: string;
  note: string;
};

export type EvaluationLane<T extends string> = {
  value: T;
  evidence: EvaluationEvidenceLink[];
};

export type CaseEvaluationOutcomeFacts = {
  facts: string[];
};

export type CaseEvaluation = {
  decisionQuality: EvaluationLane<DecisionQuality>;
  executionQuality: EvaluationLane<ExecutionQuality>;
  realityRelationship: EvaluationLane<RealityRelationshipLane>;
  outcome: CaseEvaluationOutcomeFacts;
  /** Residual uncertainty the user should see. */
  uncertainty: string[];
};

/** Optional Case-bound OHLCV summary — read-only Reality assist when OBS empty. */
export type CaseOhlcvEvidence = {
  /** Must equal Case anchor plan id — orphan windows for other plans rejected. */
  planId: string;
  available: boolean;
  thesisZoneReached: "YES" | "NO" | "UNKNOWN" | null;
  stopLevelReached: "YES" | "NO" | "UNKNOWN" | null;
  targetReached: "YES" | "NO" | "UNKNOWN" | null;
  entryLevelReached: "YES" | "NO" | "UNKNOWN" | null;
  windowHigh: number | null;
  windowLow: number | null;
};
