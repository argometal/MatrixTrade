/**
 * Verify Scout Plan ID allocator RPC before deploying app code that creates plans.
 *
 * Deploy order (TRADES_STORE=supabase):
 *   1) Run supabase/trade-plans-plan-id-seq.sql
 *   2) npm run verify:plan-id-rpc   ← this script
 *   3) Deploy application
 *
 * Fail-closed: no max+1 fallback. Missing/broken RPC exits 1.
 * Live probe burns one sequence value (gap OK).
 *
 * Usage:
 *   npm run verify:plan-id-rpc
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createSupabaseAdmin } from "../lib/supabase/server";
import { isCanonicalPlanId } from "../lib/plan-id";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
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
}

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function pass(msg: string): void {
  console.log(`PASS: ${msg}`);
}

async function main(): Promise<void> {
  loadEnvLocal();

  const migPath = resolve(process.cwd(), "supabase/trade-plans-plan-id-seq.sql");
  if (!existsSync(migPath)) fail("missing supabase/trade-plans-plan-id-seq.sql");
  const mig = readFileSync(migPath, "utf8");
  if (!mig.includes("allocate_trade_plan_id")) {
    fail("migration missing allocate_trade_plan_id");
  }
  if (!/\^PLAN-\[0-9\]\+\$/.test(mig)) {
    fail("migration CHECK must be ^PLAN-[0-9]+$");
  }
  if (!mig.includes("DEPLOYMENT ORDER")) {
    fail("migration missing DEPLOYMENT ORDER documentation");
  }
  pass("migration file present with deploy-order + allocator");

  const storeSrc = readFileSync(
    resolve(process.cwd(), "lib/plans-store/supabase.ts"),
    "utf8"
  );
  const allocFn = storeSrc.slice(
    storeSrc.indexOf("async allocateNextPlanId"),
    storeSrc.indexOf("async insert")
  );
  if (!allocFn.includes('rpc("allocate_trade_plan_id")')) {
    fail("supabase store allocateNextPlanId must call allocate_trade_plan_id RPC");
  }
  if (/nextPlanId|maxPlanIdNumber|padStart/.test(allocFn)) {
    fail("supabase allocateNextPlanId must not fall back to max+1 helpers");
  }
  if (!allocFn.includes("fail-closed") && !allocFn.includes("FAIL-CLOSED")) {
    fail("supabase allocateNextPlanId must document fail-closed behavior");
  }
  pass("app allocateNextPlanId is fail-closed (RPC only; no max+1 fallback)");

  if (!process.env.SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.log(
      "SKIP: live RPC probe (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). " +
        "Static checks passed — still run SQL verify in Supabase before deploy."
    );
    process.exit(0);
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("allocate_trade_plan_id");
  if (error) {
    fail(
      `allocate_trade_plan_id RPC failed: ${error.message}. ` +
        `Run supabase/trade-plans-plan-id-seq.sql before deploying app code.`
    );
  }
  const id = String(data ?? "").trim().toUpperCase();
  if (!isCanonicalPlanId(id)) {
    fail(`RPC returned non-canonical id: ${data}`);
  }
  pass(`live RPC allocate_trade_plan_id → ${id} (one sequence value burned; gap OK)`);
  console.log("OK — migration path verified. Safe to deploy application.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
