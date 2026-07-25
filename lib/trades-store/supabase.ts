import { createSupabaseAdmin } from "../supabase/server";
import {
  isMissingLearningColumnError,
  isMissingLegacyAbsenceColumnError,
  tradeRowToTrade,
  tradeToRow,
  tradeToRowCoreOnly,
  tradeToRowWithoutLearningExtensions,
  tradeToRowWithoutLegacyAbsenceColumns,
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
      // tradeToRow never writes __legacy_none__ / __LEGACY_NONE__ into FK columns.
      const { error } = await supabase
        .from("trades")
        .upsert(tradeToRow(trade), { onConflict: "id" });
      if (!error) return;

      const msg = error.message;

      if (isMissingLegacyAbsenceColumnError(msg)) {
        const { error: retryLegacy } = await supabase
          .from("trades")
          .upsert(tradeToRowWithoutLegacyAbsenceColumns(trade), { onConflict: "id" });
        if (!retryLegacy) {
          console.warn(
            "[trades-store] Upserted without plan_id / historically_absent. " +
              "Run supabase/trade-legacy-absence.sql in Supabase SQL Editor."
          );
          return;
        }
        if (isMissingLearningColumnError(retryLegacy.message)) {
          const { error: coreError } = await supabase
            .from("trades")
            .upsert(tradeToRowCoreOnly(trade), { onConflict: "id" });
          if (!coreError) {
            console.warn(
              "[trades-store] Upserted core trade only. Run trade-legacy-absence.sql + trade-learning-extensions.sql."
            );
            return;
          }
          throw new Error(`Supabase trades upsert failed: ${coreError.message}`);
        }
        throw new Error(`Supabase trades upsert failed: ${retryLegacy.message}`);
      }

      if (isMissingLearningColumnError(msg)) {
        const { error: retryLearning } = await supabase
          .from("trades")
          .upsert(tradeToRowWithoutLearningExtensions(trade), { onConflict: "id" });
        if (!retryLearning) {
          console.warn(
            "[trades-store] Upserted without loss_classification/post_stop_study. " +
              "Run supabase/trade-learning-extensions.sql in Supabase SQL Editor."
          );
          return;
        }
        throw new Error(`Supabase trades upsert failed: ${retryLearning.message}`);
      }

      throw new Error(`Supabase trades upsert failed: ${msg}`);
    },
  };
}
