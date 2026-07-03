import { isSupabaseTradesStore } from "../trades-json";
import { createJsonPlaybooksStore } from "./json";
import { createSupabasePlaybooksStore } from "./supabase";
import type { PlaybooksStore } from "./types";

let cachedStore: PlaybooksStore | null = null;
let cachedSupabase: boolean | null = null;

export function getPlaybooksStore(): PlaybooksStore {
  const useSupabase = isSupabaseTradesStore();
  if (cachedStore && cachedSupabase === useSupabase) {
    return cachedStore;
  }
  cachedSupabase = useSupabase;
  cachedStore = useSupabase ? createSupabasePlaybooksStore() : createJsonPlaybooksStore();
  return cachedStore;
}

export async function readPlaybooksFromStore() {
  return getPlaybooksStore().readAll();
}
