import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonScopedAiGrantsStore } from "./json";
import { createSupabaseScopedAiGrantsStore } from "./supabase";
import type { ScopedAiGrantsStore } from "./types";

let cachedStore: ScopedAiGrantsStore | null = null;
let cachedSupabase: boolean | null = null;

export function getScopedAiGrantsStore(): ScopedAiGrantsStore {
  const useSupabase = isSupabaseMatrixStore();
  if (cachedStore && cachedSupabase === useSupabase) return cachedStore;
  cachedSupabase = useSupabase;
  cachedStore = useSupabase ? createSupabaseScopedAiGrantsStore() : createJsonScopedAiGrantsStore();
  return cachedStore;
}

export async function readScopedAiGrantsFile(): Promise<import("../scoped-ai-grant-types").ScopedAiGrant[]> {
  return getScopedAiGrantsStore().readAll();
}

export async function upsertScopedAiGrant(
  grant: import("../scoped-ai-grant-types").ScopedAiGrant
): Promise<void> {
  return getScopedAiGrantsStore().upsert(grant);
}

export async function getScopedAiGrantById(
  id: string
): Promise<import("../scoped-ai-grant-types").ScopedAiGrant | undefined> {
  return getScopedAiGrantsStore().getById(id);
}
