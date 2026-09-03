/**
 * Playbook × Case diagnosis aggregation (MXT 016-P09 S6).
 * Read-only rates from InsightsCaseRow — no new equations.
 */

import type { InsightsCaseRow } from "./insights-case-spine-types";
import { CASE_FAMILY_LABEL, NO_ENTRY_DIAGNOSIS_LABEL } from "./insights-case-labels";

export type PlaybookDiagnosisAggregate = {
  playbookId: string | null;
  playbookName: string;
  cases: number;
  familyA: number;
  familyB: number;
  familyC: number;
  familyD: number;
  indeterminate: number;
  goodFilter: number;
  overOptimization: number;
  noEntryIndeterminate: number;
  /** Cases with enough evidence for A/C/D or resolved no-entry (not INDETERMINATE family / NE indet alone). */
  evaluableCases: number;
  rates: {
    a: number | null;
    b: number | null;
    c: number | null;
    d: number | null;
    insufficient: number | null;
    goodFilter: number | null;
    overOptimization: number | null;
    noEntryInsufficient: number | null;
  };
};

function rate(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

export function aggregatePlaybookDiagnosis(
  rows: InsightsCaseRow[],
  playbookNames?: Map<string, string> | Record<string, string>
): PlaybookDiagnosisAggregate[] {
  const nameOf = (id: string | null): string => {
    if (!id) return "(no playbook)";
    if (playbookNames instanceof Map) {
      return playbookNames.get(id) ?? id;
    }
    if (playbookNames && playbookNames[id]) return playbookNames[id]!;
    return id;
  };

  const byKey = new Map<string, InsightsCaseRow[]>();
  for (const row of rows) {
    const key = row.playbookId ?? "";
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }

  const out: PlaybookDiagnosisAggregate[] = [];
  for (const [key, group] of byKey) {
    const playbookId = key || null;
    let familyA = 0;
    let familyB = 0;
    let familyC = 0;
    let familyD = 0;
    let indeterminate = 0;
    let goodFilter = 0;
    let overOptimization = 0;
    let noEntryIndeterminate = 0;
    let evaluableCases = 0;

    for (const r of group) {
      if (r.family === "A") familyA += 1;
      else if (r.family === "B") familyB += 1;
      else if (r.family === "C") familyC += 1;
      else if (r.family === "D") familyD += 1;
      else indeterminate += 1;

      if (r.noEntryDiagnosis === "GOOD_FILTER") goodFilter += 1;
      else if (r.noEntryDiagnosis === "OVER_OPTIMIZATION") overOptimization += 1;
      else if (r.noEntryDiagnosis === "INDETERMINATE") noEntryIndeterminate += 1;

      const resolvedEntry =
        r.family === "A" || r.family === "C" || r.family === "D";
      const resolvedNoEntry =
        r.family === "B" &&
        (r.noEntryDiagnosis === "GOOD_FILTER" ||
          r.noEntryDiagnosis === "OVER_OPTIMIZATION");
      if (resolvedEntry || resolvedNoEntry) evaluableCases += 1;
    }

    const cases = group.length;
    const ne = familyB;
    out.push({
      playbookId,
      playbookName: nameOf(playbookId),
      cases,
      familyA,
      familyB,
      familyC,
      familyD,
      indeterminate,
      goodFilter,
      overOptimization,
      noEntryIndeterminate,
      evaluableCases,
      rates: {
        a: rate(familyA, cases),
        b: rate(familyB, cases),
        c: rate(familyC, cases),
        d: rate(familyD, cases),
        insufficient: rate(indeterminate, cases),
        goodFilter: rate(goodFilter, ne),
        overOptimization: rate(overOptimization, ne),
        noEntryInsufficient: rate(noEntryIndeterminate, ne),
      },
    });
  }

  out.sort((a, b) => {
    if (b.cases !== a.cases) return b.cases - a.cases;
    return a.playbookName.localeCompare(b.playbookName);
  });
  return out;
}

/** Column headers for compact Playbook Learning table. */
export const PLAYBOOK_DIAGNOSIS_COLUMNS = [
  { key: "cases", label: "Cases" },
  { key: "a", label: CASE_FAMILY_LABEL.A },
  { key: "b", label: CASE_FAMILY_LABEL.B },
  { key: "c", label: CASE_FAMILY_LABEL.C },
  { key: "d", label: CASE_FAMILY_LABEL.D },
  { key: "insufficient", label: CASE_FAMILY_LABEL.INDETERMINATE },
  { key: "goodFilter", label: NO_ENTRY_DIAGNOSIS_LABEL.GOOD_FILTER },
  {
    key: "overOptimization",
    label: NO_ENTRY_DIAGNOSIS_LABEL.OVER_OPTIMIZATION,
  },
] as const;
