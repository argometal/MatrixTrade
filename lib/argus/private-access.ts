import type { InboxItem, Log } from "./types";

export function isProtectedRecord(record: { private?: boolean }): boolean {
  return Boolean(record.private);
}

export function filterPrivateLogs<T extends { private?: boolean }>(
  logs: T[],
  includePrivate: boolean
): T[] {
  if (includePrivate) return logs;
  return logs.filter((entry) => !entry.private);
}

export function filterPrivateInbox<T extends { private?: boolean }>(
  items: T[],
  includePrivate: boolean
): T[] {
  if (includePrivate) return items;
  return items.filter((item) => !item.private);
}

export function canAccessProtectedRecord(
  record: { private?: boolean },
  includePrivate: boolean
): boolean {
  return includePrivate || !isProtectedRecord(record);
}

export function countHiddenProtected(logs: Log[], inboxItems: InboxItem[]): number {
  return logs.filter((log) => log.private).length + inboxItems.filter((item) => item.private).length;
}
