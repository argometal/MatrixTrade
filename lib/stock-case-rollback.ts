import { createSupabaseAdmin } from "./supabase/server";
import { isSupabaseMatrixStore } from "./trades-json";
import { readMarketEvidenceJsonFile } from "./market-evidence-store/json";
import { promises as fs } from "fs";
import path from "path";
import { readStockThesesJsonFile } from "./stock-theses-store/json";
import { getPlans } from "./plans";

const EVIDENCE_FILE = path.join(process.cwd(), "data", "market-evidence.json");
const THESES_FILE = path.join(process.cwd(), "data", "stock-theses.json");
const PLANS_FILE = path.join(process.cwd(), "data", "plans.json");

async function writeJsonArray(file: string, rows: unknown[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
}

/** Roll back a partial stock-case-create when a later step fails. */
export async function rollbackStockCaseCreate(
  stockThesisId: string,
  planId?: string
): Promise<void> {
  const id = stockThesisId.toUpperCase();

  if (isSupabaseMatrixStore()) {
    const supabase = createSupabaseAdmin();
    if (planId) {
      await supabase.from("trade_plans").delete().eq("id", planId);
    } else {
      await supabase.from("trade_plans").delete().eq("stock_thesis_id", id);
    }
    await supabase.from("market_evidence").delete().eq("stock_profile_id", id);
    await supabase.from("stock_theses").delete().eq("id", id);
    return;
  }

  const theses = (await readStockThesesJsonFile()).filter((t) => t.id !== id);
  await writeJsonArray(THESES_FILE, theses);

  const evidence = (await readMarketEvidenceJsonFile()).filter((row) => row.stockProfileId !== id);
  await writeJsonArray(EVIDENCE_FILE, evidence);

  const plans = (await getPlans()).filter((plan) => {
    if (planId && plan.id === planId) return false;
    if (plan.stockThesisId?.toUpperCase() === id) return false;
    return true;
  });
  await writeJsonArray(PLANS_FILE, plans);
}
