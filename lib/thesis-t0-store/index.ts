import { isSupabaseTradesStore } from "../trades-json";
import { createJsonThesisT0Store } from "./json";
import { createMemoryThesisT0Store } from "./memory";
import { createSupabaseThesisT0Store } from "./supabase";
import type { ThesisT0Store, ThesisT0StoreMode } from "./types";

export type { ThesisT0Store, ThesisT0StoreMode } from "./types";
export { createMemoryThesisT0Store } from "./memory";
export { createJsonThesisT0Store } from "./json";
export { createSupabaseThesisT0Store } from "./supabase";

let cachedStore: ThesisT0Store | null = null;
let cachedMode: ThesisT0StoreMode | null = null;
let testStorePinned = false;

export function getThesisT0StoreMode(): ThesisT0StoreMode {
  const forced = process.env.THESIS_T0_STORE?.trim().toLowerCase();
  if (forced === "memory") return "memory";
  if (forced === "json") return "json";
  if (forced === "supabase") return "supabase";
  if (process.env.NODE_ENV === "test") return "memory";
  if (isSupabaseTradesStore()) return "supabase";
  return "json";
}

export function getThesisT0Store(): ThesisT0Store {
  if (testStorePinned && cachedStore) return cachedStore;
  const mode = getThesisT0StoreMode();
  if (cachedStore && cachedMode === mode) return cachedStore;
  cachedMode = mode;
  if (mode === "memory") {
    cachedStore = createMemoryThesisT0Store();
  } else if (mode === "supabase") {
    cachedStore = createSupabaseThesisT0Store();
  } else {
    cachedStore = createJsonThesisT0Store();
  }
  return cachedStore;
}

/** Test helper — pin an in-memory store. */
export function setThesisT0StoreForTests(store: ThesisT0Store | null): void {
  if (store) {
    cachedStore = store;
    cachedMode = "memory";
    testStorePinned = true;
  } else {
    cachedStore = null;
    cachedMode = null;
    testStorePinned = false;
  }
}
