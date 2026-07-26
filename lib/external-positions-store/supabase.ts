import { createSupabaseAdmin } from "../supabase/server";
import {
  externalPositionRowToRecord,
  externalPositionToRow,
} from "./mapping";
import type { ExternalPositionsStore } from "./types";

export function createSupabaseExternalPositionsStore(): ExternalPositionsStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("external_positions")
        .select("*")
        .order("id");
      if (error) {
        throw new Error(
          `Supabase external_positions read failed: ${error.message}`
        );
      }
      return (data ?? []).map((row) =>
        externalPositionRowToRecord(row as never)
      );
    },
    async upsert(row) {
      const supabase = createSupabaseAdmin();
      const payload = externalPositionToRow({
        ...row,
        experimentEligible: false,
        scoutLinked: false,
      });
      const { error } = await supabase
        .from("external_positions")
        .upsert(payload, { onConflict: "id" });
      if (error) {
        throw new Error(
          `Supabase external_positions upsert failed: ${error.message}`
        );
      }
      const { data, error: readErr } = await supabase
        .from("external_positions")
        .select("*")
        .eq("id", payload.id)
        .maybeSingle();
      if (readErr) {
        throw new Error(
          `Supabase external_positions reload failed: ${readErr.message}`
        );
      }
      return data
        ? externalPositionRowToRecord(data as never)
        : {
            ...row,
            experimentEligible: false as const,
            scoutLinked: false as const,
          };
    },
  };
}
