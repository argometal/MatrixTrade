import type { Trade } from "../types";

export type TradesStoreMode = "json" | "supabase";

export interface TradesStore {
  readAll(): Promise<Trade[]>;
  upsert(trade: Trade): Promise<void>;
}
