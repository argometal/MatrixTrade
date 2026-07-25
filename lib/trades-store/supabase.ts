import { createSupabaseAdmin } from "../supabase/server";
import {
  isMissingDateCorrectionColumnError,
  isMissingLearningColumnError,
  isMissingLegacyAbsenceColumnError,
  tradeRowToTrade,
  tradeToRow,
  tradeToRowCoreOnly,
  tradeToRowWithoutDateCorrectionColumns,
  tradeToRowWithoutLearningExtensions,
  tradeToRowWithoutLegacyAbsenceColumns,
} from "./mapping";
import type { TradesStore } from "./types";

function stripDateCorrection<T extends Record<string, unknown>>(row: T): T {
  const {
    dates_reconstructed: _dr,
    date_correction_note: _dn,
    date_correction_audit: _da,
    ...rest
  } = row;
  return rest as T;
}

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
      const { error } = await supabase
        .from("trades")
        .upsert(tradeToRow(trade), { onConflict: "id" });
      if (!error) return;

      let msg = error.message;
      let workingRow: Record<string, unknown> = tradeToRow(trade) as unknown as Record<
        string,
        unknown
      >;

      if (isMissingDateCorrectionColumnError(msg)) {
        workingRow = stripDateCorrection(workingRow);
        const { error: retryDates } = await supabase
          .from("trades")
          .upsert(workingRow, { onConflict: "id" });
        if (!retryDates) {
          console.warn(
            "[trades-store] Upserted without date_correction_* columns. " +
              "Run supabase/trade-date-correction.sql in Supabase SQL Editor."
          );
          return;
        }
        msg = retryDates.message;
      }

      if (isMissingLegacyAbsenceColumnError(msg)) {
        const reduced = stripDateCorrection(
          tradeToRowWithoutLegacyAbsenceColumns(trade) as unknown as Record<string, unknown>
        );
        const { error: retryLegacy } = await supabase
          .from("trades")
          .upsert(reduced, { onConflict: "id" });
        if (!retryLegacy) {
          console.warn(
            "[trades-store] Upserted without plan_id / historically_absent. " +
              "Run supabase/trade-legacy-absence.sql in Supabase SQL Editor."
          );
          return;
        }
        msg = retryLegacy.message;
      }

      if (isMissingLearningColumnError(msg)) {
        const reduced = stripDateCorrection(
          tradeToRowWithoutLearningExtensions(trade) as unknown as Record<string, unknown>
        );
        const { error: retryLearning } = await supabase
          .from("trades")
          .upsert(reduced, { onConflict: "id" });
        if (!retryLearning) {
          console.warn(
            "[trades-store] Upserted without loss_classification/post_stop_study. " +
              "Run supabase/trade-learning-extensions.sql in Supabase SQL Editor."
          );
          return;
        }
        const core = stripDateCorrection(
          tradeToRowCoreOnly(trade) as unknown as Record<string, unknown>
        );
        const { error: coreError } = await supabase
          .from("trades")
          .upsert(core, { onConflict: "id" });
        if (!coreError) {
          console.warn(
            "[trades-store] Upserted core trade only. Run pending supabase/*.sql migrations."
          );
          return;
        }
        throw new Error(`Supabase trades upsert failed: ${coreError.message}`);
      }

      throw new Error(`Supabase trades upsert failed: ${msg}`);
    },
  };
}
