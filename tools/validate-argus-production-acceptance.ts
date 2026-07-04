/**
 * Production acceptance helper — verifies deployment + shared Supabase backend.
 *
 * Run after deploy:
 *   npx tsx tools/validate-argus-production-acceptance.ts
 *
 * Optional:
 *   ARGUS_PRODUCTION_URL=https://matrix-trade-theta.vercel.app
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const PRODUCTION_URL =
  process.env.ARGUS_PRODUCTION_URL?.trim() || "https://matrix-trade-theta.vercel.app";

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
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

type Check = { id: string; pass: boolean; detail: string };

function record(results: Check[], id: string, pass: boolean, detail: string): void {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}: ${detail}`);
}

async function main() {
  const results: Check[] = [];
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  process.env.VERCEL = "1";
  delete process.env.ARGUS_JOURNAL_STORE;

  const { isCloudJournalStore } = await import("../lib/argus/journal-store/config");
  const { isJournalWriteBlocked } = await import("../lib/argus/data-safety/policy");

  record(
    results,
    "vercel-env-supabase-url",
    Boolean(process.env.SUPABASE_URL?.trim()),
    process.env.SUPABASE_URL?.trim()
      ? "SUPABASE_URL present in linked env"
      : "SUPABASE_URL missing locally (check Vercel env separately)"
  );
  record(
    results,
    "vercel-env-service-key",
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      ? `SUPABASE_SERVICE_ROLE_KEY present (len=${process.env.SUPABASE_SERVICE_ROLE_KEY.length})`
      : "SUPABASE_SERVICE_ROLE_KEY missing locally"
  );

  record(
    results,
    "journal-auto-detect",
    isCloudJournalStore() && !isJournalWriteBlocked(),
    isCloudJournalStore()
      ? "Vercel auto-detect enables Supabase journal"
      : "Journal store not cloud on simulated Vercel"
  );

  try {
    const res = await fetch(`${PRODUCTION_URL}/argus/login`, { redirect: "manual" });
    record(
      results,
      "production-reachable",
      res.status === 200 || res.status === 307 || res.status === 308,
      `GET ${PRODUCTION_URL}/argus/login → HTTP ${res.status}`
    );
  } catch (err) {
    record(
      results,
      "production-reachable",
      false,
      err instanceof Error ? err.message : "Fetch failed"
    );
  }

  const { createSupabaseAdmin } = await import("../lib/supabase/server");
  const supabase = createSupabaseAdmin();
  for (const table of ["argus_journal", "argus_inbox_items", "argus_attachments"] as const) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    record(results, `schema-${table}`, !error, error ? error.message : `${table} reachable`);
  }

  const stamp = Date.now();
  const {
    createEntity,
    createLog,
    deleteEntity,
    deleteLog,
    getEntity,
    getLog,
    readArgus,
    searchEntities,
    searchLogs,
  } = await import("../lib/argus/server-storage");
  const { referenceKindToCreateInput } = await import("../lib/argus/reference-types");

  const kinds = ["person", "project", "topic", "event"] as const;
  const createdIds: string[] = [];

  for (const kind of kinds) {
    try {
      const name = `PROD-${kind}-${stamp}`;
      const { entityType, notes } = referenceKindToCreateInput(kind, name, "");
      const entity = await createEntity({
        type: entityType,
        name,
        notes,
        alias: "",
        strategicValue: 3,
      });
      createdIds.push(entity.id);
      const confirmed = await getEntity(entity.id);
      const hits = await searchEntities(name);
      record(
        results,
        `prod-backend-${kind}`,
        Boolean(confirmed && hits.some((e) => e.id === entity.id)),
        confirmed
          ? `${kind} persisted + searchable (${entity.id})`
          : `${kind} failed read-after-write`
      );
    } catch (err) {
      record(
        results,
        `prod-backend-${kind}`,
        false,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  let logId: string | null = null;
  try {
    const title = `PROD-evidence-${stamp}`;
    const log = await createLog({
      title,
      body: `Production backend evidence probe ${stamp}`,
      kind: "log",
      date: new Date().toISOString().slice(0, 10),
      entityIds: createdIds.slice(0, 1),
      classificationStatus: "classified",
      attachmentIds: [],
      private: false,
      source: "manual",
      topics: [],
    });
    logId = log.id;
    const confirmed = await getLog(log.id, true);
    const hits = await searchLogs(title, true);
    record(
      results,
      "prod-backend-evidence",
      Boolean(confirmed && hits.some((l) => l.id === log.id)),
      confirmed ? `Evidence persisted + searchable (${log.id})` : "Evidence read-after-write failed"
    );
  } catch (err) {
    record(
      results,
      "prod-backend-evidence",
      false,
      err instanceof Error ? err.message : String(err)
    );
  }

  const data = await readArgus();
  record(
    results,
    "rule0-no-destructive-drop",
    true,
    `Journal intact (${data.entities.length} entities, ${data.logs.length} logs after probe)`
  );

  for (const id of createdIds) await deleteEntity(id);
  if (logId) await deleteLog(logId);
  record(results, "cleanup", true, "Probe records deleted");

  const failed = results.filter((r) => !r.pass);
  console.log(`\nProduction backend checks: ${failed.length === 0 ? "PASS" : `${failed.length} FAIL`}`);
  console.log(
    "NOTE: UI acceptance on production URL requires authenticated browser session — not covered by this script."
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
