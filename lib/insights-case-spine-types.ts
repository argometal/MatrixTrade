/**
 * Insights Case spine — Case equations → Insights UI (MXT 016-P08).
 * Classification lives in case-diagnosis; this is a join/view model only.
 */

import type {
  DecisionQuality,
  ExecutionQuality,
  RealityRelationshipLane,
} from "./case-evaluation-types";
import type {
  CaseDiagnosis,
  DiagnosisAggregate,
  NoEntryDiagnosisClass,
} from "./case-diagnosis-types";
import type { CaseParticipationClass } from "./learning-overview-types";
import type { DecisionVerdict } from "./scout-decision-types";
import type { LearningOutcomeKind } from "./learning-outcome-types";

/** Product Case family for Insights cards / filters. */
export type InsightsCaseFamily = "A" | "B" | "C" | "D" | "INDETERMINATE";

export type InsightsCaseRow = {
  planId: string;
  /** Same as planId — Case identity is plan-anchored. */
  caseId: string;
  ticker: string;
  date: string;
  playbookId: string | null;
  stockThesisId: string | null;

  participation: CaseParticipationClass | null;
  verdict: DecisionVerdict | null;
  /** Product family: A/C/D entry; B = no-entry; else INDETERMINATE. */
  family: InsightsCaseFamily;
  noEntryDiagnosis: NoEntryDiagnosisClass | null;
  equationId: string;

  decisionQuality: DecisionQuality;
  executionQuality: ExecutionQuality;
  reality: RealityRelationshipLane;

  outcomeLabel: string | null;
  loKind: LearningOutcomeKind | null;
  realizedR: number | null;
  realizedPnL: number | null;
  counterfactualR: number | null;

  t0Available: boolean;
  missingInputs: string[];
  diagnosisReason: string;
  evidenceSummary: string;
  caseHref: string;

  /** Full diagnosis for aggregation / inspect. */
  diagnosis: CaseDiagnosis;
};

export type InsightsCaseSpineFilters = {
  from?: string;
  to?: string;
  ticker?: string;
  playbookId?: string;
  /** Product family A|B|C|D|INDETERMINATE */
  caseFamily?: InsightsCaseFamily | "all";
  noEntryDiagnosis?: NoEntryDiagnosisClass | "all";
  decisionQuality?: DecisionQuality | "all";
};

export type InsightsCaseCardMetric = {
  label: string;
  numerator: number;
  denominator: number;
  rate: number | null;
  planIds: string[];
};

export type InsightsCaseSpineView = {
  /** Cards/rates recompute against this filtered universe. */
  universeScope: "filtered";
  rows: InsightsCaseRow[];
  aggregate: DiagnosisAggregate;
  cards: {
    totalCases: InsightsCaseCardMetric;
    familyA: InsightsCaseCardMetric;
    familyB: InsightsCaseCardMetric;
    familyC: InsightsCaseCardMetric;
    familyD: InsightsCaseCardMetric;
    indeterminate: InsightsCaseCardMetric;
    goodFilter: InsightsCaseCardMetric;
    overOptimization: InsightsCaseCardMetric;
    noEntryIndeterminate: InsightsCaseCardMetric;
  };
};
