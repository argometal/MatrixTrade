/**
 * Apply improvement_hypotheses DDL if missing, via Supabase Management API
 * when SUPABASE_ACCESS_TOKEN is available; otherwise verify + print SQL path.
 *
 * Run: npx tsx tools/ensure-improvement-hypotheses-table.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function tableExists(): Promise<{ ok: boolean; error?: string }> {
  const { createSupabaseAdmin } = await import("../lib/supabase/server");
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("improvement_hypotheses")
    .select("id")
    .limit(1);
  if (!error) return { ok: true };
  const msg = error.message ?? "";
  if (/does not exist|Could not find the table|schema cache/i.test(msg)) {
    return { ok: false, error: msg };
  }
  // Empty table or RLS still returns ok without error on select with service role
  return { ok: false, error: msg };
}

async function applyViaManagementApi(sql: string): Promise<boolean> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const url = process.env.SUPABASE_URL?.trim();
  if (!token || !url) return false;
  const ref = url.replace(/^https?:\/\//, "").split(".")[0];
  if (!ref) return false;

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("Management API SQL failed:", res.status, text.slice(0, 500));
    return false;
  }
  console.log("Management API SQL applied OK");
  return true;
}

async function main() {
  const sqlPath = resolve(process.cwd(), "supabase/improvement-hypotheses.sql");
  if (!existsSync(sqlPath)) {
    console.error("Missing", sqlPath);
    process.exit(1);
  }
  const sql = readFileSync(sqlPath, "utf8");

  const before = await tableExists();
  if (before.ok) {
    console.log("PASS improvement_hypotheses already exists");
    return;
  }
  console.log("Table missing:", before.error);

  const applied = await applyViaManagementApi(sql);
  if (applied) {
    const after = await tableExists();
    if (after.ok) {
      console.log("PASS improvement_hypotheses created");
      return;
    }
    console.error("Table still missing after apply:", after.error);
    process.exit(1);
  }

  console.error(
    "BLOCKED: cannot apply DDL without SUPABASE_ACCESS_TOKEN.\n" +
      "Run supabase/improvement-hypotheses.sql in Supabase SQL Editor, then re-run this script."
  );
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
