import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonMarketEvidenceStore } from "./json";
import { createSupabaseMarketEvidenceStore } from "./supabase";
import type { MarketEvidenceStore } from "./types";

let store: MarketEvidenceStore | null = null;
let cachedSupabase: boolean | null = null;

export function getMarketEvidenceStore(): MarketEvidenceStore {
  const useSupabase = isSupabaseMatrixStore();
  if (store && cachedSupabase === useSupabase) return store;
  cachedSupabase = useSupabase;
  store = useSupabase ? createSupabaseMarketEvidenceStore() : createJsonMarketEvidenceStore();
  return store;
}
