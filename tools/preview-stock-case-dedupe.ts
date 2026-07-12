/**
 * Preview or execute duplicate stock-case cleanup for one ticker.
 *
 * Preview:  npx tsx tools/preview-stock-case-dedupe.ts --ticker MSFT
 * Execute:  npx tsx tools/preview-stock-case-dedupe.ts --ticker MSFT --keep ST-MSFT-001 --execute --confirm YES_DELETE_DUPLICATES
 */
import { getStockTheses } from "../lib/stock-theses";
import { isSupabaseMatrixStore } from "../lib/trades-json";
import { rollbackStockCaseCreate } from "../lib/stock-case-rollback";

function parseArgs(argv: string[]) {
  const ticker = (argv.find((a) => a.startsWith("--ticker="))?.split("=")[1] ?? "MSFT")
    .trim()
    .toUpperCase();
  const keep = argv.find((a) => a.startsWith("--keep="))?.split("=")[1]?.trim().toUpperCase();
  const execute = argv.includes("--execute");
  const confirm = argv.find((a) => a.startsWith("--confirm="))?.split("=")[1];
  return { ticker, keep, execute, confirm };
}

function isCompleteScout(plan: {
  plannedEntry?: number;
  stopPrice?: number;
  targetPrice?: number;
}): boolean {
  return (
    plan.plannedEntry !== undefined &&
    plan.stopPrice !== undefined &&
    plan.targetPrice !== undefined &&
    plan.plannedEntry > 0 &&
    plan.stopPrice > 0 &&
    plan.targetPrice > 0
  );
}

async function main() {
  const { ticker, keep, execute, confirm } = parseArgs(process.argv.slice(2));
  const theses = (await getStockTheses()).filter((t) => t.ticker === ticker);
  const plans = await getPlans();

  if (theses.length === 0) {
    console.log(`No stock profiles for ${ticker}.`);
    process.exit(0);
  }

  const rows = theses
    .map((thesis) => {
      const linked = plans.filter((p) => p.stockThesisId?.toUpperCase() === thesis.id);
      const complete = linked.find(isCompleteScout);
      return {
        id: thesis.id,
        createdAt: thesis.createdAt ?? "unknown",
        planCount: linked.length,
        completePlanId: complete?.id,
        complete,
      };
    })
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  let canonical = keep;
  if (!canonical) {
    const withComplete = rows.find((r) => r.completePlanId);
    canonical = withComplete?.id ?? rows[0]?.id;
  }

  const duplicates = rows.filter((r) => r.id !== canonical).map((r) => r.id);

  console.log(`\n=== ${ticker} duplicate preview ===`);
  console.log(`Store: ${isSupabaseMatrixStore() ? "supabase" : "json"}`);
  console.log(`Profiles found: ${rows.length}`);
  console.log(`Canonical (keep): ${canonical}`);
  console.log(`Duplicates (remove): ${duplicates.length ? duplicates.join(", ") : "(none)"}`);
  console.log("\nDetail:");
  for (const row of rows) {
    console.log(
      `  ${row.id}  plans:${row.planCount}  complete:${row.completePlanId ?? "no"}  created:${row.createdAt}${row.id === canonical ? "  ← KEEP" : ""}`
    );
  }

  if (!execute) {
    console.log("\nPreview only. To delete duplicates:");
    console.log(
      `  npx tsx tools/preview-stock-case-dedupe.ts --ticker ${ticker} --keep ${canonical} --execute --confirm YES_DELETE_DUPLICATES`
    );
    process.exit(0);
  }

  if (confirm !== "YES_DELETE_DUPLICATES") {
    console.error("\nRefusing execute: pass --confirm YES_DELETE_DUPLICATES");
    process.exit(1);
  }

  for (const id of duplicates) {
    console.log(`Deleting ${id}…`);
    await rollbackStockCaseCreate(id);
  }

  console.log(`\nDone. Kept ${canonical}, removed ${duplicates.length} duplicate(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
