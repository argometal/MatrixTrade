import { createJsonTradesStore } from "./trades-store/json";
import { createSupabaseTradesStore } from "./trades-store/supabase";
import type { TradesStore, TradesStoreMode } from "./trades-store/types";
import type { Trade } from "./types";

export type { TradesStoreMode } from "./trades-store/types";
export {
  stripComputedTradeFields,
  tradeRowToTrade,
  tradeToRow,
} from "./trades-store/mapping";
export {
  compareTradeLists,
  compareTradeShapes,
  normalizeStoredTrade,
} from "./trades-store/compare";
export { readTradesJsonFile } from "./trades-store/json";

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function getTradesStoreMode(): TradesStoreMode {
  const raw = process.env.TRADES_STORE?.trim().toLowerCase();
  if (raw === "supabase" && hasSupabaseEnv()) return "supabase";
  return "json";
}

export function isSupabaseTradesStore(): boolean {
  return getTradesStoreMode() === "supabase";
}

let cachedStore: TradesStore | null = null;
let cachedMode: TradesStoreMode | null = null;

function getTradesStore(): TradesStore {
  const mode = getTradesStoreMode();
  if (cachedStore && cachedMode === mode) {
    return cachedStore;
  }
  cachedMode = mode;
  cachedStore = mode === "supabase" ? createSupabaseTradesStore() : createJsonTradesStore();
  return cachedStore;
}

/** Read all trades from the active store (Supabase when TRADES_STORE=supabase, else JSON file). */
export async function readTradesJson(): Promise<Trade[]> {
  return getTradesStore().readAll();
}

/** Upsert one trade into the active store. Preserves IDs like H001, H002, etc. */
export async function upsertTradeInJson(trade: Trade): Promise<void> {
  return getTradesStore().upsert(trade);
}
