import { createSupabaseAdmin } from "../supabase/server";
import {
  isMissingLearningColumnError,
  tradeRowToTrade,
  tradeToRow,
  tradeToRowWithoutLearningExtensions,
} from "./mapping";
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
      if (!error) return;

      // Prod may not have run trade-learning-extensions.sql yet — retry core fields only.
      if (isMissingLearningColumnError(error.message)) {
        const baseRow = tradeToRowWithoutLearningExtensions(trade);
        const { error: retryError } = await supabase
          .from("trades")
          .upsert(baseRow, { onConflict: "id" });
        if (!retryError) {
          console.warn(
            "[trades-store] Upserted without loss_classification/post_stop_study. " +
              "Run supabase/trade-learning-extensions.sql in Supabase SQL Editor."
          );
          return;
        }
        throw new Error(`Supabase trades upsert failed: ${retryError.message}`);
      }

      throw new Error(`Supabase trades upsert failed: ${error.message}`);
    },
  };
}
