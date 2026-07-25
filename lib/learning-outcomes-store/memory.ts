import type { LearningOutcome } from "../learning-outcome-types";
import {
  compareLearningOutcomeFreshness,
  mergeCanonicalLearningOutcome,
  mergeEqualTimestampLinks,
} from "./merge";
import type { LearningOutcomesStore } from "./types";

function findCanonical(
  rows: LearningOutcome[],
  row: LearningOutcome
): LearningOutcome | undefined {
  if (row.tradeId) {
    return rows.find(
      (x) => x.tradeId?.toUpperCase() === row.tradeId!.toUpperCase()
    );
  }
  if (row.planId) {
    return rows.find(
      (x) =>
        !x.tradeId &&
        x.planId?.toUpperCase() === row.planId!.toUpperCase()
    );
  }
  return rows.find((x) => x.id.toUpperCase() === row.id.toUpperCase());
}

/** In-memory store for focused tests — no disk / Supabase. */
export function createMemoryLearningOutcomesStore(
  seed: LearningOutcome[] = []
): LearningOutcomesStore & { rows: LearningOutcome[] } {
  const rows = seed.map((r) => ({ ...r }));
  const store: LearningOutcomesStore & { rows: LearningOutcome[] } = {
    rows,
    async readAll() {
      return rows.map((r) => ({ ...r }));
    },
    async upsert(row) {
      const byId = rows.find((x) => x.id.toUpperCase() === row.id.toUpperCase());
      const byIdentity = findCanonical(rows, row);
      const existing =
        byIdentity ??
        byId ??
        undefined;

      if (existing) {
        const freshness = compareLearningOutcomeFreshness(existing, row);
        if (freshness === "existing_newer") {
          return { ...existing };
        }
        const merged =
          freshness === "equal"
            ? mergeEqualTimestampLinks(existing, row)
            : mergeCanonicalLearningOutcome(existing, row);
        const idx = rows.findIndex(
          (x) => x.id.toUpperCase() === existing.id.toUpperCase()
        );
        // Drop any duplicate id that matched differently
        for (let i = rows.length - 1; i >= 0; i--) {
          if (
            i !== idx &&
            rows[i].id.toUpperCase() === row.id.toUpperCase() &&
            rows[i].id.toUpperCase() !== existing.id.toUpperCase()
          ) {
            rows.splice(i, 1);
          }
        }
        const writeIdx = rows.findIndex(
          (x) => x.id.toUpperCase() === existing.id.toUpperCase()
        );
        if (writeIdx >= 0) rows[writeIdx] = { ...merged };
        else rows.push({ ...merged });
        rows.sort((a, b) => a.id.localeCompare(b.id));
        return { ...merged };
      }

      rows.push({ ...row });
      rows.sort((a, b) => a.id.localeCompare(b.id));
      return { ...row };
    },
    async upsertMany(list) {
      const out: LearningOutcome[] = [];
      for (const row of list) out.push(await store.upsert(row));
      return out;
    },
  };
  return store;
}
