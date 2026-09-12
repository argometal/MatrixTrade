/**
 * MXT 035 — technical integrity probe for PLAN-011 / PLAN-012.
 * LOCAL ONLY. Does not mutate.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const ids = ["PLAN-010", "PLAN-011", "PLAN-012"];

async function main() {
  const { data: plans, error } = await sb
    .from("trade_plans")
    .select("id,ticker,stock_thesis_id,linked_trade_id,outcome,playbook_id,layered_entry")
    .in("id", ids);
  if (error) throw error;
  console.log("=== trade_plans ===");
  console.log(JSON.stringify(plans, null, 2));

  const { data: los, error: loe } = await sb
    .from("learning_outcomes")
    .select("id,kind,plan_id,ticker,excluded_from_metrics,trade_id")
    .in("plan_id", ids);
  if (loe) throw loe;
  console.log("=== learning_outcomes ===");
  console.log(JSON.stringify(los, null, 2));

  for (const table of [
    "observations",
    "observation_records",
    "maf_experiments",
    "trades",
    "improvement_hypotheses",
  ] as const) {
    const { data, error: err } = await sb.from(table).select("*").in("plan_id", ids);
    console.log(`=== ${table} ===`, err ? `ERR ${err.message}` : JSON.stringify(data ?? []));
  }

  // Market reality windows may live in storage bucket / json — try table if present
  const { data: mrw, error: mre } = await sb
    .from("market_reality_case_windows")
    .select("id,plan_id")
    .in("plan_id", ids);
  console.log(
    "=== market_reality_case_windows ===",
    mre ? `ERR ${mre.message}` : JSON.stringify(mrw ?? [])
  );

  const { data: t0, error: t0e } = await sb
    .from("thesis_t0_freezes")
    .select("id,plan_ids,stock_thesis_id");
  if (t0e) {
    console.log("=== thesis_t0_freezes ===", `ERR ${t0e.message}`);
  } else {
    const hits = (t0 ?? []).filter((row) => {
      const planIds = Array.isArray(row.plan_ids) ? row.plan_ids : [];
      return planIds.some((id: string) => ids.includes(String(id).toUpperCase()));
    });
    console.log("=== thesis_t0_freezes hits ===", JSON.stringify(hits, null, 2));
  }

  const { data: nflx } = await sb.from("trade_plans").select("id").eq("ticker", "NFLX");
  console.log(
    "=== NFLX plan ids ===",
    (nflx ?? []).map((r) => r.id).sort()
  );

  // Shared object safety: ST-NFLX-001 must remain if other plans use it
  const { data: shared } = await sb
    .from("trade_plans")
    .select("id")
    .eq("stock_thesis_id", "ST-NFLX-001");
  console.log(
    "=== ST-NFLX-001 plan refs ===",
    (shared ?? []).map((r) => r.id).sort()
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
