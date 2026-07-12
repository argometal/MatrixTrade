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

/** Playbook-level scout outcome taxonomy for statistics — not the same as ScoutLifecycleStatus. */
export type PlaybookScoutStatus = "active" | "filled" | "missed" | "expired" | "cancelled";

export const PLAYBOOK_SCOUT_STATUS_LABELS: Record<PlaybookScoutStatus, string> = {
  active: "Active",
  filled: "Filled",
  missed: "Missed",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** One grade in the Multi-Timeframe Decision Hierarchy experiment. */
export interface PlaybookTimeframeGrade {
  grade: "A" | "B" | "C" | "D";
  label: string;
  horizon: string;
  question: string;
  outputs: string[];
  /** e.g. "NEVER decides execution" */
  constraint?: string;
}

/**
 * Playbook experiment — top-down timeframe layers for decision quality.
 * NOT a mandatory engine rule; may evolve with the ~3-month swing experiment.
 */
export interface PlaybookMultiTimeframeHierarchy {
  experimentNote: string;
  grades: PlaybookTimeframeGrade[];
  decisionRule: string;
  importantRules: string[];
}

/**
 * Playbook-level scout statistics — missed scouts are NOT trades.
 * Supports opportunity-cost tracking and Entry Optimization experiment validation.
 */
export interface PlaybookScoutStatistics {
  statuses: PlaybookScoutStatus[];
  statusDefinitions: Partial<Record<PlaybookScoutStatus, string>>;
  missedDefinition: string;
  notTradesRule: string;
  purpose: string;
  metrics?: string[];
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
  /** Playbook experiment — multi-timeframe decision hierarchy (not an engine rule). */
  multiTimeframeHierarchy?: PlaybookMultiTimeframeHierarchy;
  /** Playbook-level scout outcome taxonomy and missed-scout definitions. */
  scoutStatistics?: PlaybookScoutStatistics;
  /**
   * Playbook experiment — structural pullback / battle zones / Zone Solver.
   * Runs BEFORE Entry Solver; does not replace it.
   */
  structuralPullbackExperiment?: PlaybookStructuralPullbackExperiment;
  /** Ordered flow: thesis → zones → rank → select → Entry Solver → layered entry. */
  zoneSelectionFlow?: PlaybookZoneSelectionFlow;
  /**
   * Playbook experiment — risk-weighted layered entry (R allocation, not capital split).
   * Execution only; does not change Scout contract or engine sizing.
   */
  riskWeightedLayeredEntryExperiment?: PlaybookRiskWeightedLayeredEntryExperiment;
}

export type ReachProbability = "high" | "medium" | "low";
export type AsymmetryQuality = "acceptable" | "good" | "excellent";
export type BattleZoneStatus = "watching" | "selected" | "invalidated";

/** Illustrative battle zone — Playbook schema, not Stock File storage. */
export interface PlaybookBattleZone {
  id: string;
  label: string;
  low: number;
  high: number;
  basis: string[];
  reachProbability: ReachProbability;
  asymmetryQuality: AsymmetryQuality;
  status: BattleZoneStatus;
}

export interface PlaybookZoneSelectionFlow {
  experimentNote: string;
  steps: string[];
  doesNotReplaceEntrySolver: string;
}

/** One layer in the risk-weighted layered entry experiment — allocation in R units. */
export interface PlaybookRiskWeightedLayer {
  layer: number;
  label: string;
  price: number;
  /** Risk allocation in R units (e.g. 0.30 = 30% of total 1R budget). Sum across layers = 1.0. */
  riskAllocation: number;
  /** e.g. "operational support" | "structural support" */
  role?: string;
}

/** Observable outcome for risk-weighted layered entry statistics. */
export interface PlaybookRiskWeightedOutcome {
  id: string;
  label: string;
  description: string;
  /** Maximum R consumed if this outcome occurs and common stop is hit. */
  maxRiskR: number;
}

/**
 * Playbook experiment — allocate fixed 1R across layers by expectancy weight.
 * Differs from capital-split layered-entry (entry optimization).
 */
export interface PlaybookRiskWeightedLayeredEntryExperiment {
  experimentNote: string;
  objective: string;
  hypothesis: string;
  differentiationFromLayeredEntry: string;
  riskBudgetRules: string[];
  commonStopRule: string;
  sizingMath: string[];
  sizingFormula: string;
  layers: PlaybookRiskWeightedLayer[];
  commonStopExample: { low: number; high: number; label: string };
  outcomes: PlaybookRiskWeightedOutcome[];
  partialFillRule: string;
  scoutVsTradeState: string;
  metrics: string[];
}

export interface PlaybookStructuralPullbackExperiment {
  objective: string;
  hypothesis: string;
  universe: string[];
  candidateZoneSources: string[];
  expectedReachProbabilityNote: string;
  entryProcess: string[];
  corePrinciple: string;
  experimentalVariable: string;
  constantVariables: string[];
  successMetrics: string[];
  failureConditions: string[];
  guidingPrinciple: string;
  zoneSolverNote: string;
  battleZoneRules: string[];
  layeredEntryRules: string[];
  exampleBattleZones?: PlaybookBattleZone[];
  exampleLayeredEntry?: { price: number; allocationPercent: number }[];
}

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookStatus, string> = {
  TESTING: "Testing",
  ACTIVE: "Active",
  RETIRED: "Retired",
};
