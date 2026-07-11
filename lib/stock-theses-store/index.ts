import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonStockThesesStore } from "./json";
import { createSupabaseStockThesesStore } from "./supabase";
import type { StockThesesStore } from "./types";

let cachedStore: StockThesesStore | null = null;
let cachedSupabase: boolean | null = null;

export function getStockThesesStore(): StockThesesStore {
  const useSupabase = isSupabaseMatrixStore();
  if (cachedStore && cachedSupabase === useSupabase) return cachedStore;
  cachedSupabase = useSupabase;
  cachedStore = useSupabase ? createSupabaseStockThesesStore() : createJsonStockThesesStore();
  return cachedStore;
}
