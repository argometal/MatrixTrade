/**
 * MXT 035 — delete contaminated PLAN-011 / PLAN-012 from canonical store.
 * LOCAL runner. Loads .env.local. Does not deploy.
 */
import { readFileSync, unlinkSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();
process.env.TRADES_STORE = "supabase";
delete process.env.MXT_READ_ONLY;

async function main() {
  const {
    CONTAMINATED_PLAN_DELETE_CONFIRMATION,
    deleteContaminatedPlan,
  } = await import("../lib/contaminated-plan-delete");
  const { createSupabaseAdmin } = await import("../lib/supabase/server");

  const reason = "MXT 035: erroneous contaminated duplicate of PLAN-010";
  for (const planId of ["PLAN-011", "PLAN-012"] as const) {
    const result = await deleteContaminatedPlan({
      planId,
      confirmation: CONTAMINATED_PLAN_DELETE_CONFIRMATION,
      reason,
    });
    console.log(planId, JSON.stringify(result, null, 2));
    if (!result.ok) {
      process.exitCode = 1;
      return;
    }
  }

  const sb = createSupabaseAdmin();
  const ids = ["PLAN-010", "PLAN-011", "PLAN-012"];
  const { data: plans, error } = await sb
    .from("trade_plans")
    .select("id")
    .in("id", ids);
  if (error) throw error;
  const { data: los, error: loe } = await sb
    .from("learning_outcomes")
    .select("id,plan_id")
    .in("plan_id", ids);
  if (loe) throw loe;
  const { data: nflx } = await sb.from("trade_plans").select("id").eq("ticker", "NFLX");
  const { data: shared } = await sb
    .from("trade_plans")
    .select("id")
    .eq("stock_thesis_id", "ST-NFLX-001");

  console.log("remaining target plans", (plans ?? []).map((p) => p.id).sort());
  console.log("remaining target LOs", los ?? []);
  console.log("NFLX plan ids", (nflx ?? []).map((p) => p.id).sort());
  console.log("ST-NFLX-001 plan refs", (shared ?? []).map((p) => p.id).sort());

  // Exclusive local artifacts only
  const artifactDir = join(process.cwd(), "artifacts", "case-snapshots-live");
  for (const planId of ["PLAN-011", "PLAN-012"] as const) {
    const file = join(artifactDir, `${planId}.case-snapshot.txt`);
    if (existsSync(file)) {
      unlinkSync(file);
      console.log("deleted artifact", file);
    }
  }
  const manifestPath = join(artifactDir, "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      total?: number;
      counts?: {
        totalCases?: number;
        modernCases?: number;
        historicalCases?: number;
      };
      files?: Array<{ planId?: string; caseId?: string; file?: string }>;
    };
    if (Array.isArray(manifest.files)) {
      manifest.files = manifest.files.filter(
        (row) => row.planId !== "PLAN-011" && row.planId !== "PLAN-012"
      );
      const modern = manifest.files.filter(
        (row) => row.planId && !String(row.planId).startsWith("HIST")
      ).length;
      const historical = manifest.files.length - modern;
      manifest.total = manifest.files.length;
      manifest.counts = {
        totalCases: manifest.files.length,
        modernCases: modern,
        historicalCases: historical,
      };
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      console.log("updated artifact manifest");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
