import type { ConfirmationCost } from "./asymmetry-types";
import type { PlaybookScoutStatus } from "./playbook-types";

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
  /** 0–100 — how likely the hypothesis is correct. */
  thesisQuality?: number;
  /** 0–100 — how attractive the trade is at the current price. */
  opportunityQuality?: number;
  /** Cost of waiting for more confirmation — use supplied prices only. */
  confirmationCost?: ConfirmationCost;
  /** Location evidence — price reached strategic zone. */
  locationEvidence?: string;
  /** Confirmation evidence — buyers/sellers taking control. */
  confirmationEvidence?: string;
  /** When true, no meaningful add before thesis resolves (single-entry setup). */
  singleEntryOnly?: boolean;
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

/** Maps detailed engine lifecycle states to Playbook-level scout statistics statuses. */
export const SCOUT_LIFECYCLE_TO_PLAYBOOK_STATUS: Partial<
  Record<ScoutLifecycleStatus, PlaybookScoutStatus>
> = {
  open: "active",
  decided_wait: "active",
  decided_probe: "active",
  decided_go: "active",
  probe_active: "active",
  executed: "filled",
  converted: "filled",
  missed: "missed",
  expired: "expired",
  cancelled: "cancelled",
};

export const DECISION_VERDICT_LABELS: Record<DecisionVerdict, string> = {
  wait: "Wait",
  probe: "Probe",
  go: "Go",
  no: "No",
};

export const DECISION_HISTORY_CAP = 50;
