import { createSupabaseAdmin } from "../supabase/server";
import type { ScopedAiGrant } from "../scoped-ai-grant-types";
import { grantRowToGrant, grantToRow } from "./mapping";
import type { ScopedAiGrantsStore } from "./types";

export function createSupabaseScopedAiGrantsStore(): ScopedAiGrantsStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.from("scoped_ai_grants").select("*").order("id");
      if (error) {
        throw new Error(`Supabase scoped_ai_grants read failed: ${error.message}`);
      }
      return (data ?? []).map((row) => grantRowToGrant(row as never));
    },
    async upsert(grant) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("scoped_ai_grants")
        .upsert(grantToRow(grant), { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase scoped_ai_grants upsert failed: ${error.message}`);
      }
    },
    async getById(id) {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("scoped_ai_grants")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`Supabase scoped_ai_grants read failed: ${error.message}`);
      }
      return data ? grantRowToGrant(data as never) : undefined;
    },
  };
}
