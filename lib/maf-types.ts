/** Matrix Attribution Framework (MAF) — schema types. See md/matrix/maf-matrix-attribution-framework.md */

export const MAF_COMPONENT_IDS = [
  "thesis_quality",
  "zone_quality",
  "entry_quality",
  "stop_quality",
  "execution_quality",
  "trade_management_quality",
  "timing_quality",
  "capital_allocation_quality",
] as const;

export type MafComponentId = (typeof MAF_COMPONENT_IDS)[number];

export const MAF_QUALITY_BANDS = [
  "excellent",
  "good",
  "acceptable",
  "weak",
  "failure",
  "inconclusive",
  "not_applicable",
] as const;

export type MafQualityBand = (typeof MAF_QUALITY_BANDS)[number];

export type MafFillStatus = "filled" | "missed" | "cancelled" | "unknown";

export type MafExperimentStatus = "collecting" | "attributed" | "concluded";

/** Observable evidence — deterministic assembly + optional human/AI supplements. */
export type MafObservableEvidence = {
  fillStatus: MafFillStatus;
  plannedEntry?: number;
  executedEntry?: number;
  plannedStop?: number;
  executedStop?: number;
  plannedTarget?: number;
  executedTarget?: number;
  /** Target reached after stop (post-stop study). */
  targetReachedAfterStop?: boolean;
  thesisInvalidated?: boolean;
  timeUntilTargetHours?: number;
  timeUntilInvalidationHours?: number;
  /** Max favorable excursion (R or price — see unit). */
  mfe?: number;
  /** Max adverse excursion. */
  mae?: number;
  mfeMaeUnit?: "price" | "r";
  rAchieved?: number;
  exitReason?: string;
  slippageVsPlan?: number;
  betterEntryAvailable?: boolean;
  betterEntryPrice?: number;
  lossClassification?: string;
  thesisOutcome?: string;
  timingOutcome?: string;
  executionOutcome?: string;
  /** Keys present from deterministic code vs observation supplement. */
  sources: {
    trade?: boolean;
    plan?: boolean;
    postStopStudy?: boolean;
    evaluation?: boolean;
    observationSupplement?: boolean;
  };
};

/** Optional observation fields AI/human may supply (never invent prices). */
export type MafObservationSupplement = {
  mfe?: number;
  mae?: number;
  mfeMaeUnit?: "price" | "r";
  timeUntilTargetHours?: number;
  timeUntilInvalidationHours?: number;
  betterEntryAvailable?: boolean;
  betterEntryPrice?: number;
  targetReachedAfterStop?: boolean;
  thesisInvalidated?: boolean;
  notes?: string;
};

export type MafComponentAttribution = {
  component: MafComponentId;
  classification: MafQualityBand;
  /** Finer tag e.g. premature_entry, stop_too_tight — free text within reason. */
  tag?: string;
  /** 0–100 — AI confidence that evidence supports this classification (not a probability). */
  aiInterpretationConfidence: number;
  reasoning: string;
  suggestedImprovement?: string;
  evidenceRefs?: string[];
};

export type MafExperiment = {
  id: string;
  tradeId?: string;
  planId?: string;
  playbookId?: string;
  evaluationId?: string;
  ticker: string;
  status: MafExperimentStatus;
  evidence: MafObservableEvidence;
  attributions: MafComponentAttribution[];
  summary?: string;
  primaryDragComponent?: MafComponentId;
  humanApproved?: boolean;
  observationNotes?: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
};

export const MAF_COMPONENT_LABELS: Record<MafComponentId, string> = {
  thesis_quality: "Thesis quality",
  zone_quality: "Zone quality",
  entry_quality: "Entry quality",
  stop_quality: "Stop quality",
  execution_quality: "Execution quality",
  trade_management_quality: "Trade management quality",
  timing_quality: "Timing quality",
  capital_allocation_quality: "Capital allocation quality",
};
