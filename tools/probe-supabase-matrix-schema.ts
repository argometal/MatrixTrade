/**
 * Probe MatrixTrade Supabase tables/columns expected by code vs prod.
 * Run: npx tsx tools/probe-supabase-matrix-schema.ts
 */
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal(): void {
  const envPath = join(root, ".env.local");
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

type Check = { label: string; sqlFile: string; optional?: boolean };

const TABLES: Check[] = [
  { label: "playbooks", sqlFile: "schema.sql" },
  { label: "trades", sqlFile: "schema.sql" },
  { label: "trade_plans", sqlFile: "schema.sql + trade-plans.sql" },
  { label: "stock_theses", sqlFile: "stock-case-cloud.sql" },
  { label: "market_evidence", sqlFile: "stock-case-cloud.sql" },
  { label: "scoped_ai_grants", sqlFile: "stock-case-cloud.sql" },
  { label: "trading_inbox", sqlFile: "trading-inbox.sql" },
  { label: "applied_import_fingerprints", sqlFile: "applied-import-fingerprints.sql", optional: true },
  { label: "ai_notes", sqlFile: "ai-notes.sql", optional: true },
  { label: "ai_sessions", sqlFile: "ai-sessions.sql", optional: true },
  { label: "learning_outcomes", sqlFile: "learning-outcomes.sql" },
  { label: "observations", sqlFile: "observations.sql" },
  { label: "external_positions", sqlFile: "external-positions.sql" },
  { label: "capital_planner_state", sqlFile: "capital-planner.sql" },
];

const TRADE_COLUMNS: Check[] = [
  { label: "trades.loss_classification", sqlFile: "trade-learning-extensions.sql" },
  { label: "trades.post_stop_study", sqlFile: "trade-learning-extensions.sql" },
  { label: "trades.plan_id", sqlFile: "trade-legacy-absence.sql" },
  { label: "trades.playbook_historically_absent", sqlFile: "trade-legacy-absence.sql" },
  { label: "trades.plan_historically_absent", sqlFile: "trade-legacy-absence.sql" },
  { label: "trades.dates_reconstructed", sqlFile: "trade-date-correction.sql" },
  { label: "trades.date_correction_note", sqlFile: "trade-date-correction.sql" },
  { label: "trades.date_correction_audit", sqlFile: "trade-date-correction.sql" },
];

const OBS_COLUMNS: Check[] = [
  { label: "observations.observation_kind", sqlFile: "observations-counterfactual.sql", optional: true },
  { label: "observations.learning_unit_kind", sqlFile: "observations-counterfactual.sql", optional: true },
  { label: "observations.theoretical_result_r", sqlFile: "observations-counterfactual.sql", optional: true },
];

const LO_COLUMNS: Check[] = [
  { label: "learning_outcomes.counterfactual_r", sqlFile: "learning-outcomes.sql" },
  { label: "learning_outcomes.counterfactual_dollar_result", sqlFile: "learning-outcomes.sql" },
  { label: "learning_outcomes.maf_experiment_id", sqlFile: "learning-outcomes.sql" },
];
const PLAN_COLUMNS: Check[] = [
  { label: "trade_plans.stock_thesis_id", sqlFile: "stock-case-cloud.sql" },
  { label: "trade_plans.decision", sqlFile: "stock-case-cloud.sql" },
  { label: "trade_plans.decision_history", sqlFile: "stock-case-cloud.sql" },
  { label: "trade_plans.scout_lifecycle", sqlFile: "stock-case-cloud.sql" },
  { label: "trade_plans.probe", sqlFile: "stock-case-cloud.sql" },
  { label: "trade_plans.layered_entry", sqlFile: "stock-case-cloud.sql / trade-plans-layered-entry.sql" },
  { label: "trade_plans.execution_method", sqlFile: "stock-case-cloud.sql / trade-plans-layered-entry.sql", optional: true },
  { label: "trade_plans.execution_instruction", sqlFile: "trade-plans-execution-instruction.sql", optional: true },
  { label: "trade_plans.execution_readiness", sqlFile: "trade-plans-execution-readiness.sql", optional: true },
];

async function probeTable(
  supabase: ReturnType<typeof createClient>,
  table: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function probeColumn(
  supabase: ReturnType<typeof createClient>,
  table: string,
  column: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from(table).select(column).limit(1);
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function main() {
  loadEnvLocal();
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("=== MatrixTrade Supabase schema probe ===\n");

  const missing: Array<{ label: string; sqlFile: string; error: string; optional?: boolean }> = [];
  const ok: string[] = [];

  for (const t of TABLES) {
    const r = await probeTable(supabase, t.label);
    if (r.ok) {
      ok.push(`TABLE  ${t.label}`);
    } else {
      missing.push({ label: `TABLE ${t.label}`, sqlFile: t.sqlFile, error: r.error ?? "unknown", optional: t.optional });
    }
  }

  for (const c of TRADE_COLUMNS) {
    const [, col] = c.label.split(".");
    const r = await probeColumn(supabase, "trades", col);
    if (r.ok) ok.push(`COL    ${c.label}`);
    else missing.push({ label: c.label, sqlFile: c.sqlFile, error: r.error ?? "unknown", optional: c.optional });
  }

  for (const c of PLAN_COLUMNS) {
    const [, col] = c.label.split(".");
    const r = await probeColumn(supabase, "trade_plans", col);
    if (r.ok) ok.push(`COL    ${c.label}`);
    else missing.push({ label: c.label, sqlFile: c.sqlFile, error: r.error ?? "unknown", optional: c.optional });
  }

  for (const c of OBS_COLUMNS) {
    const [, col] = c.label.split(".");
    const r = await probeColumn(supabase, "observations", col);
    if (r.ok) ok.push(`COL    ${c.label}`);
    else missing.push({ label: c.label, sqlFile: c.sqlFile, error: r.error ?? "unknown", optional: c.optional });
  }

  for (const c of LO_COLUMNS) {
    const [, col] = c.label.split(".");
    const r = await probeColumn(supabase, "learning_outcomes", col);
    if (r.ok) ok.push(`COL    ${c.label}`);
    else missing.push({ label: c.label, sqlFile: c.sqlFile, error: r.error ?? "unknown", optional: c.optional });
  }

  console.log(`OK (${ok.length}):`);
  for (const line of ok) console.log(`  ✓ ${line}`);

  const requiredMissing = missing.filter((m) => !m.optional);
  const optionalMissing = missing.filter((m) => m.optional);

  if (requiredMissing.length) {
    console.log(`\nMISSING — REQUIRED (${requiredMissing.length}):`);
    for (const m of requiredMissing) {
      console.log(`  ✗ ${m.label}`);
      console.log(`      → run supabase/${m.sqlFile.split(" ")[0]}`);
      console.log(`      ${m.error}`);
    }
  }

  if (optionalMissing.length) {
    console.log(`\nMISSING — OPTIONAL / graceful fallback (${optionalMissing.length}):`);
    for (const m of optionalMissing) {
      console.log(`  ~ ${m.label}`);
      console.log(`      → supabase/${m.sqlFile.split(" ")[0]}`);
    }
  }

  if (!requiredMissing.length && !optionalMissing.length) {
    console.log("\nAll probed tables/columns present.");
  } else if (!requiredMissing.length) {
    console.log("\nRequired schema OK. Optional columns above improve full feature set.");
  }

  process.exit(requiredMissing.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
