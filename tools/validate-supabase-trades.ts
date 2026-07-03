/**
 * Validate Supabase trades match data/trades.json shape (field-by-field).
 *
 * Usage:
 *   npx tsx tools/validate-supabase-trades.ts
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { compareTradeLists } from "../lib/trades-store/compare";
import { readTradesJsonFile } from "../lib/trades-store/json";
import { createSupabaseTradesStore } from "../lib/trades-store/supabase";
import type { Trade } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvLocal(): void {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseTrades(raw: unknown): Trade[] {
  if (Array.isArray(raw)) return raw as Trade[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { trades: Trade[] }).trades)) {
    return (raw as { trades: Trade[] }).trades;
  }
  return [];
}

async function main() {
  loadEnvLocal();

  if (!process.env.SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const jsonTrades = await readTradesJsonFile();
  const supabaseTrades = await createSupabaseTradesStore().readAll();

  console.log(`JSON file: ${jsonTrades.length} trade(s)`);
  console.log(`Supabase:  ${supabaseTrades.length} trade(s)`);

  const diffs = compareTradeLists(jsonTrades, supabaseTrades);

  if (diffs.length === 0) {
    console.log("OK — Supabase output matches JSON shape for all trades.");
    const ids = jsonTrades.map((t) => t.id.toUpperCase()).sort();
    if (ids.length > 0) {
      console.log(`IDs verified: ${ids.join(", ")}`);
    }
    process.exit(0);
  }

  console.error(`FAIL — ${diffs.length} difference(s):`);
  for (const diff of diffs) {
    console.error(JSON.stringify(diff));
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
