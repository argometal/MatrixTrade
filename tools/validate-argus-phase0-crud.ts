/**
 * Phase 0/1 stabilization CRUD validation — all 5 object types + evidence.
 *
 * Run (local filesystem):
 *   npx tsx tools/validate-argus-phase0-crud.ts
 *
 * Run (Supabase, loads .env.local):
 *   npx tsx tools/validate-argus-phase0-crud.ts --supabase
 *
 * Run (Vercel auto-detect simulation — no ARGUS_JOURNAL_STORE):
 *   npx tsx tools/validate-argus-phase0-crud.ts --supabase --vercel-auto
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  createEntity,
  createLog,
  deleteEntity,
  deleteLog,
  getEntity,
  getEntities,
  getLog,
  getLogs,
  readArgus,
  searchEntities,
  searchLogs,
} from "../lib/argus/server-storage";
import { buildHomeActivityFeed } from "../lib/argus/home-helpers";
import { getArgusHealthReport } from "../lib/argus/health/status";
import {
  REFERENCE_KINDS,
  entityDetailHref,
  referenceKindFromNotes,
  referenceKindToCreateInput,
  type ReferenceKind,
} from "../lib/argus/reference-types";
import { isCloudJournalStore } from "../lib/argus/journal-store/config";
import { isJournalWriteBlocked } from "../lib/argus/data-safety/policy";

type Check = { id: string; pass: boolean; detail: string };

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

function record(results: Check[], id: string, pass: boolean, detail: string): void {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}: ${detail}`);
}

async function validateObjectKind(kind: ReferenceKind, stamp: number): Promise<string> {
  const name = `PHASE0-${kind}-${stamp}`;
  const { entityType, notes: builtNotes } = referenceKindToCreateInput(kind, name, "");
  const entity = await createEntity({
    type: entityType,
    name,
    notes: builtNotes,
    alias: "",
    strategicValue: 3,
  });

  const confirmed = await getEntity(entity.id);
  if (!confirmed || confirmed.name !== name) {
    throw new Error(`${kind}: read-after-write failed`);
  }

  const reloaded = await readArgus();
  if (!reloaded.entities.some((e) => e.id === entity.id)) {
    throw new Error(`${kind}: missing after readArgus refresh`);
  }

  if (kind === "topic" || kind === "event") {
    const parsed = referenceKindFromNotes(confirmed.notes);
    if (parsed !== kind) {
      throw new Error(`${kind}: Kind prefix missing (got ${parsed})`);
    }
  }

  return entity.id;
}

async function main() {
  const supabase = process.argv.includes("--supabase");
  const vercelAuto = process.argv.includes("--vercel-auto");
  const results: Check[] = [];
  const stamp = Date.now();
  const createdEntityIds: string[] = [];
  let createdLogId: string | null = null;

  if (supabase) {
    loadEnvFile(path.join(process.cwd(), ".env.local"));
    process.env.ARGUS_INBOX_STORE = process.env.ARGUS_INBOX_STORE ?? "supabase";
    if (vercelAuto) {
      delete process.env.ARGUS_JOURNAL_STORE;
      process.env.VERCEL = "1";
    } else {
      process.env.ARGUS_JOURNAL_STORE = "supabase";
    }
  }

  record(
    results,
    "write-pipeline",
    !isJournalWriteBlocked(),
    isJournalWriteBlocked()
      ? "Journal writes blocked (isJournalWriteBlocked=true)"
      : `Writes enabled (store=${isCloudJournalStore() ? "supabase" : "filesystem"})`
  );

  for (const kind of REFERENCE_KINDS) {
    try {
      const id = await validateObjectKind(kind, stamp);
      createdEntityIds.push(id);
      record(results, `${kind}-create`, true, `Created ${id}, confirmed after refresh`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      record(results, `${kind}-create`, false, detail);
    }
  }

  for (const kind of REFERENCE_KINDS) {
    const id = createdEntityIds[REFERENCE_KINDS.indexOf(kind)];
    if (!id) {
      record(results, `${kind}-search`, false, "Skipped — create failed");
      continue;
    }
    const name = `PHASE0-${kind}-${stamp}`;
    const hits = await searchEntities(name);
    record(
      results,
      `${kind}-search`,
      hits.some((e) => e.id === id),
      hits.some((e) => e.id === id) ? "Found immediately in searchEntities" : "Not found in search"
    );
  }

  if (createdEntityIds.length > 0) {
    const entities = await getEntities();
    const logs = await getLogs(true);
    const feed = buildHomeActivityFeed(entities, logs, 100);
    for (const kind of REFERENCE_KINDS) {
      const id = createdEntityIds[REFERENCE_KINDS.indexOf(kind)];
      if (!id) continue;
      const inFeed = feed.some((item) => item.type === "entity" && item.entity.id === id);
      record(
        results,
        `${kind}-activity`,
        inFeed,
        inFeed ? "In Home activity feed (from DB reads)" : "Missing from activity feed"
      );
    }

    const entityCountBefore = entities.length;
    record(
      results,
      "home-counters-source",
      entityCountBefore >= createdEntityIds.length,
      `Home counters derive from getEntities() (${entityCountBefore} active entities)`
    );
  }

  for (const kind of REFERENCE_KINDS) {
    const id = createdEntityIds[REFERENCE_KINDS.indexOf(kind)];
    if (!id) {
      record(results, `${kind}-detail`, false, "Skipped — create failed");
      continue;
    }
    const entity = await getEntity(id);
    const href = entity ? entityDetailHref(entity) : "";
    record(
      results,
      `${kind}-detail`,
      Boolean(entity && href),
      entity ? `Detail route ${href}` : "Entity missing for detail load"
    );
  }

  try {
    const body = `Phase0 evidence probe ${stamp}`;
    const log = await createLog({
      title: `PHASE0-log-${stamp}`,
      body,
      kind: "note",
      date: new Date().toISOString().slice(0, 10),
      entityIds: createdEntityIds.slice(0, 1),
      classificationStatus: "classified",
      attachmentIds: [],
      private: false,
      source: "manual",
      topics: [],
    });
    createdLogId = log.id;

    const confirmed = await getLog(log.id, true);
    record(
      results,
      "evidence-create",
      Boolean(confirmed && confirmed.body === body),
      confirmed ? `Evidence ${log.id} confirmed after refresh` : "Evidence missing after create"
    );

    const logHits = await searchLogs(`PHASE0-log-${stamp}`, true);
    record(
      results,
      "evidence-search",
      logHits.some((l) => l.id === log.id),
      logHits.some((l) => l.id === log.id) ? "Found in searchLogs" : "Not found in search"
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    record(results, "evidence-create", false, detail);
    record(results, "evidence-search", false, "Skipped — evidence create failed");
  }

  try {
    const health = await getArgusHealthReport();
    const offline = health.subsystems.filter((s) => s.level === "offline");
    record(
      results,
      "health-panel",
      offline.length === 0,
      offline.length === 0
        ? `${health.subsystems.filter((s) => s.level === "healthy").length}/${health.subsystems.length} subsystems healthy`
        : `Offline: ${offline.map((s) => s.label).join(", ")}`
    );
  } catch (err) {
    record(results, "health-panel", false, err instanceof Error ? err.message : "Health failed");
  }

  for (const id of createdEntityIds) {
    await deleteEntity(id);
  }
  if (createdLogId) {
    await deleteLog(createdLogId);
  }
  record(results, "cleanup", true, "Test entities and evidence deleted");

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${failed.length === 0 ? "All Phase 0/1 checks passed." : `${failed.length} check(s) failed.`}`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
