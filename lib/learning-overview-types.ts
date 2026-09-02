/**
 * Learning Overview — aggregate read model over Cases (MXT 016-P05).
 * Demonstrable counts only. No invented High/Medium/Low or filter diagnosis.
 *
 * Future Case equations (MXT 015) must enter via this read model (or a successor
 * aggregator), not React. Do not hard-code A/B/C/D as permanent enums here.
 */

import type {
  DecisionQuality,
  ExecutionQuality,
  RealityRelationshipLane,
} from "./case-evaluation-types";
import type { DecisionVerdict } from "./scout-decision-types";

/** Participation from ScoutDecision.verdict — not Case-equation taxonomy. */
export type CaseParticipationClass = "entry" | "no_entry" | "probe";

export type LearningOverviewRow = {
  planId: string;
  ticker: string;
  stockThesisId: string | null;
  participation: CaseParticipationClass | null;
  verdict: DecisionVerdict | null;
  t0Available: boolean;
  t0Integrity: "verified" | "partial" | "unavailable";
  decisionQuality: DecisionQuality;
  executionQuality: ExecutionQuality;
  realityRelationship: RealityRelationshipLane;
  outcomeFacts: string[];
  uncertainty: string[];
  /** Relative Case Review path (under /mxt). */
  caseHref: string;
};

export type LaneCountMap<T extends string> = Record<T, number>;

/**
 * Slot for future deterministic No-entry diagnosis.
 * P05 always emits available:false until a sealed Case-equation contract exists.
 */
export type NoEntryDiagnosisSlot =
  | {
      available: false;
      reason: string;
      noEntryUniverse: number;
    }
  | {
      available: true;
      noEntryUniverse: number;
      /** Opaque counts from future classifier — labels not defined in P05. */
      byLabel: Record<string, number>;
      caseIdsByLabel: Record<string, string[]>;
    };

export type LearningOverview = {
  generatedAt: string;
  /** Plans with a committed ScoutDecision. */
  totalCases: number;
  entryCases: number;
  noEntryCases: number;
  probeCases: number;
  /** Cases with no usable T0 freeze (Decision Quality INDETERMINATE from missing T0). */
  missingT0Cases: number;
  decisionQuality: LaneCountMap<DecisionQuality>;
  executionQuality: LaneCountMap<ExecutionQuality>;
  realityRelationship: LaneCountMap<RealityRelationshipLane>;
  noEntryDiagnosis: NoEntryDiagnosisSlot;
  /** Compact review queue — uncertainty / missing T0 / execution violations first. */
  casesForReview: LearningOverviewRow[];
  /** Full universe for drill-down of any aggregate. */
  allCases: LearningOverviewRow[];
};
