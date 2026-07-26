import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonExternalPositionsStore } from "./json";
import { createMemoryExternalPositionsStore } from "./memory";
import { createSupabaseExternalPositionsStore } from "./supabase";
import type {
  ExternalPositionsStore,
  ExternalPositionsStoreMode,
} from "./types";
import type { ExternalPosition } from "../external-position-types";

export type { ExternalPositionsStore, ExternalPositionsStoreMode } from "./types";

let cachedStore: ExternalPositionsStore | null = null;
let cachedMode: ExternalPositionsStoreMode | null = null;
let testStorePinned = false;

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function getExternalPositionsStoreMode(): ExternalPositionsStoreMode {
  const forced = process.env.EXTERNAL_POSITIONS_STORE?.trim().toLowerCase();
  if (forced === "memory") {
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "EXTERNAL_POSITIONS_STORE=memory is allowed only in tests."
      );
    }
    return "memory";
  }
  if (forced === "json") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error(
        "EXTERNAL_POSITIONS_STORE=json is forbidden on Vercel (read-only filesystem)."
      );
    }
    return "json";
  }
  if (forced === "supabase") return "supabase";

  if (isSupabaseMatrixStore()) return "supabase";

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    if (!hasSupabaseEnv()) {
      throw new Error(
        "External Positions require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Vercel."
      );
    }
    return "supabase";
  }

  return "json";
}

export function getExternalPositionsStore(): ExternalPositionsStore {
  if (testStorePinned && cachedStore) return cachedStore;
  const mode = getExternalPositionsStoreMode();
  if (cachedStore && cachedMode === mode) return cachedStore;
  cachedMode = mode;
  if (mode === "memory") {
    cachedStore = createMemoryExternalPositionsStore();
  } else if (mode === "supabase") {
    cachedStore = createSupabaseExternalPositionsStore();
  } else {
    cachedStore = createJsonExternalPositionsStore();
  }
  return cachedStore;
}

export function __setExternalPositionsStoreForTests(
  seedOrStore: ExternalPosition[] | ExternalPositionsStore | null
): void {
  if (seedOrStore === null) {
    cachedStore = null;
    cachedMode = null;
    testStorePinned = false;
    return;
  }
  if (Array.isArray(seedOrStore)) {
    cachedStore = createMemoryExternalPositionsStore(seedOrStore);
    cachedMode = "memory";
    testStorePinned = true;
    return;
  }
  cachedStore = seedOrStore;
  cachedMode = "memory";
  testStorePinned = true;
}

export {
  assertJsonExternalPositionWritesAllowed,
  createJsonExternalPositionsStore,
  EXTERNAL_POSITIONS_JSON_PATH,
  readExternalPositionsJsonFile,
} from "./json";
export { createMemoryExternalPositionsStore } from "./memory";
export { createSupabaseExternalPositionsStore } from "./supabase";
export {
  externalPositionRowToRecord,
  externalPositionToRow,
} from "./mapping";
