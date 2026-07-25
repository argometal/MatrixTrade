import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonLearningOutcomesStore } from "./json";
import { createMemoryLearningOutcomesStore } from "./memory";
import { createSupabaseLearningOutcomesStore } from "./supabase";
import type { LearningOutcomesStore, LearningOutcomesStoreMode } from "./types";
import type { LearningOutcome } from "../learning-outcome-types";

export type { LearningOutcomesStore, LearningOutcomesStoreMode } from "./types";

let cachedStore: LearningOutcomesStore | null = null;
let cachedMode: LearningOutcomesStoreMode | null = null;
/** When true, getLearningOutcomesStore returns the injected test store as-is. */
let testStorePinned = false;

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Production/Vercel always uses Supabase — never data/learning-outcomes.json
 * (EROFS on /var/task). Local default follows Matrix store gate.
 */
export function getLearningOutcomesStoreMode(): LearningOutcomesStoreMode {
  const forced = process.env.LEARNING_OUTCOMES_STORE?.trim().toLowerCase();
  if (forced === "memory") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error(
        "LEARNING_OUTCOMES_STORE=memory is forbidden on Vercel."
      );
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "LEARNING_OUTCOMES_STORE=memory is forbidden in production."
      );
    }
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "LEARNING_OUTCOMES_STORE=memory is allowed only in tests."
      );
    }
    return "memory";
  }
  if (forced === "json") {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error(
        "LEARNING_OUTCOMES_STORE=json is forbidden on Vercel (read-only filesystem)."
      );
    }
    return "json";
  }
  if (forced === "supabase") return "supabase";

  if (isSupabaseMatrixStore()) return "supabase";

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    if (!hasSupabaseEnv()) {
      throw new Error(
        "Learning Outcomes require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Vercel."
      );
    }
    return "supabase";
  }

  return "json";
}

export function getLearningOutcomesStore(): LearningOutcomesStore {
  if (testStorePinned && cachedStore) return cachedStore;
  const mode = getLearningOutcomesStoreMode();
  if (cachedStore && cachedMode === mode) return cachedStore;
  cachedMode = mode;
  if (mode === "memory") {
    cachedStore = createMemoryLearningOutcomesStore();
  } else if (mode === "supabase") {
    cachedStore = createSupabaseLearningOutcomesStore();
  } else {
    cachedStore = createJsonLearningOutcomesStore();
  }
  return cachedStore;
}

/**
 * Test helper — inject memory seed array or a store; null clears override.
 * Backward compatible with prior `__setLearningOutcomeStoreForTests([])` API.
 */
export function __setLearningOutcomesStoreForTests(
  seedOrStore: LearningOutcome[] | LearningOutcomesStore | null,
  mode: LearningOutcomesStoreMode | null = "memory"
): void {
  if (seedOrStore === null) {
    cachedStore = null;
    cachedMode = null;
    testStorePinned = false;
    return;
  }
  if (Array.isArray(seedOrStore)) {
    cachedStore = createMemoryLearningOutcomesStore(seedOrStore);
    cachedMode = "memory";
    testStorePinned = true;
    return;
  }
  cachedStore = seedOrStore;
  cachedMode = mode ?? "memory";
  testStorePinned = true;
}

export {
  assertJsonLearningOutcomeWritesAllowed,
  createJsonLearningOutcomesStore,
  LEARNING_OUTCOMES_JSON_PATH,
  readLearningOutcomesJsonFile,
} from "./json";
export { createMemoryLearningOutcomesStore } from "./memory";
export { createSupabaseLearningOutcomesStore } from "./supabase";
export {
  learningOutcomeRowToRecord,
  learningOutcomeToRow,
  type LearningOutcomeRow,
} from "./mapping";
export {
  assertSameLearningOutcomeIdentity,
  assertValidLearningOutcomeTimestamps,
  checkLearningOutcomeIdentity,
  compareLearningOutcomeFreshness,
  isValidLearningOutcomeTimestamp,
  mergeCanonicalLearningOutcome,
  mergeEqualTimestampLinks,
  resolveLearningOutcomeUpsert,
  validateLearningOutcomeTimestamps,
  type IdentityCheckResult,
  type LearningOutcomeFreshness,
  type TimestampValidationResult,
} from "./merge";
export {
  decideMigrationAction,
  matchRemoteCanonical,
  type MigrateAction,
  type MigrateMatchType,
  type MigrationDecision,
  type RemoteCanonicalMatch,
} from "./migrate-policy";
