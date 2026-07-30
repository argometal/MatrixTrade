import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonStockThesesStore } from "./json";
import { createSupabaseStockThesesStore } from "./supabase";
import type { StockThesis } from "../stock-thesis-types";
import type { StockThesesStore } from "./types";

let cachedStore: StockThesesStore | null = null;
let cachedSupabase: boolean | null = null;
let testOverride: StockThesesStore | null = null;

export function getStockThesesStore(): StockThesesStore {
  if (testOverride) return testOverride;
  const useSupabase = isSupabaseMatrixStore();
  if (cachedStore && cachedSupabase === useSupabase) return cachedStore;
  cachedSupabase = useSupabase;
  cachedStore = useSupabase ? createSupabaseStockThesesStore() : createJsonStockThesesStore();
  return cachedStore;
}

/** Test-only in-memory Stock File store. */
export function createMemoryStockThesesStore(seed: StockThesis[] = []): StockThesesStore {
  const map = new Map<string, StockThesis>(
    seed.map((t) => [t.id.toUpperCase(), t])
  );
  return {
    async readAll() {
      return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    },
    async upsert(thesis) {
      map.set(thesis.id.toUpperCase(), thesis);
    },
    async upsertMany(theses) {
      for (const t of theses) map.set(t.id.toUpperCase(), t);
    },
  };
}

export function __setStockThesesStoreForTests(store: StockThesesStore | null): void {
  testOverride = store;
  cachedStore = null;
  cachedSupabase = null;
}
