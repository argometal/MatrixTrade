import { isSupabaseTradesStore } from "../trades-json";
import { createJsonPlansStore } from "./json";
import { createSupabasePlansStore } from "./supabase";
import type { PlansStore } from "./types";

let cachedStore: PlansStore | null = null;
let cachedSupabase: boolean | null = null;

export function getPlansStore(): PlansStore {
  const useSupabase = isSupabaseTradesStore();
  if (cachedStore && cachedSupabase === useSupabase) return cachedStore;
  cachedSupabase = useSupabase;
  cachedStore = useSupabase ? createSupabasePlansStore() : createJsonPlansStore();
  return cachedStore;
}
