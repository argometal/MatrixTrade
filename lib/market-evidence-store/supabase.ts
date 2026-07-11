import { createSupabaseAdmin } from "../supabase/server";
import { evidenceRowToEvidence, evidenceToRow } from "./mapping";
import type { MarketEvidenceStore } from "./types";

export function createSupabaseMarketEvidenceStore(): MarketEvidenceStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.from("market_evidence").select("*").order("id");
      if (error) {
        throw new Error(`Supabase market_evidence read failed: ${error.message}`);
      }
      return (data ?? []).map((row) => evidenceRowToEvidence(row as never));
    },
    async append(evidence) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase.from("market_evidence").insert(evidenceToRow(evidence));
      if (error) {
        throw new Error(`Supabase market_evidence insert failed: ${error.message}`);
      }
    },
    async upsert(evidence) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("market_evidence")
        .upsert(evidenceToRow(evidence), { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase market_evidence upsert failed: ${error.message}`);
      }
    },
  };
}
