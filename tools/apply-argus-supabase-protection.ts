/**
 * Run ARGUS Supabase protection migration with backup + count gate.
 *
 * Step 1: This tool exports a backup and verifies connectivity.
 * Step 2: Run supabase/argus-protection.sql in Supabase SQL editor (once).
 * Step 3: Re-run with --verify to confirm schema + counts.
 *
 * Usage:
 *   npx tsx tools/apply-argus-supabase-protection.ts
 *   npx tsx tools/apply-argus-supabase-protection.ts --verify
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { exportArgusSupabaseTables } from "../lib/argus/supabase-protection/export";
import { getProtectedCounts } from "../lib/argus/supabase-protection/migrate-gate";
import { isArgusSupabaseEnabled } from "../lib/argus/supabase-protection/policy";

const VERIFY = process.argv.includes("--verify");

async function main(): Promise<void> {
  if (!isArgusSupabaseEnabled()) {
    console.error("Set ARGUS_INBOX_STORE=supabase and/or ARGUS_JOURNAL_STORE=supabase");
    process.exit(1);
  }

  const backupPath = await exportArgusSupabaseTables();
  const before = await getProtectedCounts();
  console.log("Pre-migration backup:", backupPath);
  console.log("Protected counts:", JSON.stringify(before));

  const sqlPath = resolve(process.cwd(), "supabase/argus-protection.sql");
  console.log("\nRun this SQL in Supabase SQL editor (once):");
  console.log(`  ${sqlPath}\n`);
  console.log(readFileSync(sqlPath, "utf8").split("\n").slice(0, 8).join("\n"));
  console.log("  ...\n");

  if (!VERIFY) {
    console.log("After SQL is applied, run:");
    console.log("  npx tsx tools/apply-argus-supabase-protection.ts --verify");
    console.log("  tools\\verify-argus-supabase-protection.cmd --with-schema --with-export");
    return;
  }

  console.log("Post-migration counts:", JSON.stringify(await getProtectedCounts()));
  console.log("\nNext: tools\\verify-argus-supabase-protection.cmd --with-schema --with-export");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
