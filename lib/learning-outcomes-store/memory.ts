import type { LearningOutcome } from "../learning-outcome-types";
import {
  resolveExistingLearningOutcome,
  resolveLearningOutcomeUpsert,
} from "./merge";
import type { LearningOutcomesStore } from "./types";

function findById(
  rows: LearningOutcome[],
  id: string
): LearningOutcome | undefined {
  return rows.find((x) => x.id.toUpperCase() === id.toUpperCase());
}

function findByBusinessIdentity(
  rows: LearningOutcome[],
  row: LearningOutcome
): LearningOutcome | undefined {
  if (row.tradeId) {
    return rows.find(
      (x) => x.tradeId?.toUpperCase() === row.tradeId!.toUpperCase()
    );
  }
  if (row.planId && !row.tradeId) {
    return rows.find(
      (x) =>
        !x.tradeId &&
        x.planId?.toUpperCase() === row.planId!.toUpperCase()
    );
  }
  return undefined;
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
      const existingById = findById(rows, row.id);
      const existingByIdentity = findByBusinessIdentity(rows, row);
      // Collision / target resolution before any mutation.
      const target = resolveExistingLearningOutcome({
        incoming: row,
        existingById,
        existingByIdentity,
      });
      const resolved = resolveLearningOutcomeUpsert(target.existing, row);

      if (resolved.action === "insert") {
        rows.push({ ...resolved.row });
        rows.sort((a, b) => a.id.localeCompare(b.id));
        return { ...resolved.row };
      }

      if (resolved.action === "skip") {
        return { ...resolved.row };
      }

      const writeIdx = rows.findIndex(
        (x) => x.id.toUpperCase() === resolved.row.id.toUpperCase()
      );
      if (writeIdx >= 0) rows[writeIdx] = { ...resolved.row };
      else rows.push({ ...resolved.row });
      rows.sort((a, b) => a.id.localeCompare(b.id));
      return { ...resolved.row };
    },
    async upsertMany(list) {
      const out: LearningOutcome[] = [];
      for (const row of list) out.push(await store.upsert(row));
      return out;
    },
  };
  return store;
}
