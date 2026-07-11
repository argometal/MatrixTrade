import { createSupabaseAdmin } from "../supabase/server";
import type { StockThesis } from "../stock-thesis-types";
import { thesisRowToThesis, thesisToRow } from "./mapping";
import type { StockThesesStore } from "./types";

export function createSupabaseStockThesesStore(): StockThesesStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.from("stock_theses").select("*").order("id");
      if (error) {
        throw new Error(`Supabase stock_theses read failed: ${error.message}`);
      }
      return (data ?? []).map((row) => thesisRowToThesis(row as never));
    },
    async upsert(thesis) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("stock_theses")
        .upsert(thesisToRow(thesis), { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase stock_theses upsert failed: ${error.message}`);
      }
    },
    async upsertMany(theses) {
      if (theses.length === 0) return;
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("stock_theses")
        .upsert(theses.map(thesisToRow), { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase stock_theses bulk upsert failed: ${error.message}`);
      }
    },
  };
}
