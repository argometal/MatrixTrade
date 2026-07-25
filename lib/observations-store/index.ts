import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonObservationsStore } from "./json";
import { createMemoryObservationsStore } from "./memory";
import { createSupabaseObservationsStore } from "./supabase";
import type { ObservationsStore } from "./types";

export type ObservationsStoreMode = "supabase" | "json" | "memory";

let cachedStore: ObservationsStore | null = null;
let cachedMode: ObservationsStoreMode | null = null;
/** When true, getObservationsStore returns the injected test store as-is. */
let testStorePinned = false;

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Production/Vercel always uses Supabase — never data/observations.json
 * (EROFS on /var/task). Local default follows Matrix store gate.
 */
export function getObservationsStoreMode(): ObservationsStoreMode {
  const forced = process.env.OBSERVATIONS_STORE?.trim().toLowerCase();
  if (forced === "memory") return "memory";
  if (forced === "json") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error(
        "OBSERVATIONS_STORE=json is forbidden on Vercel (read-only filesystem)."
      );
    }
    return "json";
  }
  if (forced === "supabase") return "supabase";

  if (isSupabaseMatrixStore()) return "supabase";

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    if (!hasSupabaseEnv()) {
      throw new Error(
        "Observations require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Vercel."
      );
    }
    return "supabase";
  }

  return "json";
}

export function getObservationsStore(): ObservationsStore {
  if (testStorePinned && cachedStore) return cachedStore;
  const mode = getObservationsStoreMode();
  if (cachedStore && cachedMode === mode) return cachedStore;
  cachedMode = mode;
  if (mode === "memory") {
    cachedStore = createMemoryObservationsStore();
  } else if (mode === "supabase") {
    cachedStore = createSupabaseObservationsStore();
  } else {
    cachedStore = createJsonObservationsStore();
  }
  return cachedStore;
}

/** Test helper — inject a store and pin mode. */
export function __setObservationsStoreForTests(
  store: ObservationsStore | null,
  mode: ObservationsStoreMode | null = "memory"
): void {
  cachedStore = store;
  cachedMode = store ? mode : null;
  testStorePinned = store !== null;
}

export {
  assertJsonObservationWritesAllowed,
  createJsonObservationsStore,
  OBSERVATIONS_JSON_PATH,
} from "./json";
export { createMemoryObservationsStore } from "./memory";
export { createSupabaseObservationsStore } from "./supabase";
export type { ObservationsStore } from "./types";
export { observationRowToRecord, observationToRow } from "./mapping";
