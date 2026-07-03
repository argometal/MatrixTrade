import { createSupabaseAdmin } from "../supabase/server";
import { tradeRowToTrade, tradeToRow } from "./mapping";
import type { TradesStore } from "./types";

export function createSupabaseTradesStore(): TradesStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.from("trades").select("*").order("id");
      if (error) {
        throw new Error(`Supabase trades read failed: ${error.message}`);
      }
      return (data ?? []).map((row) => tradeRowToTrade(row));
    },
    async upsert(trade) {
      const supabase = createSupabaseAdmin();
      const row = tradeToRow(trade);
      const { error } = await supabase.from("trades").upsert(row, { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase trades upsert failed: ${error.message}`);
      }
    },
  };
}
