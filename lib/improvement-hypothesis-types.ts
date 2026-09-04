/**
 * MXT 028 — Improvement Hypothesis (Improvement Learning Loop).
 *
 * Distinct from MafExperiment (attribution lifecycle). This object is the
 * prospective method-change test: deficiency → hypothesis → future evidence →
 * human verdict → optional human-authorized method change.
 *
 * Never auto-mutates Playbooks / Mechanics.
 */

import type { MafComponentId } from "./maf-types";

export const IMPROVEMENT_HYPOTHESIS_STATUSES = [
  "proposed",
  "testing",
  "supported",
  "rejected",
  "insufficient_evidence",
  "method_change_authorized",
] as const;

export type ImprovementHypothesisStatus =
  (typeof IMPROVEMENT_HYPOTHESIS_STATUSES)[number];

/** What kind of controlled adaptation is under test (generic — not OLE-only). */
export const IMPROVEMENT_CANDIDATE_KINDS = [
  "technique",
  "parameter",
  "process",
  "other",
] as const;

export type ImprovementCandidateKind =
  (typeof IMPROVEMENT_CANDIDATE_KINDS)[number];

export type ImprovementHypothesis = {
  id: string;
  status: ImprovementHypothesisStatus;
  ticker: string;
  /** MAF component that was deficient (e.g. entry_quality). */
  componentId: MafComponentId;
  /** Human-readable candidate under test (e.g. Optimized Layered Entry). */
  candidateLabel: string;
  candidateKind: ImprovementCandidateKind;
  /** When / under what conditions this change should apply. */
  applicability: string;
  /** What change are we testing? */
  changeUnderTest: string;

  /** Originating Case that justified creation — never confirming evidence. */
  originPlanId: string;
  originMafExperimentId: string;
  originCaseEquationId?: string;
  playbookId?: string;

  /**
   * Future Plans linked as prospective evidence.
   * Must never include originPlanId.
   */
  evidencePlanIds: string[];

  /** Optional notes / human rationale. */
  notes?: string;

  /** Human authorized prospective testing (status → testing). */
  authorizedForTestingAt?: string;
  /** Human authorized consequential method change — record only; no auto mutate. */
  methodChangeAuthorizedAt?: string;
  methodChangeAuthorizationNote?: string;

  /** Last human-set evidence verdict (does not invent learning). */
  evidenceVerdictSetAt?: string;
  evidenceVerdictNote?: string;

  createdAt: string;
  updatedAt: string;
  source?: string;
};

export const IMPROVEMENT_HYPOTHESIS_STATUS_LABELS: Record<
  ImprovementHypothesisStatus,
  string
> = {
  proposed: "Proposed",
  testing: "Testing",
  supported: "Supported",
  rejected: "Rejected",
  insufficient_evidence: "Insufficient evidence",
  method_change_authorized: "Method change authorized",
};

/** Evidence rollup — never claims Supported when sample is inadequate. */
export type ImprovementEvidenceSummary = {
  hypothesisId: string;
  originPlanId: string;
  evidencePlanIds: string[];
  /** Plans linked minus origin (always). */
  independentEvidenceCount: number;
  /** Linked plans that currently have a Case spine row. */
  casesWithSpine: number;
  familyCounts: Partial<Record<string, number>>;
  decisionQualityCounts: Partial<Record<string, number>>;
  /** System suggestion only — human sets authoritative status. */
  suggestedIndication: "insufficient_evidence" | "review_ready";
  suggestionReason: string;
};
