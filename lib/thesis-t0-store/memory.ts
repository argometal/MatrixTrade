import type { ThesisT0Freeze } from "../thesis-t0-types";
import type { ThesisT0Store } from "./types";

export function createMemoryThesisT0Store(
  seed: ThesisT0Freeze[] = []
): ThesisT0Store {
  const rows = new Map<string, ThesisT0Freeze>(
    seed.map((r) => [r.id.toUpperCase(), structuredClone(r)])
  );

  return {
    async readAll() {
      return [...rows.values()].map((r) => structuredClone(r));
    },
    async getById(id) {
      const row = rows.get(id.toUpperCase());
      return row ? structuredClone(row) : null;
    },
    async findOpenByStockThesisId(stockThesisId) {
      const id = stockThesisId.toUpperCase();
      for (const row of rows.values()) {
        if (row.status === "open" && row.stockThesisId.toUpperCase() === id) {
          return structuredClone(row);
        }
      }
      return null;
    },
    async insert(row) {
      const key = row.id.toUpperCase();
      if (rows.has(key)) {
        throw new Error(`Thesis T0 freeze already exists: ${row.id}`);
      }
      rows.set(key, structuredClone(row));
    },
    async upsert(row) {
      rows.set(row.id.toUpperCase(), structuredClone(row));
    },
  };
}
