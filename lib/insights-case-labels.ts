/**
 * Presentation labels for Insights Case families / no-entry diagnosis.
 * Canonical enums stay in case-diagnosis / InsightsCaseFamily — UI only.
 */

import type {
  CaseDSubtype,
  NoEntryDiagnosisClass,
} from "./case-diagnosis-types";
import type { InsightsCaseFamily } from "./insights-case-spine-types";

/** Compact card / filter / chip labels (keep letter as mathematical id). */
export const CASE_FAMILY_LABEL: Record<InsightsCaseFamily, string> = {
  A: "A · Good Entry / Profit",
  B: "B · No Entry",
  C: "C · Good Entry / Loss",
  D: "D · Execution / Plan Divergence",
  INDETERMINATE: "? · Insufficient Evidence",
};

export const NO_ENTRY_DIAGNOSIS_LABEL: Record<NoEntryDiagnosisClass, string> = {
  GOOD_FILTER: "Good Filter",
  OVER_OPTIMIZATION: "Possible Over-Optimization",
  INDETERMINATE: "Insufficient Evidence",
};

export const CASE_D_SUBTYPE_LABEL: Record<CaseDSubtype, string> = {
  D1: "D1 · No Entry / Would Profit",
  D2: "D2 · No Entry / Would Loss",
  D3: "D3 · No Entry / Indeterminate",
  D4: "D4 · Deficient Execution / Would Profit",
  D5: "D5 · Deficient Execution / Would Loss",
  D6: "D6 · Deficient Execution / Indeterminate",
};

/** Short Help blurbs for Case families. */
export const CASE_FAMILY_HELP: Record<InsightsCaseFamily, string> = {
  A: "A valid participation decision that was executed correctly and produced a favorable outcome. A is not simply profit — decision and execution requirements remain part of A.",
  B: "No participation. B is not automatically a missed entry — it may be Good Filter, Possible Over-Optimization, or Insufficient Evidence.",
  C: "A loss can occur despite a valid decision and correct execution. Outcome quality is not the same as decision quality.",
  D: "Actual execution differs materially from an evaluable planned path (no entry or deficient execution). Preserve realized R separately from counterfactual/planned R. Case D does not assign MAF components.",
  INDETERMINATE:
    "The Case does not contain enough frozen evidence to classify the original decision reliably.",
};

export const CASE_D_SUBTYPE_HELP: Record<CaseDSubtype, string> = {
  D1: "No fill; planned path counterfactual R is positive. Realized R = 0; CF R is not portfolio P/L.",
  D2: "No fill; planned path counterfactual R is negative. Realized R = 0; avoided planned loss is still CF −R, not portfolio P/L.",
  D3: "No fill; planned-path counterfactual R cannot be determined reliably. Realized R = 0.",
  D4: "Execution diverged from plan; planned path would have produced positive R.",
  D5: "Execution diverged from plan; planned path would have produced negative R.",
  D6: "Execution diverged from plan; planned-path effect cannot be determined reliably.",
};

export const NO_ENTRY_DIAGNOSIS_HELP: Record<NoEntryDiagnosisClass, string> = {
  GOOD_FILTER:
    "Frozen conditions genuinely did not justify participation.",
  OVER_OPTIMIZATION:
    "Frozen participation requirements were met, but the system still did not participate. Later price movement alone does not prove a missed entry.",
  INDETERMINATE:
    "T0 and/or Reality are insufficient to determine whether this No Entry was Good Filter or over-optimization.",
};

export function caseFamilyLabel(family: InsightsCaseFamily): string {
  return CASE_FAMILY_LABEL[family];
}

export function noEntryDiagnosisLabel(
  dx: NoEntryDiagnosisClass
): string {
  return NO_ENTRY_DIAGNOSIS_LABEL[dx];
}

/** Filter option list — values remain canonical enums. */
export const CASE_FAMILY_FILTER_OPTIONS: {
  value: InsightsCaseFamily | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "A", label: CASE_FAMILY_LABEL.A },
  { value: "B", label: CASE_FAMILY_LABEL.B },
  { value: "C", label: CASE_FAMILY_LABEL.C },
  { value: "D", label: CASE_FAMILY_LABEL.D },
  { value: "INDETERMINATE", label: CASE_FAMILY_LABEL.INDETERMINATE },
];

export const NO_ENTRY_DIAGNOSIS_FILTER_OPTIONS: {
  value: NoEntryDiagnosisClass | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "GOOD_FILTER", label: NO_ENTRY_DIAGNOSIS_LABEL.GOOD_FILTER },
  {
    value: "OVER_OPTIMIZATION",
    label: NO_ENTRY_DIAGNOSIS_LABEL.OVER_OPTIMIZATION,
  },
  { value: "INDETERMINATE", label: NO_ENTRY_DIAGNOSIS_LABEL.INDETERMINATE },
];
