/**
 * Daily ARGUS Supabase backup — export all ARGUS tables to timestamped JSON.
 *
 * Usage:
 *   npx tsx tools/backup-argus-supabase.ts
 *   npx tsx tools/backup-argus-supabase.ts --dest C:\Backups\Argus
 *
 * Schedule (Windows Task Scheduler / cron): run once daily.
 */
import { exportArgusSupabaseTables } from "../lib/argus/supabase-protection/export";
import { isArgusSupabaseEnabled } from "../lib/argus/supabase-protection/policy";

async function main(): Promise<void> {
  if (!isArgusSupabaseEnabled()) {
    console.error("Set ARGUS_INBOX_STORE=supabase and/or ARGUS_JOURNAL_STORE=supabase before backup.");
    process.exit(1);
  }

  const destFlag = process.argv.indexOf("--dest");
  const dest = destFlag >= 0 ? process.argv[destFlag + 1] : undefined;

  const path = await exportArgusSupabaseTables(dest);
  console.log(`ARGUS Supabase backup written: ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
