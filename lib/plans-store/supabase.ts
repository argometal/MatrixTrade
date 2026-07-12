import { createSupabaseAdmin } from "../supabase/server";
import { planRowToPlan, planToSupabaseRow } from "./mapping";
import type { TradePlan } from "../plan-types";
import type { PlansStore } from "./types";

export function createSupabasePlansStore(): PlansStore {
  return {
    async readAll() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.from("trade_plans").select("*").order("id");
      if (error) {
        throw new Error(`Supabase trade_plans read failed: ${error.message}`);
      }
      return (data ?? []).map((row) => planRowToPlan(row as never));
    },
    async upsert(plan) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("trade_plans")
        .upsert(planToSupabaseRow(plan), { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase trade_plans upsert failed: ${error.message}`);
      }
    },
    async upsertMany(plans) {
      if (plans.length === 0) return;
      const supabase = createSupabaseAdmin();
      const { error } = await supabase
        .from("trade_plans")
        .upsert(plans.map(planToSupabaseRow), { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase trade_plans bulk upsert failed: ${error.message}`);
      }
    },
  };
}
