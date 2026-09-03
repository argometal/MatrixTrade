import type { MafExperiment } from "../maf-types";
import type { MafExperimentsStore } from "./types";

/** In-memory stand-in for focused MAF store tests (MXT 017-P14B-02). */
export function createMemoryMafExperimentsStore(
  seed: MafExperiment[] = []
): MafExperimentsStore & { rows: MafExperiment[] } {
  const rows = seed.map((r) => ({ ...r }));
  const store: MafExperimentsStore & { rows: MafExperiment[] } = {
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
          throw new Error(`Duplicate MafExperiment for tradeId ${row.tradeId}`);
        }
      } else if (row.planId) {
        const clash = rows.find(
          (x) =>
            !x.tradeId &&
            x.planId?.toUpperCase() === row.planId!.toUpperCase() &&
            x.id.toUpperCase() !== row.id.toUpperCase()
        );
        if (clash) {
          throw new Error(`Duplicate MafExperiment for planId ${row.planId}`);
        }
      }
      const idx = rows.findIndex((x) => x.id.toUpperCase() === row.id.toUpperCase());
      if (idx >= 0) rows[idx] = { ...row };
      else rows.push({ ...row });
      rows.sort((a, b) => a.id.localeCompare(b.id));
    },
  };
  return store;
}
