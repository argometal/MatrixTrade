import { createSupabaseAdmin } from "../supabase/server";
import { observationRowToRecord, observationToRow } from "./mapping";
import type { ObservationsStore } from "./types";

export function createSupabaseObservationsStore(): ObservationsStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .order("id");
      if (error) {
        throw new Error(`Supabase observations read failed: ${error.message}`);
      }
      return (data ?? []).map((row) =>
        observationRowToRecord(row as never)
      );
    },
    async upsert(row) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("observations")
        .upsert(observationToRow(row), { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase observations upsert failed: ${error.message}`);
      }
    },
  };
}
