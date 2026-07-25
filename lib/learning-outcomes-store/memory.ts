import type { LearningOutcome } from "../learning-outcome-types";
import type { LearningOutcomesStore } from "./types";

function enforceCanonicalUniqueness(
  rows: LearningOutcome[],
  row: LearningOutcome
): void {
  if (row.tradeId) {
    const clash = rows.find(
      (x) =>
        x.tradeId?.toUpperCase() === row.tradeId!.toUpperCase() &&
        x.id.toUpperCase() !== row.id.toUpperCase()
    );
    if (clash) {
      throw new Error(
        `Duplicate Learning Outcome for tradeId ${row.tradeId}: ${clash.id} vs ${row.id}`
      );
    }
  } else if (row.planId) {
    const clash = rows.find(
      (x) =>
        !x.tradeId &&
        x.planId?.toUpperCase() === row.planId!.toUpperCase() &&
        x.id.toUpperCase() !== row.id.toUpperCase()
    );
    if (clash) {
      throw new Error(
        `Duplicate Learning Outcome for planId ${row.planId}: ${clash.id} vs ${row.id}`
      );
    }
  }
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
      enforceCanonicalUniqueness(rows, row);
      const idx = rows.findIndex(
        (x) => x.id.toUpperCase() === row.id.toUpperCase()
      );
      if (idx >= 0) rows[idx] = { ...row };
      else rows.push({ ...row });
      rows.sort((a, b) => a.id.localeCompare(b.id));
    },
    async upsertMany(list) {
      for (const row of list) await store.upsert(row);
    },
  };
  return store;
}
