import type { ExternalPosition } from "../external-position-types";
import type { ExternalPositionsStore } from "./types";

/** Per-position async mutex for in-process concurrency tests. */
const locks = new Map<string, Promise<void>>();

export async function withExternalPositionLock<T>(
  positionId: string,
  fn: () => Promise<T>
): Promise<T> {
  const key = positionId.toUpperCase();
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  locks.set(
    key,
    prev.then(() => gate)
  );
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === gate) locks.delete(key);
  }
}

function clone(row: ExternalPosition): ExternalPosition {
  return {
    ...row,
    reductions: row.reductions.map((r) => ({ ...r })),
    experimentEligible: false,
    scoutLinked: false,
  };
}

export function createMemoryExternalPositionsStore(
  seed: ExternalPosition[] = []
): ExternalPositionsStore & { rows: ExternalPosition[] } {
  const rows = seed.map(clone);
  const store: ExternalPositionsStore & { rows: ExternalPosition[] } = {
    rows,
    async readAll() {
      return rows.map(clone);
    },
    async upsert(row) {
      return store.upsertIfRevision(row, row.revision);
    },
    async upsertIfRevision(row, expectedRevision) {
      const idx = rows.findIndex(
        (x) => x.id.toUpperCase() === row.id.toUpperCase()
      );
      if (idx >= 0 && rows[idx].revision !== expectedRevision) {
        throw new Error(
          `external_position_revision_conflict ${row.id}: expected ${expectedRevision}, found ${rows[idx].revision}`
        );
      }
      const next = clone({
        ...row,
        revision: (idx >= 0 ? rows[idx].revision : expectedRevision) + 1,
      });
      // For insert, expectedRevision should be 0
      if (idx < 0 && expectedRevision !== 0 && expectedRevision !== row.revision) {
        // allow create with revision 0
      }
      if (idx < 0) {
        next.revision = 1;
        rows.push(next);
      } else {
        rows[idx] = next;
      }
      rows.sort((a, b) => a.id.localeCompare(b.id));
      return clone(next);
    },
  };
  return store;
}
