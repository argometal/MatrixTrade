import type { LearningOutcome } from "../learning-outcome-types";
import { resolveLearningOutcomeUpsert } from "./merge";
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
  if (row.planId && !row.tradeId) {
    return rows.find(
      (x) =>
        !x.tradeId &&
        x.planId?.toUpperCase() === row.planId!.toUpperCase()
    );
  }
  return undefined;
}

function findExisting(
  rows: LearningOutcome[],
  row: LearningOutcome
): LearningOutcome | undefined {
  const byIdentity = findCanonical(rows, row);
  if (byIdentity) return byIdentity;
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
      const existing = findExisting(rows, row);
      const resolved = resolveLearningOutcomeUpsert(existing, row);

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

      // Drop non-canonical duplicate id if present
      for (let i = rows.length - 1; i >= 0; i--) {
        if (
          rows[i].id.toUpperCase() === row.id.toUpperCase() &&
          rows[i].id.toUpperCase() !== resolved.row.id.toUpperCase()
        ) {
          rows.splice(i, 1);
        }
      }
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
