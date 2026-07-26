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
      return this.upsertIfRevision(row, row.revision);
    },
    async upsertIfRevision(row, expectedRevision) {
      const supabase = createSupabaseAdmin();
      const { data: existing, error: readErr } = await supabase
        .from("external_positions")
        .select("*")
        .eq("id", row.id.toUpperCase())
        .maybeSingle();
      if (readErr) {
        throw new Error(
          `Supabase external_positions read failed: ${readErr.message}`
        );
      }
      if (existing) {
        const current = externalPositionRowToRecord(existing as never);
        if (current.revision !== expectedRevision) {
          throw new Error(
            `external_position_revision_conflict ${row.id}: expected ${expectedRevision}, found ${current.revision}`
          );
        }
      } else if (expectedRevision !== 0 && expectedRevision !== row.revision) {
        // allow create
      }

      const next = {
        ...row,
        experimentEligible: false as const,
        scoutLinked: false as const,
        revision: existing
          ? externalPositionRowToRecord(existing as never).revision + 1
          : 1,
      };
      const payload = externalPositionToRow(next);
      const { error } = await supabase
        .from("external_positions")
        .upsert(payload, { onConflict: "id" });
      if (error) {
        throw new Error(
          `Supabase external_positions upsert failed: ${error.message}`
        );
      }
      const { data, error: reloadErr } = await supabase
        .from("external_positions")
        .select("*")
        .eq("id", payload.id)
        .maybeSingle();
      if (reloadErr) {
        throw new Error(
          `Supabase external_positions reload failed: ${reloadErr.message}`
        );
      }
      return data
        ? externalPositionRowToRecord(data as never)
        : next;
    },
  };
}
