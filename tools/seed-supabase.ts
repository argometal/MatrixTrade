/**
 * One-shot seed: data/playbooks.json + data/trades.json → Supabase
 *
 * Prerequisites:
 *   1. Run supabase/schema.sql in your Supabase project
 *   2. Set env vars (see md/integrations/supabase-cloud-first.md)
 *
 * Usage:
 *   npx tsx tools/seed-supabase.ts
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { tradeToRow } from "../lib/trades-store/mapping";
import type { Playbook } from "../lib/playbook-types";
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

function readJsonFile<T>(relativePath: string): T {
  const filePath = join(ROOT, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`Missing seed file: ${relativePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
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

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const playbooks = readJsonFile<Playbook[]>("data/playbooks.json");
  const trades = parseTrades(readJsonFile<unknown>("data/trades.json"));

  console.log(`Seeding ${playbooks.length} playbook(s), ${trades.length} trade(s)...`);

  if (playbooks.length > 0) {
    const { error } = await supabase.from("playbooks").upsert(
      playbooks.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        description: p.description,
        checklist: p.checklist,
      })),
      { onConflict: "id" }
    );
    if (error) {
      console.error("Playbooks seed failed:", error.message);
      process.exit(1);
    }
    console.log("Playbooks: OK");
  }

  if (trades.length > 0) {
    const { error } = await supabase.from("trades").upsert(
      trades.map((t) => tradeToRow(t)),
      { onConflict: "id" }
    );
    if (error) {
      console.error("Trades seed failed:", error.message);
      process.exit(1);
    }
    console.log("Trades: OK");
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
