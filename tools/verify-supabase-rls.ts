/**
 * Verify public tables have Row Level Security enabled
 * (Supabase Advisor: rls_disabled_in_public).
 *
 * Prerequisites:
 *   1. Run supabase/rls-lockdown-public.sql in Supabase SQL Editor
 *   2. .env.local has SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx tools/verify-supabase-rls.ts
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createSupabaseAdmin } from "../lib/supabase/server";

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

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail?: string): never {
  console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

async function main(): Promise<void> {
  loadEnvLocal();

  const sqlPath = resolve(process.cwd(), "supabase/rls-lockdown-public.sql");
  if (!existsSync(sqlPath)) fail("missing supabase/rls-lockdown-public.sql");
  const sql = readFileSync(sqlPath, "utf8").toLowerCase();
  if (!sql.includes("enable row level security")) {
    fail("rls-lockdown-public.sql missing ENABLE ROW LEVEL SECURITY");
  }
  if (!sql.includes("revoke all") || !sql.includes("anon")) {
    fail("rls-lockdown-public.sql missing REVOKE from anon");
  }
  pass("rls-lockdown-public.sql present with lockdown pattern");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("SKIP: live audit (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
    return;
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("matrixtrade_rls_audit");
  if (error) {
    fail(
      "matrixtrade_rls_audit RPC",
      `${error.message} — run supabase/rls-lockdown-public.sql in SQL Editor first`
    );
  }

  const rows = (data ?? []) as Array<{ table_name: string; rls_enabled: boolean }>;
  if (rows.length === 0) {
    fail("audit returned no public tables");
  }

  const open = rows.filter((r) => !r.rls_enabled);
  for (const row of rows) {
    console.log(`  ${row.rls_enabled ? "RLS" : "OPEN"}  ${row.table_name}`);
  }

  if (open.length > 0) {
    fail(
      "tables without RLS",
      open.map((r) => r.table_name).join(", ")
    );
  }

  pass(`all ${rows.length} public tables have RLS enabled`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
