import { createSupabaseAdmin } from "../supabase/server";
import type { AppliedImportRecord, AppliedImportResult, AppliedImportStore } from "./types";

interface Row {
  fingerprint: string;
  applied_at: string;
  result: AppliedImportResult;
}

function rowToRecord(row: Row): AppliedImportRecord {
  return {
    fingerprint: row.fingerprint,
    appliedAt: row.applied_at,
    result: row.result,
  };
}

export function createSupabaseAppliedImportStore(): AppliedImportStore {
  return {
    async findByFingerprint(fingerprint) {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("applied_import_fingerprints")
        .select("*")
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      if (error) {
        if (error.code === "42P01") return null;
        throw new Error(`applied_import_fingerprints read failed: ${error.message}`);
      }
      if (!data) return null;
      return rowToRecord(data as Row);
    },
    async record(fingerprint, result) {
      const supabase = createSupabaseAdmin();
      const existing = await this.findByFingerprint(fingerprint);
      if (existing) return existing;

      const { data, error } = await supabase
        .from("applied_import_fingerprints")
        .insert({
          fingerprint,
          result,
        })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          const again = await this.findByFingerprint(fingerprint);
          if (again) return again;
        }
        if (error.code === "42P01") {
          throw new Error(
            "applied_import_fingerprints table missing. Run supabase/applied-import-fingerprints.sql."
          );
        }
        throw new Error(`applied_import_fingerprints insert failed: ${error.message}`);
      }
      return rowToRecord(data as Row);
    },
  };
}
