import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { calculateTradeResult, computeExperiment } from "../lib/calculate";
import { computeMonthlyRisk, monthKeyFromIso } from "../lib/monthly-risk";
import { createSupabaseTradesStore } from "../lib/trades-store/supabase";

const ROOT = join(__dirname, "..");

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
  const trades = await createSupabaseTradesStore().readAll();
  console.log(`Trades: ${trades.length}\n`);

  for (const t of [...trades].sort((a, b) => a.id.localeCompare(b.id))) {
    const result = calculateTradeResult(t);
    const month = t.closedAt ? monthKeyFromIso(t.closedAt) : "—";
    console.log(
      `${t.id} ${t.ticker} ${t.status} result=${result ?? "—"} closedAt=${t.closedAt ?? "—"} month=${month}`
    );
  }

  const monthly = computeMonthlyRisk(trades, -300);
  const exp = computeExperiment(trades);
  console.log("\n--- Monthly risk ---");
  console.log(`monthKey: ${monthly.monthKey}`);
  console.log(`monthlyRealizedPnL: ${monthly.monthlyRealizedPnL}`);
  console.log(`lossUsedThisMonth: ${monthly.lossUsedThisMonth}`);
  console.log(`carryoverIn: ${monthly.carryoverIn}`);
  console.log(`previousMonthLossUsed: ${monthly.previousMonthLossUsed}`);
  console.log(`monthlyLossRoom: ${monthly.monthlyLossRoom}`);
  console.log(`experiment net P/L: ${exp.realizedPnL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
