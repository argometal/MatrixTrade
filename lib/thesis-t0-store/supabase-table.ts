import { createSupabaseAdmin } from "../supabase/server";
import { assertMxtPersistenceWriteAllowed } from "../mxt-readonly";
import type { ThesisT0Freeze } from "../thesis-t0-types";
import { freezeToRow, rowToFreeze, type ThesisT0FreezeRow } from "./mapping";
import type { ThesisT0Store } from "./types";

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const msg = String(error.message ?? "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("does not exist");
}

/**
 * Relational T0 store (preferred). Throws with code MISSING_TABLE when
 * supabase/thesis-t0-freezes.sql has not been applied yet.
 */
export function createSupabaseTableThesisT0Store(): ThesisT0Store {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("thesis_t0_freezes")
        .select("*")
        .order("id");
      if (error) {
        if (isMissingTable(error)) {
          const err = new Error("thesis_t0_freezes table missing");
          (err as Error & { code: string }).code = "MISSING_TABLE";
          throw err;
        }
        throw new Error(`Supabase thesis_t0_freezes read failed: ${error.message}`);
      }
      return (data ?? []).map((row) => rowToFreeze(row as ThesisT0FreezeRow));
    },
    async getById(id) {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("thesis_t0_freezes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (isMissingTable(error)) {
          const err = new Error("thesis_t0_freezes table missing");
          (err as Error & { code: string }).code = "MISSING_TABLE";
          throw err;
        }
        throw new Error(`Supabase thesis_t0_freezes getById failed: ${error.message}`);
      }
      return data ? rowToFreeze(data as ThesisT0FreezeRow) : null;
    },
    async findOpenByStockThesisId(stockThesisId) {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("thesis_t0_freezes")
        .select("*")
        .eq("stock_thesis_id", stockThesisId)
        .eq("status", "open")
        .maybeSingle();
      if (error) {
        if (isMissingTable(error)) {
          const err = new Error("thesis_t0_freezes table missing");
          (err as Error & { code: string }).code = "MISSING_TABLE";
          throw err;
        }
        throw new Error(
          `Supabase thesis_t0_freezes findOpen failed: ${error.message}`
        );
      }
      return data ? rowToFreeze(data as ThesisT0FreezeRow) : null;
    },
    async insert(row) {
      assertMxtPersistenceWriteAllowed("thesis_t0_freezes.insert");
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("thesis_t0_freezes")
        .insert(freezeToRow(row));
      if (error) {
        if (isMissingTable(error)) {
          const err = new Error("thesis_t0_freezes table missing");
          (err as Error & { code: string }).code = "MISSING_TABLE";
          throw err;
        }
        throw new Error(`Supabase thesis_t0_freezes insert failed: ${error.message}`);
      }
    },
    async upsert(row: ThesisT0Freeze) {
      assertMxtPersistenceWriteAllowed("thesis_t0_freezes.upsert");
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("thesis_t0_freezes")
        .upsert(freezeToRow(row), { onConflict: "id" });
      if (error) {
        if (isMissingTable(error)) {
          const err = new Error("thesis_t0_freezes table missing");
          (err as Error & { code: string }).code = "MISSING_TABLE";
          throw err;
        }
        throw new Error(`Supabase thesis_t0_freezes upsert failed: ${error.message}`);
      }
    },
  };
}
