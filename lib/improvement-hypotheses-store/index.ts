/**
 * MXT 028 — Improvement Hypotheses store gate.
 *
 * Follows MAF experiments Matrix store convention:
 * - Vercel / supabase Matrix → Supabase `improvement_hypotheses`
 * - Local default → JSON
 * - Tests → memory
 */
import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonImprovementHypothesesStore } from "./json";
import { createMemoryImprovementHypothesesStore } from "./memory";
import { createSupabaseImprovementHypothesesStore } from "./supabase";
import type {
  ImprovementHypothesesStore,
  ImprovementHypothesesStoreMode,
} from "./types";
import type { ImprovementHypothesis } from "../improvement-hypothesis-types";

export type {
  ImprovementHypothesesStore,
  ImprovementHypothesesStoreMode,
} from "./types";

let cachedStore: ImprovementHypothesesStore | null = null;
let cachedMode: ImprovementHypothesesStoreMode | null = null;
let testStorePinned = false;

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Production/Vercel always uses Supabase — never data/improvement-hypotheses.json
 * (EROFS on /var/task). Local default follows Matrix store gate.
 */
export function getImprovementHypothesesStoreMode(): ImprovementHypothesesStoreMode {
  const forced = process.env.IMPROVEMENT_HYPOTHESES_STORE?.trim().toLowerCase();
  if (forced === "memory") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error(
        "IMPROVEMENT_HYPOTHESES_STORE=memory is forbidden on Vercel."
      );
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "IMPROVEMENT_HYPOTHESES_STORE=memory is forbidden in production."
      );
    }
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "IMPROVEMENT_HYPOTHESES_STORE=memory is allowed only in tests."
      );
    }
    return "memory";
  }
  if (forced === "json") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error(
        "IMPROVEMENT_HYPOTHESES_STORE=json is forbidden on Vercel (read-only filesystem)."
      );
    }
    return "json";
  }
  if (forced === "supabase") return "supabase";

  if (isSupabaseMatrixStore()) return "supabase";

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    if (!hasSupabaseEnv()) {
      throw new Error(
        "Improvement Hypotheses require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Vercel."
      );
    }
    return "supabase";
  }

  return "json";
}

export function getImprovementHypothesesStore(): ImprovementHypothesesStore {
  if (testStorePinned && cachedStore) return cachedStore;
  const mode = getImprovementHypothesesStoreMode();
  if (cachedStore && cachedMode === mode) return cachedStore;
  cachedMode = mode;
  if (mode === "memory") {
    cachedStore = createMemoryImprovementHypothesesStore();
  } else if (mode === "supabase") {
    cachedStore = createSupabaseImprovementHypothesesStore();
  } else {
    cachedStore = createJsonImprovementHypothesesStore();
  }
  return cachedStore;
}

export function __setImprovementHypothesesStoreForTests(
  seedOrStore: ImprovementHypothesis[] | ImprovementHypothesesStore | null,
  mode: ImprovementHypothesesStoreMode | null = "memory"
): void {
  if (seedOrStore === null) {
    cachedStore = null;
    cachedMode = null;
    testStorePinned = false;
    return;
  }
  if (Array.isArray(seedOrStore)) {
    cachedStore = createMemoryImprovementHypothesesStore(seedOrStore);
    cachedMode = "memory";
    testStorePinned = true;
    return;
  }
  cachedStore = seedOrStore;
  cachedMode = mode ?? "memory";
  testStorePinned = true;
}

export {
  assertJsonImprovementHypothesisWritesAllowed,
  createJsonImprovementHypothesesStore,
  IMPROVEMENT_HYPOTHESES_JSON_PATH,
  readImprovementHypothesesJsonFile,
} from "./json";
export { createMemoryImprovementHypothesesStore } from "./memory";
export { createSupabaseImprovementHypothesesStore } from "./supabase";
export {
  improvementHypothesisRowToRecord,
  improvementHypothesisToRow,
  type ImprovementHypothesisRow,
} from "./mapping";
export {
  MXT_IH_STORAGE_BUCKET,
  __resetImprovementHypothesesTableProbeForTests,
} from "./supabase";
