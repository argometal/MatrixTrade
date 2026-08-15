import { isSupabaseTradesStore } from "../trades-json";
import {
  formatPlanId,
  maxPlanIdNumber,
  PlanIdCollisionError,
} from "../plan-id";
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

/** Test-only in-memory plans store (global high-water; insert-only create). */
export function createMemoryPlansStore(seed: TradePlan[] = []): PlansStore {
  const map = new Map<string, TradePlan>(
    seed.map((p) => [p.id.toUpperCase(), p])
  );
  let highWater = maxPlanIdNumber(seed);
  let chain: Promise<unknown> = Promise.resolve();

  function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  return {
    async readAll() {
      return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    },
    async upsert(plan) {
      map.set(plan.id.toUpperCase(), plan);
      const n = maxPlanIdNumber([plan]);
      if (n > highWater) highWater = n;
    },
    async upsertMany(plans) {
      for (const p of plans) {
        map.set(p.id.toUpperCase(), p);
        const n = maxPlanIdNumber([p]);
        if (n > highWater) highWater = n;
      }
    },
    async allocateNextPlanId() {
      return withLock(async () => {
        const fromRows = maxPlanIdNumber([...map.values()]);
        const next = Math.max(fromRows, highWater) + 1;
        highWater = next;
        return formatPlanId(next);
      });
    },
    async insert(plan) {
      await withLock(async () => {
        const key = plan.id.toUpperCase();
        if (map.has(key)) throw new PlanIdCollisionError(plan.id);
        map.set(key, plan);
        const n = maxPlanIdNumber([plan]);
        if (n > highWater) highWater = n;
      });
    },
  };
}

export function __setPlansStoreForTests(store: PlansStore | null): void {
  testOverride = store;
  cachedStore = null;
  cachedSupabase = null;
}
