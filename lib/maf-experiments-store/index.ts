import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonMafExperimentsStore } from "./json";
import { createMemoryMafExperimentsStore } from "./memory";
import { createSupabaseMafExperimentsStore } from "./supabase";
import type { MafExperimentsStore, MafExperimentsStoreMode } from "./types";
import type { MafExperiment } from "../maf-types";

export type { MafExperimentsStore, MafExperimentsStoreMode } from "./types";

let cachedStore: MafExperimentsStore | null = null;
let cachedMode: MafExperimentsStoreMode | null = null;
/** When true, getMafExperimentsStore returns the injected test store as-is. */
let testStorePinned = false;

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Production/Vercel always uses Supabase — never data/maf-experiments.json
 * (EROFS on /var/task). Local default follows Matrix store gate.
 */
export function getMafExperimentsStoreMode(): MafExperimentsStoreMode {
  const forced = process.env.MAF_EXPERIMENTS_STORE?.trim().toLowerCase();
  if (forced === "memory") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error("MAF_EXPERIMENTS_STORE=memory is forbidden on Vercel.");
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MAF_EXPERIMENTS_STORE=memory is forbidden in production."
      );
    }
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "MAF_EXPERIMENTS_STORE=memory is allowed only in tests."
      );
    }
    return "memory";
  }
  if (forced === "json") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error(
        "MAF_EXPERIMENTS_STORE=json is forbidden on Vercel (read-only filesystem)."
      );
    }
    return "json";
  }
  if (forced === "supabase") return "supabase";

  if (isSupabaseMatrixStore()) return "supabase";

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    if (!hasSupabaseEnv()) {
      throw new Error(
        "MAF experiments require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Vercel."
      );
    }
    return "supabase";
  }

  return "json";
}

export function getMafExperimentsStore(): MafExperimentsStore {
  if (testStorePinned && cachedStore) return cachedStore;
  const mode = getMafExperimentsStoreMode();
  if (cachedStore && cachedMode === mode) return cachedStore;
  cachedMode = mode;
  if (mode === "memory") {
    cachedStore = createMemoryMafExperimentsStore();
  } else if (mode === "supabase") {
    cachedStore = createSupabaseMafExperimentsStore();
  } else {
    cachedStore = createJsonMafExperimentsStore();
  }
  return cachedStore;
}

/**
 * Test helper — inject memory seed array or a store; null clears override.
 */
export function __setMafExperimentsStoreForTests(
  seedOrStore: MafExperiment[] | MafExperimentsStore | null,
  mode: MafExperimentsStoreMode | null = "memory"
): void {
  if (seedOrStore === null) {
    cachedStore = null;
    cachedMode = null;
    testStorePinned = false;
    return;
  }
  if (Array.isArray(seedOrStore)) {
    cachedStore = createMemoryMafExperimentsStore(seedOrStore);
    cachedMode = "memory";
    testStorePinned = true;
    return;
  }
  cachedStore = seedOrStore;
  cachedMode = mode ?? "memory";
  testStorePinned = true;
}

export {
  assertJsonMafExperimentWritesAllowed,
  createJsonMafExperimentsStore,
  MAF_EXPERIMENTS_JSON_PATH,
  readMafExperimentsJsonFile,
} from "./json";
export { createMemoryMafExperimentsStore } from "./memory";
export { createSupabaseMafExperimentsStore } from "./supabase";
export {
  mafExperimentRowToRecord,
  mafExperimentToRow,
  type MafExperimentRow,
} from "./mapping";
