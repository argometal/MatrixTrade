import type { ExternalPosition } from "../external-position-types";
import type { ExternalPositionsStore } from "./types";

export function createMemoryExternalPositionsStore(
  seed: ExternalPosition[] = []
): ExternalPositionsStore & { rows: ExternalPosition[] } {
  const rows = seed.map((r) => ({
    ...r,
    reductions: [...(r.reductions ?? [])],
  }));
  const store: ExternalPositionsStore & { rows: ExternalPosition[] } = {
    rows,
    async readAll() {
      return rows.map((r) => ({
        ...r,
        reductions: [...r.reductions],
      }));
    },
    async upsert(row) {
      const idx = rows.findIndex(
        (x) => x.id.toUpperCase() === row.id.toUpperCase()
      );
      const next = {
        ...row,
        experimentEligible: false as const,
        scoutLinked: false as const,
        reductions: [...(row.reductions ?? [])],
      };
      if (idx >= 0) rows[idx] = next;
      else rows.push(next);
      rows.sort((a, b) => a.id.localeCompare(b.id));
      return { ...next, reductions: [...next.reductions] };
    },
  };
  return store;
}
