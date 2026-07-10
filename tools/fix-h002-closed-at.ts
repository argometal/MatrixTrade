import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createSupabaseTradesStore } from "../lib/trades-store/supabase";

const ROOT = join(__dirname, "..");
const CORRECTED_CLOSED_AT = "2026-06-30T12:00:00.000Z";

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
  const store = createSupabaseTradesStore();
  const trades = await store.readAll();
  const trade = trades.find((t) => t.id === "H002");

  if (!trade) {
    console.error("H002 not found in active store.");
    process.exit(1);
  }

  if (trade.closedAt === CORRECTED_CLOSED_AT) {
    console.log("H002 closedAt already correct:", CORRECTED_CLOSED_AT);
    return;
  }

  console.log(`H002 closedAt: ${trade.closedAt ?? "—"} → ${CORRECTED_CLOSED_AT}`);
  await store.upsert({ ...trade, closedAt: CORRECTED_CLOSED_AT });
  console.log("H002 close date updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
