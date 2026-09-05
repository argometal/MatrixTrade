/**
 * Case diagnosis types (MXT 016a + 028 Case D subtypes).
 * Deterministic, inspectable, evidence-linked — independent of UI.
 * Case D subtypes do NOT determine MAF component attribution.
 */

export type NoEntryDiagnosisClass =
  | "GOOD_FILTER"
  | "OVER_OPTIMIZATION"
  | "INDETERMINATE";

/** Entry Case families from MXT 015 direction (A/C/D). B is no-entry filtering. */
export type EntryCaseFamily = "A" | "C" | "D" | "INDETERMINATE";

/**
 * Case D — Execution / Plan Divergence subtypes (MXT 028).
 * Realized P/L/R stays separate from planned/counterfactual R.
 */
export const CASE_D_SUBTYPES = [
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
] as const;

export type CaseDSubtype = (typeof CASE_D_SUBTYPES)[number];

export type CaseDiagnosisClassification =
  | { kind: "no_entry"; value: NoEntryDiagnosisClass }
  | { kind: "entry_family"; value: EntryCaseFamily }
  | { kind: "case_d"; value: CaseDSubtype }
  | { kind: "probe"; value: "INDETERMINATE" }
  | { kind: "unclassified"; value: "INDETERMINATE" };

export type CaseDiagnosisEvidence = {
  inputKey: string;
  value: string;
  evidenceRef: string;
};

export type CaseDiagnosis = {
  planId: string;
  classification: CaseDiagnosisClassification;
  /** Stable equation / rule id — auditable. */
  equationId: string;
  inputsUsed: CaseDiagnosisEvidence[];
  missingInputs: string[];
  reason: string;
  /** Present when classification.kind === "case_d" (also mirrored for callers). */
  caseDSubtype?: CaseDSubtype | null;
};


export type FalseVirtuousLoopState = {
  /** Never true from high no-entry rate alone. */
  suspected: boolean;
  equationId: string;
  reason: string;
  inputs: {
    totalCases: number;
    entryCases: number;
    noEntryCases: number;
    entryRate: number | null;
    noEntryRate: number | null;
    goodFilter: number;
    overOptimization: number;
    indeterminateNoEntry: number;
    noEntryDiagnosedDenom: number;
  };
};

export type DiagnosisAggregate = {
  available: true;
  noEntryUniverse: number;
  entryUniverse: number;
  goodFilter: number;
  overOptimization: number;
  indeterminateNoEntry: number;
  entryFamilyA: number;
  entryFamilyC: number;
  entryFamilyD: number;
  entryFamilyIndeterminate: number;
  rates: {
    goodFilterRate: number | null;
    overOptimizationRate: number | null;
    indeterminateNoEntryRate: number | null;
    entryFamilyARate: number | null;
    entryFamilyCRate: number | null;
    entryFamilyDRate: number | null;
  };
  falseVirtuousLoop: FalseVirtuousLoopState;
  /** Deterministic operational statement — not LLM narrative. */
  currentCondition: {
    code:
      | "INSUFFICIENT_EVIDENCE"
      | "FILTERING_DOMINANT_GOOD"
      | "POSSIBLE_OVER_FILTERING"
      | "PARTICIPATING"
      | "MIXED"
      | "EMPTY";
    statement: string;
  };
  byPlanId: Record<string, CaseDiagnosis>;
};
