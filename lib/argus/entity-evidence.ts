import type { ArgusData, InboxItem } from "./types";
import { getEntityHistory } from "./network";
import { getInboxItems, readArgus } from "./server-storage";
import { isActiveRecord } from "./supabase-protection/protected-counts";

/** Inbox items linked to an entity that are not yet fully converted to a log. */
export function getLinkedInboxForEntity(inboxItems: InboxItem[], entityId: string): InboxItem[] {
  return inboxItems
    .filter(isActiveRecord)
    .filter((item) => (item.linkedEntityIds ?? []).includes(entityId))
    .filter((item) => item.status === "pending" || item.status === "linked")
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function getEntityEvidence(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean
) {
  return {
    logs: getEntityHistory(data, entityId, includePrivate),
    linkedInbox: getLinkedInboxForEntity(inboxItems, entityId),
  };
}

export async function loadEntityEvidence(entityId: string, includePrivate: boolean) {
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems()]);
  return getEntityEvidence(data, inboxItems, entityId, includePrivate);
}
