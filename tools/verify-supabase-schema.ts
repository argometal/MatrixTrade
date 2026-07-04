/**
 * Verify ARGUS Supabase schema without printing secrets.
 * Run: npx tsx tools/verify-supabase-schema.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
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

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  console.log(`SUPABASE_URL: ${url ? `set (${url.slice(0, 30)}…)` : "EMPTY"}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${key ? `set (len=${key.length})` : "EMPTY"}`);

  if (!url || !key) {
    console.error("FAIL: Supabase credentials missing locally — cannot verify schema.");
    process.exit(1);
  }

  const { createSupabaseAdmin } = await import("../lib/supabase/server");
  const supabase = createSupabaseAdmin();

  const tables = ["argus_journal", "argus_inbox_items", "argus_attachments"] as const;
  let allOk = true;

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`FAIL  ${table}: ${error.message}`);
      allOk = false;
    } else {
      console.log(`PASS  ${table}: reachable (count=${count ?? "?"})`);
    }
  }

  const { data: journalRow, error: journalErr } = await supabase
    .from("argus_journal")
    .select("id, updated_at, deleted_at")
    .eq("id", "primary")
    .maybeSingle();

  if (journalErr) {
    console.log(`FAIL  argus_journal primary row: ${journalErr.message}`);
    allOk = false;
  } else if (!journalRow) {
    console.log("FAIL  argus_journal: primary row missing — run supabase/argus-setup.sql");
    allOk = false;
  } else {
    console.log(`PASS  argus_journal primary row exists (updated_at=${journalRow.updated_at})`);
  }

  const { error: bucketErr } = await supabase.storage.from("argus-files").list("", { limit: 1 });
  if (bucketErr) {
    console.log(`WARN  argus-files bucket: ${bucketErr.message}`);
  } else {
    console.log("PASS  argus-files storage bucket reachable");
  }

  if (!allOk) process.exit(1);
  console.log("\nSchema verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
