import { isSupabaseTradesStore } from "../trades-json";
import { createJsonPlansStore } from "./json";
import { createSupabasePlansStore } from "./supabase";
import type { PlansStore } from "./types";
import type { TradePlan } from "../plan-types";

let cachedStore: PlansStore | null = null;
let cachedSupabase: boolean | null = null;
let testOverride: PlansStore | null = null;

export function getPlansStore(): PlansStore {
  if (testOverride) return testOverride;
  const useSupabase = isSupabaseTradesStore();
  if (cachedStore && cachedSupabase === useSupabase) return cachedStore;
  cachedSupabase = useSupabase;
  cachedStore = useSupabase ? createSupabasePlansStore() : createJsonPlansStore();
  return cachedStore;
}

/** Test-only in-memory plans store. */
export function createMemoryPlansStore(seed: TradePlan[] = []): PlansStore {
  const map = new Map<string, TradePlan>(
    seed.map((p) => [p.id.toUpperCase(), p])
  );
  return {
    async readAll() {
      return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    },
    async upsert(plan) {
      map.set(plan.id.toUpperCase(), plan);
    },
    async upsertMany(plans) {
      for (const p of plans) map.set(p.id.toUpperCase(), p);
    },
  };
}

export function __setPlansStoreForTests(store: PlansStore | null): void {
  testOverride = store;
  cachedStore = null;
  cachedSupabase = null;
}
