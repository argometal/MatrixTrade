/** One-off: show trade rows and optionally delete by id. */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createSupabaseAdmin } from "../lib/supabase/server";
import { tradeRowToTrade } from "../lib/trades-store/mapping";

const ROOT = join(__dirname, "..");
const targetId = process.argv[2]?.toUpperCase();
const shouldDelete = process.argv.includes("--delete");

function loadEnvLocal(): void {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
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
  loadEnvLocal();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("trades").select("*").order("id");
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const t = tradeRowToTrade(row);
    console.log(JSON.stringify(t, null, 2));
  }

  if (targetId && shouldDelete) {
    const { error: delErr } = await supabase.from("trades").delete().eq("id", targetId);
    if (delErr) throw new Error(delErr.message);
    console.log(`\nDeleted ${targetId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
