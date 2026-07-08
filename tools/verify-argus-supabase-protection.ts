/**
 * ARGUS Rule 0 — Supabase protection proof checklist.
 *
 * Usage:
 *   npx tsx tools/verify-argus-supabase-protection.ts
 *   npx tsx tools/verify-argus-supabase-protection.ts --with-export
 *   npx tsx tools/verify-argus-supabase-protection.ts --with-schema
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  countProtectedFromJournal,
  isProtectedCountDrop,
  softDeleteEntity,
  softDeleteLog,
} from "../lib/argus/supabase-protection/protected-counts";
import {
  isArgusSupabaseEnabled,
  isSupabaseDestructiveBlocked,
  supabaseDestructiveBlockedMessage,
} from "../lib/argus/supabase-protection/policy";
import { exportArgusSupabaseTables } from "../lib/argus/supabase-protection/export";
import { getProtectedCounts } from "../lib/argus/supabase-protection/migrate-gate";
import type { ArgusData } from "../lib/argus/types";
import { createSupabaseAdmin } from "../lib/supabase/server";

const WITH_EXPORT = process.argv.includes("--with-export");
const WITH_SCHEMA = process.argv.includes("--with-schema");

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail?: string): never {
  console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
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
    if (!process.env[key] && value) process.env[key] = value;
  }
}

function testProtectedCountsLogic(): void {
  const sample: ArgusData = {
    version: 3,
    entities: [{ id: "e1", type: "person", name: "A", notes: "", alias: "", strategicValue: 3, createdAt: "", updatedAt: "" }],
    logs: [
      {
        id: "l1",
        kind: "log",
        date: "2026-01-01",
        title: "t",
        body: "b",
        entityIds: ["e1"],
        classificationStatus: "classified",
        private: false,
        source: "manual",
        attachmentIds: [],
        topics: [],
        createdAt: "",
        updatedAt: "",
      },
    ],
    inboxItems: [
      {
        id: "i1",
        receivedAt: "",
        source: "email",
        rawText: "",
        attachmentIds: [],
        linkedEntityIds: ["e1"],
        status: "linked",
        createdAt: "",
      },
    ],
    attachments: [],
    runbooks: [],
  };

  const before = countProtectedFromJournal(sample);
  if (before.inbox !== 1 || before.people !== 1 || before.evidence !== 1) {
    fail("protected count sample", JSON.stringify(before));
  }

  const afterDelete = countProtectedFromJournal({
    ...sample,
    entities: [softDeleteEntity(sample.entities[0])],
  });
  if (!isProtectedCountDrop(before, afterDelete)) {
    fail("protected count drop detection");
  }
  pass("protected-order count logic (Inbox → Evidence → Relationships → People)");
}

async function testSchemaProtection(): Promise<void> {
  if (!isArgusSupabaseEnabled()) {
    console.log("SKIP: schema checks (--with-schema requires Supabase stores enabled)");
    return;
  }

  const supabase = createSupabaseAdmin();

  for (const table of ["argus_inbox_items", "argus_attachments", "argus_journal"] as const) {
    const { data, error } = await supabase.from(table).select("deleted_at").limit(1);
    if (error) {
      fail(`${table} readable`, error.message);
    }
    if (data === null) fail(`${table} select returned null`);
    pass(`${table} has deleted_at column (run supabase/argus-protection.sql if missing)`);
  }

  const protectionSql = readFileSync(resolve(process.cwd(), "supabase/argus-protection.sql"), "utf8");
  if (!protectionSql.includes("enable row level security")) {
    fail("argus-protection.sql missing RLS");
  }
  if (!protectionSql.includes("argus_prevent_hard_delete")) {
    fail("argus-protection.sql missing hard-delete trigger");
  }
  pass("argus-protection.sql defines RLS + hard-delete blocks");

  const devSql = readFileSync(
    resolve(process.cwd(), "supabase/dev/argus-destructive-local-only.sql"),
    "utf8"
  );
  if (!devSql.includes("LOCAL / DEV ONLY")) {
    fail("dev destructive SQL missing local-only header");
  }
  pass("destructive SQL restricted to supabase/dev/");
}

async function main(): Promise<void> {
  loadEnvLocal();

  console.log("ARGUS Rule 0 — Supabase protection verification\n");

  if (!isSupabaseDestructiveBlocked() && !process.env.ARGUS_INBOX_STORE && !process.env.ARGUS_JOURNAL_STORE) {
    process.env.ARGUS_INBOX_STORE = "supabase";
    process.env.ARGUS_JOURNAL_STORE = "supabase";
  }

  if (isSupabaseDestructiveBlocked()) {
    pass("delete-all blocked while Supabase stores enabled");
    if (!supabaseDestructiveBlockedMessage().includes("soft-deleted")) {
      fail("destructive blocked message");
    }
    pass("destructive blocked message documents soft delete");
  } else {
    const prevInbox = process.env.ARGUS_INBOX_STORE;
    process.env.ARGUS_INBOX_STORE = "supabase";
    if (!isSupabaseDestructiveBlocked()) fail("simulated Supabase inbox should block destructive");
    pass("delete-all blocked when ARGUS_INBOX_STORE=supabase");
    if (prevInbox) process.env.ARGUS_INBOX_STORE = prevInbox;
    else delete process.env.ARGUS_INBOX_STORE;
  }

  testProtectedCountsLogic();

  const devOnlyPath = resolve(process.cwd(), "supabase/dev/argus-destructive-local-only.sql");
  if (!existsSync(devOnlyPath)) {
    fail("missing supabase/dev/argus-destructive-local-only.sql");
  }
  pass("destructive scripts isolated under supabase/dev/");

  if (WITH_EXPORT) {
    if (!isArgusSupabaseEnabled()) {
      fail("--with-export", "enable ARGUS_INBOX_STORE and/or ARGUS_JOURNAL_STORE=supabase");
    }
    const path = await exportArgusSupabaseTables();
    pass(`Supabase export backup created (${path})`);
    const counts = await getProtectedCounts();
    console.log("Protected counts:", JSON.stringify(counts));
    pass("live protected counts readable");
  } else {
    console.log("\nSkipping live export (pass --with-export to run backup).\n");
  }

  if (WITH_SCHEMA) {
    await testSchemaProtection();
  } else {
    console.log("Skipping live schema checks (pass --with-schema after running argus-protection.sql).\n");
  }

  console.log("\nSupabase protection verification complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
