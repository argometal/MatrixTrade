/**
 * Validate objects-first entity workflow.
 * Run: npx tsx tools/validate-argus-objects-first.ts
 * Production Supabase: npx tsx tools/validate-argus-objects-first.ts --production
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  createEntity,
  deleteEntity,
  getEntity,
  getEntities,
  readArgus,
  searchEntities,
} from "../lib/argus/server-storage";
import {
  buildHomeActivityFeed,
} from "../lib/argus/home-helpers";
import {
  entityDetailHref,
  referenceKindToCreateInput,
  type ReferenceKind,
} from "../lib/argus/reference-types";
import { getArgusHealthReport } from "../lib/argus/health/status";
import { getLogs } from "../lib/argus/server-storage";

type CheckResult = { id: string; pass: boolean; detail: string };

function loadEnvFile(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
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
    process.env[key] = value;
  }
  return true;
}

async function validateKind(kind: ReferenceKind, stamp: number): Promise<{ id: string; name: string }> {
  const name = `OBJFIRST-${kind}-${stamp}`;
  const { entityType, notes: builtNotes } = referenceKindToCreateInput(kind, name, "");
  const entity = await createEntity({
    type: entityType,
    name,
    notes: builtNotes,
    alias: "",
    strategicValue: 3,
  });

  const reloaded = await getEntity(entity.id);
  if (!reloaded || reloaded.name !== name) {
    throw new Error(`${kind}: missing after getEntity`);
  }

  const data = await readArgus();
  const persisted = data.entities.find((e) => e.id === entity.id);
  if (!persisted) {
    throw new Error(`${kind}: missing after readArgus refresh`);
  }

  return { id: entity.id, name };
}

async function runChecks(label: string, options: { requireSupabase: boolean }): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const stamp = Date.now();
  const created: { kind: ReferenceKind; id: string; name: string }[] = [];

  for (const kind of ["person", "project", "topic"] as ReferenceKind[]) {
    try {
      const { id, name } = await validateKind(kind, stamp);
      created.push({ kind, id, name });
      results.push({ id: `create-${kind}`, pass: true, detail: `${kind} persisted after refresh (${id})` });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ id: `create-${kind}`, pass: false, detail });
    }
  }

  for (const { kind, id, name } of created) {
    const hits = await searchEntities(name);
    const found = hits.some((e) => e.id === id);
    results.push({
      id: `search-${kind}`,
      pass: found,
      detail: found ? `Found in searchEntities` : `Not found in search for "${name}"`,
    });
  }

  if (created.length > 0) {
    const entities = await getEntities();
    const logs = await getLogs(true);
    const feed = buildHomeActivityFeed(entities, logs, 50);
    for (const { kind, id } of created) {
      const inFeed = feed.some((item) => item.type === "entity" && item.entity.id === id);
      results.push({
        id: `activity-${kind}`,
        pass: inFeed,
        detail: inFeed ? "Appears in Home Activity feed" : "Missing from Home Activity feed",
      });
    }
  }

  for (const { kind, id } of created) {
    const entity = await getEntity(id);
    const pass = Boolean(entity && entityDetailHref(entity).length > 0);
    results.push({
      id: `detail-${kind}`,
      pass,
      detail: entity ? `Detail href ${entityDetailHref(entity)}` : "Entity missing for detail href",
    });
  }

  const journalStore = process.env.ARGUS_JOURNAL_STORE?.trim().toLowerCase();
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  const createOk = created.length === 3;
  const supabasePass = options.requireSupabase
    ? journalStore === "supabase" && supabaseConfigured && createOk
    : createOk;
  results.push({
    id: "supabase-production",
    pass: supabasePass,
    detail: options.requireSupabase
      ? supabasePass
        ? "Supabase journal create/read cycle succeeded"
        : journalStore === "supabase"
          ? supabaseConfigured
            ? "Supabase enabled but create checks failed"
            : "SUPABASE credentials missing"
          : `Expected ARGUS_JOURNAL_STORE=supabase (got ${journalStore ?? "filesystem"})`
      : createOk
        ? "Local store create/read cycle succeeded (Supabase check skipped)"
        : "Create checks failed",
  });

  try {
    const health = await getArgusHealthReport();
    const critical = health.subsystems.filter(
      (s) =>
        s.level === "offline" &&
        (s.key === "evidence" || s.key === "search" || s.key === "activity" || (options.requireSupabase && s.key === "database"))
    );
    results.push({
      id: "health-panel",
      pass: critical.length === 0,
      detail:
        critical.length === 0
          ? `Health checks OK (${health.subsystems.filter((s) => s.level === "healthy").length}/${health.subsystems.length} healthy)`
          : `Offline: ${critical.map((s) => s.label).join(", ")}`,
    });
  } catch (err) {
    results.push({
      id: "health-panel",
      pass: false,
      detail: err instanceof Error ? err.message : "Health report failed",
    });
  }

  for (const { id } of created) {
    await deleteEntity(id);
  }

  console.log(`\n=== ${label} ===`);
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id}: ${r.detail}`);
  }

  return results;
}

async function main() {
  const production = process.argv.includes("--production");
  const supabase = process.argv.includes("--supabase") || production;

  if (production) {
    loadEnvFile(path.join(process.cwd(), ".env.vercel.production"));
  }
  if (supabase) {
    loadEnvFile(path.join(process.cwd(), ".env.local"));
    process.env.ARGUS_JOURNAL_STORE = "supabase";
    process.env.ARGUS_INBOX_STORE = process.env.ARGUS_INBOX_STORE ?? "supabase";
  }

  const label = supabase ? "Supabase" : "Local";
  const results = await runChecks(label, { requireSupabase: supabase });
  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.error(`\n${failed.length} check(s) failed. Objects-first workflow: pending validation.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
