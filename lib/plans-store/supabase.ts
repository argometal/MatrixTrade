import { createSupabaseAdmin } from "../supabase/server";
import { formatPlanId, PlanIdCollisionError } from "../plan-id";
import { planRowToPlan, planToSupabaseRow } from "./mapping";
import type { TradePlan } from "../plan-types";
import type { PlansStore } from "./types";

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  const msg = String(error.message ?? "").toLowerCase();
  return msg.includes("duplicate key") || msg.includes("unique constraint");
}

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
    async allocateNextPlanId() {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.rpc("allocate_trade_plan_id");
      if (error) {
        throw new Error(
          `Supabase allocate_trade_plan_id failed: ${error.message}. ` +
            `Apply migration supabase/trade-plans-plan-id-seq.sql`
        );
      }
      const id = String(data ?? "").trim().toUpperCase();
      if (!id.startsWith("PLAN-")) {
        throw new Error(`allocate_trade_plan_id returned unexpected value: ${data}`);
      }
      return id;
    },
    async insert(plan) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase.from("trade_plans").insert(planToSupabaseRow(plan));
      if (error) {
        if (isUniqueViolation(error)) {
          throw new PlanIdCollisionError(plan.id, error.message);
        }
        throw new Error(`Supabase trade_plans insert failed: ${error.message}`);
      }
    },
  };
}

/** Pure helper for unit tests of format fallback (not used at runtime). */
export function formatAllocatedPlanIdForTests(n: number): string {
  return formatPlanId(n);
}
