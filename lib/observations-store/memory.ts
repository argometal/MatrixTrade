import type { ObservationRecord } from "../observation-types";
import type { ObservationsStore } from "./types";

/** In-memory durable stand-in for focused tests (Prompt 25-115). */
export function createMemoryObservationsStore(
  seed: ObservationRecord[] = []
): ObservationsStore & { rows: ObservationRecord[] } {
  const rows = seed.map((r) => ({ ...r }));
  const store: ObservationsStore & { rows: ObservationRecord[] } = {
    rows,
    async readAll() {
      return rows.map((r) => ({ ...r }));
    },
    async upsert(row) {
      if (row.tradeId) {
        const clash = rows.find(
          (x) =>
            x.tradeId?.toUpperCase() === row.tradeId!.toUpperCase() &&
            x.id.toUpperCase() !== row.id.toUpperCase()
        );
        if (clash) {
          throw new Error(
            `Duplicate ObservationRecord for tradeId ${row.tradeId}`
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
            `Duplicate ObservationRecord for planId ${row.planId}`
          );
        }
      }
      const idx = rows.findIndex(
        (x) => x.id.toUpperCase() === row.id.toUpperCase()
      );
      if (idx >= 0) rows[idx] = { ...row };
      else rows.push({ ...row });
      rows.sort((a, b) => a.id.localeCompare(b.id));
    },
  };
  return store;
}
