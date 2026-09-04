import type { ImprovementHypothesis } from "../improvement-hypothesis-types";
import type { ImprovementHypothesesStore } from "./types";

/** In-memory stand-in for focused Improvement Hypothesis tests (MXT 028). */
export function createMemoryImprovementHypothesesStore(
  seed: ImprovementHypothesis[] = []
): ImprovementHypothesesStore & { rows: ImprovementHypothesis[] } {
  const rows = seed.map((r) => ({ ...r, evidencePlanIds: [...r.evidencePlanIds] }));
  const store: ImprovementHypothesesStore & { rows: ImprovementHypothesis[] } = {
    rows,
    async readAll() {
      return rows.map((r) => ({
        ...r,
        evidencePlanIds: [...r.evidencePlanIds],
      }));
    },
    async upsert(row) {
      const idx = rows.findIndex(
        (x) => x.id.toUpperCase() === row.id.toUpperCase()
      );
      const copy = {
        ...row,
        evidencePlanIds: [...row.evidencePlanIds],
      };
      if (idx >= 0) rows[idx] = copy;
      else rows.push(copy);
      rows.sort((a, b) => a.id.localeCompare(b.id));
    },
  };
  return store;
}
