/** Stored scout decision verdict — extends display-only ScoutingVerdict with probe. */
export type DecisionVerdict = "wait" | "probe" | "go" | "no";

export type ScoutDecisionSource = "human" | "ai" | "import";

export interface PlanningRisk {
  structure?: string;
  support?: string;
  stop?: string;
  rr?: string;
}

export interface ExecutionRisk {
  gap?: string;
  spread?: string;
  earnings?: string;
  emotion?: string;
  liquidity?: string;
  late?: string;
}

export interface ScoutDecision {
  id: string;
  verdict: DecisionVerdict;
  decisionConfidence: number;
  expectedValue?: number;
  expectedProbability?: number;
  opportunityQuality?: number;
  planningRisk?: PlanningRisk;
  executionRisk?: ExecutionRisk;
  reasoning?: string;
  challenges: string[];
  priorDecisionId?: string;
  decidedAt: string;
  decidedBy?: ScoutDecisionSource;
  priorConfidence?: number;
  posteriorConfidence?: number;
}

export type ScoutLifecycleStatus =
  | "open"
  | "decided_wait"
  | "decided_probe"
  | "decided_go"
  | "decided_no"
  | "probe_active"
  | "converted"
  | "executed"
  | "missed"
  | "expired"
  | "cancelled";

export const SCOUT_LIFECYCLE_LABELS: Record<ScoutLifecycleStatus, string> = {
  open: "Open",
  decided_wait: "Decided — Wait",
  decided_probe: "Decided — Probe",
  decided_go: "Decided — Go",
  decided_no: "Decided — No",
  probe_active: "Probe active",
  converted: "Converted",
  executed: "Executed",
  missed: "Missed",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const DECISION_VERDICT_LABELS: Record<DecisionVerdict, string> = {
  wait: "Wait",
  probe: "Probe",
  go: "Go",
  no: "No",
};

export const DECISION_HISTORY_CAP = 50;
