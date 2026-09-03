import { createSupabaseAdmin } from "../supabase/server";
import { assertMxtPersistenceWriteAllowed } from "../mxt-readonly";
import { mafExperimentRowToRecord, mafExperimentToRow } from "./mapping";
import type { MafExperimentsStore } from "./types";

export function createSupabaseMafExperimentsStore(): MafExperimentsStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("maf_experiments")
        .select("*")
        .order("id");
      if (error) {
        throw new Error(`Supabase maf_experiments read failed: ${error.message}`);
      }
      return (data ?? []).map((row) =>
        mafExperimentRowToRecord(row as never)
      );
    },
    async upsert(row) {
      assertMxtPersistenceWriteAllowed("maf_experiments.upsert");
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("maf_experiments")
        .upsert(mafExperimentToRow(row), { onConflict: "id" });
      if (error) {
        throw new Error(
          `Supabase maf_experiments upsert failed: ${error.message}`
        );
      }
    },
  };
}
