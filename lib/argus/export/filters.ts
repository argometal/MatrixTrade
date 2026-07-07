import type { InboxItem, Log } from "../types";
import type { ExportCollectionOptions } from "./types";

export function inExportDateRange(iso: string, from?: string, to?: string): boolean {
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function filterLogsByDate(logs: Log[], from?: string, to?: string): Log[] {
  if (!from && !to) return logs;
  return logs.filter((log) => inExportDateRange(log.date, from, to));
}

export function filterInboxByDate(inbox: InboxItem[], from?: string, to?: string): InboxItem[] {
  if (!from && !to) return inbox;
  return inbox.filter((item) => inExportDateRange(item.receivedAt, from, to));
}

export function applyExportCollectionOptions<T extends { logs: Log[]; inbox: InboxItem[]; attachments: import("../types").Attachment[] }>(
  collected: T,
  options: ExportCollectionOptions
): T {
  const from = options.fromDate?.trim() || undefined;
  const to = options.toDate?.trim() || undefined;
  const includeLogs = options.includeLogs !== false;
  const includeInbox = options.includeInbox !== false;
  const includeAttachments = options.includeAttachments !== false;

  let logs = includeLogs ? filterLogsByDate(collected.logs, from, to) : [];
  let inbox = includeInbox ? filterInboxByDate(collected.inbox, from, to) : [];
  let attachments = includeAttachments ? collected.attachments : [];

  if (includeAttachments) {
    const attachmentIds = new Set<string>();
    for (const log of logs) {
      for (const id of log.attachmentIds ?? []) attachmentIds.add(id);
    }
    for (const item of inbox) {
      for (const id of item.attachmentIds ?? []) attachmentIds.add(id);
    }
    attachments = collected.attachments.filter((att) => attachmentIds.has(att.id));
  }

  return { ...collected, logs, inbox, attachments };
}
