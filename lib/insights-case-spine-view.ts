/**
 * Pure Insights Case spine view helpers — safe for client components.
 * Classification already done by diagnoseCase; this only filters/aggregates.
 */

import {
  aggregateDiagnoses,
} from "./case-diagnosis";
import type { CaseDiagnosis } from "./case-diagnosis-types";
import type { NoEntryDiagnosisClass } from "./case-diagnosis-types";
import type {
  InsightsCaseCardMetric,
  InsightsCaseFamily,
  InsightsCaseRow,
  InsightsCaseSpineFilters,
  InsightsCaseSpineView,
} from "./insights-case-spine-types";

export type {
  InsightsCaseRow,
  InsightsCaseFamily,
  InsightsCaseSpineFilters,
  InsightsCaseSpineView,
  InsightsCaseCardMetric,
} from "./insights-case-spine-types";

function inRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return true;
  if (!from && !to) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  if (from && t < Date.parse(from)) return false;
  if (to && t > Date.parse(to)) return false;
  return true;
}

export function familyFromDiagnosis(
  diagnosis: CaseDiagnosis
): InsightsCaseFamily {
  if (diagnosis.classification.kind === "no_entry") return "B";
  if (diagnosis.classification.kind === "entry_family") {
    const v = diagnosis.classification.value;
    if (v === "A" || v === "C" || v === "D") return v;
    return "INDETERMINATE";
  }
  return "INDETERMINATE";
}

export function noEntryDiagnosisFrom(
  diagnosis: CaseDiagnosis
): NoEntryDiagnosisClass | null {
  if (diagnosis.classification.kind !== "no_entry") return null;
  return diagnosis.classification.value;
}

export function filterInsightsCaseRows(
  rows: InsightsCaseRow[],
  filters: InsightsCaseSpineFilters
): InsightsCaseRow[] {
  return rows.filter((row) => {
    if (filters.ticker && row.ticker.toUpperCase() !== filters.ticker.toUpperCase()) {
      return false;
    }
    if (filters.playbookId && row.playbookId !== filters.playbookId) {
      return false;
    }
    if (!inRange(row.date, filters.from, filters.to)) return false;
    if (
      filters.caseFamily &&
      filters.caseFamily !== "all" &&
      row.family !== filters.caseFamily
    ) {
      return false;
    }
    if (
      filters.noEntryDiagnosis &&
      filters.noEntryDiagnosis !== "all"
    ) {
      if (row.noEntryDiagnosis !== filters.noEntryDiagnosis) return false;
    }
    if (
      filters.decisionQuality &&
      filters.decisionQuality !== "all" &&
      row.decisionQuality !== filters.decisionQuality
    ) {
      return false;
    }
    return true;
  });
}

function cardMetric(
  label: string,
  planIds: string[],
  denominator: number
): InsightsCaseCardMetric {
  const numerator = planIds.length;
  return {
    label,
    numerator,
    denominator,
    rate: denominator > 0 ? numerator / denominator : null,
    planIds: [...planIds].sort(),
  };
}

/**
 * Cards/rates recompute against the CURRENT FILTERED Case universe.
 * Classification is not recomputed — only membership/rates.
 */
export function buildInsightsCaseSpineView(
  rows: InsightsCaseRow[],
  filters?: InsightsCaseSpineFilters
): InsightsCaseSpineView {
  const filtered = filterInsightsCaseRows(rows, filters ?? {});
  const diagnoses = filtered.map((r) => r.diagnosis);
  let entryCases = 0;
  let noEntryCases = 0;
  let missingT0Cases = 0;
  for (const r of filtered) {
    if (r.participation === "entry") entryCases += 1;
    else if (r.participation === "no_entry") noEntryCases += 1;
    if (!r.t0Available) missingT0Cases += 1;
  }
  const aggregate = aggregateDiagnoses({
    diagnoses,
    totalCases: filtered.length,
    entryCases,
    noEntryCases,
    missingT0Cases,
  });

  const total = filtered.length;
  const ne = aggregate.noEntryUniverse;
  const ids = (pred: (r: InsightsCaseRow) => boolean) =>
    filtered.filter(pred).map((r) => r.planId);

  return {
    universeScope: "filtered",
    rows: filtered,
    aggregate,
    cards: {
      totalCases: cardMetric(
        "TOTAL CASES",
        filtered.map((r) => r.planId),
        total
      ),
      familyA: cardMetric("A", ids((r) => r.family === "A"), total),
      familyB: cardMetric("B — NO ENTRY", ids((r) => r.family === "B"), total),
      familyC: cardMetric("C", ids((r) => r.family === "C"), total),
      familyD: cardMetric("D", ids((r) => r.family === "D"), total),
      indeterminate: cardMetric(
        "INDETERMINATE",
        ids((r) => r.family === "INDETERMINATE"),
        total
      ),
      goodFilter: cardMetric(
        "GOOD FILTER",
        ids((r) => r.noEntryDiagnosis === "GOOD_FILTER"),
        ne
      ),
      overOptimization: cardMetric(
        "POSSIBLE OVER-OPTIMIZATION",
        ids((r) => r.noEntryDiagnosis === "OVER_OPTIMIZATION"),
        ne
      ),
      noEntryIndeterminate: cardMetric(
        "NO-ENTRY INDETERMINATE",
        ids((r) => r.noEntryDiagnosis === "INDETERMINATE"),
        ne
      ),
    },
  };
}
