/**
 * Learning Overview — aggregate read model over Cases (MXT 016 / 016a).
 * Case equations enter via diagnoseCase → DiagnosisAggregate — not React.
 */

import type {
  DecisionQuality,
  ExecutionQuality,
  RealityRelationshipLane,
} from "./case-evaluation-types";
import type { DecisionVerdict } from "./scout-decision-types";
import type { CaseDiagnosis, DiagnosisAggregate } from "./case-diagnosis-types";

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
  /** 016a diagnosis — null only if classifier not run. */
  diagnosis: CaseDiagnosis | null;
};

export type LaneCountMap<T extends string> = Record<T, number>;

/**
 * @deprecated Prefer DiagnosisAggregate from case-diagnosis. Kept for
 * backwards-compatible slot shape during 016a transition.
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
  /** Legacy slot mirrored from 016a aggregate for older UI consumers. */
  noEntryDiagnosis: NoEntryDiagnosisSlot;
  /** Full 016a diagnosis aggregate (equations + rates + condición actual). */
  diagnosis: DiagnosisAggregate;
  /** Compact review queue — uncertainty / missing T0 / execution violations first. */
  casesForReview: LearningOverviewRow[];
  /** Full universe for drill-down of any aggregate. */
  allCases: LearningOverviewRow[];
};
