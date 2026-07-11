export type PlaybookStatus = "TESTING" | "ACTIVE" | "RETIRED";

/** Playbook-level experiment — evaluated across many stocks, not one ticker. */
export type PlaybookExperimentScope = "playbook";

/** Reusable evaluation framework — never ticker-specific (not Stock File). */
export interface PlaybookMethodology {
  philosophy?: string;
  corePrinciple?: string;
  asymmetryPrinciple?: string;
  confirmationCost?: string;
  opportunityPreservation?: string;
  statisticalFramework?: string;
  continuousLearning?: string;
  /** Matrix identity — statistical engine, not prediction engine. */
  matrixIdentity?: string;
}

/** Strategy vs execution — one execution variable per experiment. */
export interface PlaybookExecutionExperiments {
  strategyDefinition?: string;
  executionDefinition?: string;
  experimentalRule?: string;
  noChaseRule?: string;
  executionPrinciple?: string;
  layeredEntryHypothesis?: string;
  metrics?: string[];
}

export interface PlaybookScoutingDimensions {
  thesisQuality?: string[];
  opportunityQuality?: string[];
}

export interface Playbook {
  id: string;
  name: string;
  status: PlaybookStatus;
  description: string;
  checklist: string[];
  /** Normal thesis evaluation window (days). Default 90. */
  expectedHorizonDays?: number;
  /** Max observation after position close (days). Default 120. */
  maximumObservationDays?: number;
  /** Short bullets for snapshot / quick reference. */
  principles?: string[];
  /** Full expectancy & asymmetry framework — applies to every setup using this playbook. */
  methodology?: PlaybookMethodology;
  /** Execution experiments — strategy constant, execution variable isolated. */
  executionExperiments?: PlaybookExecutionExperiments;
  /** Independent dimensions the Scouting Desk must score. */
  scoutingDimensions?: PlaybookScoutingDimensions;
  /** Metric names (values come from supplied prices only). */
  scoutingMetrics?: string[];
  /** How GO / WAIT / NO should be chosen. */
  decisionPhilosophy?: string;
  /** Hypothesis tested across qualified trades in this playbook. */
  experimentHypothesis?: string;
  experimentScope?: PlaybookExperimentScope;
  /** Optional link to parent methodology playbook id. */
  appliesMethodology?: string;
}

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookStatus, string> = {
  TESTING: "Testing",
  ACTIVE: "Active",
  RETIRED: "Retired",
};
