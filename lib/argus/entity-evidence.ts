import type { ArgusData, Entity, InboxItem, Log } from "./types";
import { getEntityHistory } from "./network";
import { getInboxItems, readArgus } from "./server-storage";
import { isActiveRecord } from "./supabase-protection/protected-counts";
import { enrichInboxItems, type EnrichedInboxItem } from "./inbox-enrich";

/** Inbox items linked to an entity (any active status except archived). */
export function getLinkedInboxForEntity(inboxItems: InboxItem[], entityId: string): InboxItem[] {
  return inboxItems
    .filter(isActiveRecord)
    .filter((item) => (item.linkedEntityIds ?? []).includes(entityId))
    .filter((item) => item.status !== "archived")
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/** Inbox cards to show — pending/linked only; converted items appear as journal logs. */
export function getInboxCardsForEntity(inboxItems: InboxItem[], entityId: string): InboxItem[] {
  return getLinkedInboxForEntity(inboxItems, entityId).filter(
    (item) => item.status === "pending" || item.status === "linked"
  );
}

export function getEntityEvidence(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean
) {
  const logs = getEntityHistory(data, entityId, includePrivate);
  const allLinkedInbox = getLinkedInboxForEntity(inboxItems, entityId);
  const linkedInbox = getInboxCardsForEntity(inboxItems, entityId);

  return {
    logs,
    linkedInbox,
    emailCount: allLinkedInbox.length,
    logCount: logs.length,
    totalCount: allLinkedInbox.length + logs.length,
  };
}

export async function loadEntityEvidence(entityId: string, includePrivate: boolean) {
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems()]);
  return getEntityEvidence(data, inboxItems, entityId, includePrivate);
}

export async function loadEnrichedEntityEvidence(
  entityId: string,
  includePrivate: boolean
): Promise<{
  logs: Log[];
  enrichedInbox: EnrichedInboxItem[];
  emailCount: number;
  logCount: number;
  totalCount: number;
}> {
  const base = await loadEntityEvidence(entityId, includePrivate);
  const enrichedInbox = await enrichInboxItems(base.linkedInbox);
  return {
    logs: base.logs,
    enrichedInbox,
    emailCount: base.emailCount,
    logCount: base.logCount,
    totalCount: base.totalCount,
  };
}

export function countProjectLinkedEvidence(
  projectId: string,
  logs: Log[],
  inboxItems: InboxItem[]
): { logCount: number; inboxCount: number; linkedCount: number } {
  const logCount = logs.filter((log) => log.entityIds.includes(projectId)).length;
  const inboxCount = getLinkedInboxForEntity(inboxItems, projectId).length;
  return { logCount, inboxCount, linkedCount: logCount + inboxCount };
}
