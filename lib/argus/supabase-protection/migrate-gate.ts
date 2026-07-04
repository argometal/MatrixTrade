import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isCloudInboxStore } from "../inbox-store/config";
import { isCloudJournalStore } from "../journal-store/config";
import type { InboxItem } from "../types";
import {
  countProtectedFromJournal,
  formatProtectedCounts,
  isProtectedCountDrop,
  type ProtectedCounts,
} from "./protected-counts";
import { exportArgusSupabaseTables, readJournalForCounts, restoreArgusSupabaseFromExport } from "./export";

function rowToInboxItem(row: Record<string, unknown>): InboxItem {
  return {
    id: String(row.id),
    receivedAt: String(row.received_at),
    source: row.source as InboxItem["source"],
    rawText: String(row.raw_text ?? ""),
    rawEmail: row.raw_email ? String(row.raw_email) : undefined,
    subject: row.subject ? String(row.subject) : undefined,
    from: row.from_address ? String(row.from_address) : undefined,
    to: row.to_address ? String(row.to_address) : undefined,
    attachmentIds: (row.attachment_ids as string[]) ?? [],
    linkedEntityIds: (row.linked_entity_ids as string[]) ?? [],
    status: row.status as InboxItem["status"],
    convertedLogId: row.converted_log_id ? String(row.converted_log_id) : undefined,
    createdAt: String(row.created_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
  };
}

async function fetchActiveInboxFromSupabase(): Promise<InboxItem[]> {
  if (!isCloudInboxStore()) return [];
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("argus_inbox_items")
    .select("*")
    .is("deleted_at", null);
  if (error) throw new Error(`Protected inbox count failed: ${error.message}`);
  return (data ?? []).map((row) => rowToInboxItem(row as Record<string, unknown>));
}

/** Protected-order counts across Supabase + journal blob. */
export async function getProtectedCounts(): Promise<ProtectedCounts> {
  const journal = await readJournalForCounts();
  const inboxOverride = isCloudInboxStore() ? await fetchActiveInboxFromSupabase() : undefined;
  return countProtectedFromJournal(journal, inboxOverride);
}

export class ArgusMigrationBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgusMigrationBlockedError";
  }
}

/**
 * Rule 0 migration gate: export → pre-count → migrate → post-count → rollback on drop.
 */
export async function runArgusSupabaseMigration(
  label: string,
  migrate: () => Promise<void>
): Promise<{ backupPath: string; before: ProtectedCounts; after: ProtectedCounts }> {
  if (!isCloudInboxStore() && !isCloudJournalStore()) {
    throw new Error(`${label}: no Supabase ARGUS store enabled`);
  }

  const backupPath = await exportArgusSupabaseTables();
  const before = await getProtectedCounts();

  try {
    await migrate();
  } catch (err) {
    await restoreArgusSupabaseFromExport(backupPath).catch(() => {});
    throw err;
  }

  const after = await getProtectedCounts();
  if (isProtectedCountDrop(before, after)) {
    await restoreArgusSupabaseFromExport(backupPath).catch(() => {});
    throw new ArgusMigrationBlockedError(
      `${label} blocked: protected count drop ${formatProtectedCounts(before)} → ${formatProtectedCounts(after)}`
    );
  }

  return { backupPath, before, after };
}
