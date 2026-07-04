import { promises as fs } from "fs";
import path from "path";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isCloudInboxStore } from "../inbox-store/config";
import { isCloudJournalStore } from "../journal-store/config";
import { readJournalFromSupabase } from "../journal-store/supabase";
import { migrateToV3 } from "../migrate";
import { normalizeArgusData } from "../normalize";
import type { ArgusData, InboxItem } from "../types";
import { getArgusStoragePaths } from "../storage/paths";
import { countProtectedFromJournal, type ProtectedCounts } from "./protected-counts";

export interface ArgusSupabaseExport {
  exportedAt: string;
  tables: {
    argus_inbox_items: unknown[];
    argus_attachments: unknown[];
    argus_journal: unknown[];
  };
  protectedCounts: ProtectedCounts;
}

function exportFileName(iso: string): string {
  return `supabase-${iso.replace(/[:.]/g, "-")}.json`;
}

async function readLocalJournal(): Promise<ArgusData> {
  const { journalFile } = getArgusStoragePaths();
  try {
    const raw = await fs.readFile(journalFile, "utf-8");
    return normalizeArgusData(migrateToV3(JSON.parse(raw)));
  } catch {
    return { entities: [], logs: [], inboxItems: [], attachments: [], version: 3 };
  }
}

export async function readJournalForCounts(): Promise<ArgusData> {
  if (isCloudJournalStore()) {
    const cloud = await readJournalFromSupabase();
    if (cloud) return cloud;
  }
  return readLocalJournal();
}

/** Export ARGUS Supabase tables to timestamped JSON (includes soft-deleted rows). */
export async function exportArgusSupabaseTables(destDir?: string): Promise<string> {
  if (!isCloudInboxStore() && !isCloudJournalStore()) {
    throw new Error("Supabase export requires ARGUS_INBOX_STORE=supabase and/or ARGUS_JOURNAL_STORE=supabase");
  }

  const supabase = createSupabaseAdmin();
  const inboxRows: unknown[] = [];
  const attachmentRows: unknown[] = [];
  const journalRows: unknown[] = [];

  if (isCloudInboxStore()) {
    const { data: inbox, error: inboxErr } = await supabase.from("argus_inbox_items").select("*");
    if (inboxErr) throw new Error(`Export inbox failed: ${inboxErr.message}`);
    inboxRows.push(...(inbox ?? []));

    const { data: attachments, error: attErr } = await supabase.from("argus_attachments").select("*");
    if (attErr) throw new Error(`Export attachments failed: ${attErr.message}`);
    attachmentRows.push(...(attachments ?? []));
  }

  if (isCloudJournalStore()) {
    const { data: journal, error: journalErr } = await supabase.from("argus_journal").select("*");
    if (journalErr) throw new Error(`Export journal failed: ${journalErr.message}`);
    journalRows.push(...(journal ?? []));
  }

  const journalData = await readJournalForCounts();
  const inboxItemsForCounts = isCloudInboxStore()
    ? inboxRows
        .filter((r) => !(r as { deleted_at?: string | null }).deleted_at)
        .map((r) => {
          const row = r as Record<string, unknown>;
          return {
            id: String(row.id),
            receivedAt: String(row.received_at),
            source: row.source as InboxItem["source"],
            rawText: String(row.raw_text ?? ""),
            attachmentIds: (row.attachment_ids as string[]) ?? [],
            linkedEntityIds: (row.linked_entity_ids as string[]) ?? [],
            status: row.status as InboxItem["status"],
            createdAt: String(row.created_at),
          } satisfies InboxItem;
        })
    : undefined;

  const protectedCounts = countProtectedFromJournal(
    journalData,
    inboxItemsForCounts
  );

  const payload: ArgusSupabaseExport = {
    exportedAt: new Date().toISOString(),
    tables: {
      argus_inbox_items: inboxRows,
      argus_attachments: attachmentRows,
      argus_journal: journalRows,
    },
    protectedCounts,
  };

  const dir = destDir ?? getArgusStoragePaths().backupsDir;
  await fs.mkdir(dir, { recursive: true });
  const stamp = payload.exportedAt;
  const filePath = path.join(dir, exportFileName(stamp));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  return filePath;
}

export async function restoreArgusSupabaseFromExport(exportPath: string): Promise<void> {
  const raw = await fs.readFile(exportPath, "utf-8");
  const payload = JSON.parse(raw) as ArgusSupabaseExport;
  const supabase = createSupabaseAdmin();

  if (payload.tables.argus_journal.length > 0) {
    for (const row of payload.tables.argus_journal) {
      const { error } = await supabase.from("argus_journal").upsert(row);
      if (error) throw new Error(`Restore journal failed: ${error.message}`);
    }
  }

  if (payload.tables.argus_inbox_items.length > 0) {
    for (const row of payload.tables.argus_inbox_items) {
      const { error } = await supabase.from("argus_inbox_items").upsert(row);
      if (error) throw new Error(`Restore inbox failed: ${error.message}`);
    }
  }

  if (payload.tables.argus_attachments.length > 0) {
    for (const row of payload.tables.argus_attachments) {
      const { error } = await supabase.from("argus_attachments").upsert(row);
      if (error) throw new Error(`Restore attachments failed: ${error.message}`);
    }
  }
}
