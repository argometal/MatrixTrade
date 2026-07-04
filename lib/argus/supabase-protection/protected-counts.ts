import type { ArgusData, Entity, InboxItem, Log } from "../types";

/** Active = not soft-deleted. */
export function isActiveRecord(record: { deletedAt?: string }): boolean {
  return !record.deletedAt;
}

export interface ProtectedCounts {
  /** Priority 1 — inbox items */
  inbox: number;
  /** Priority 2 — journal logs + journal-scoped attachment metadata */
  evidence: number;
  /** Priority 3 — entity/log/inbox/project link edges */
  relationships: number;
  /** Priority 4 — entity records (people, companies, projects, other) */
  people: number;
}

export function countRelationshipsInJournal(data: ArgusData, inboxItems: InboxItem[]): number {
  let edges = 0;
  for (const log of data.logs) {
    if (!isActiveRecord(log)) continue;
    edges += log.entityIds.length;
  }
  for (const item of inboxItems) {
    if (!isActiveRecord(item)) continue;
    edges += (item.linkedEntityIds ?? []).length;
  }
  for (const entity of data.entities) {
    if (!isActiveRecord(entity)) continue;
    edges += (entity.linkedPersonIds ?? []).length;
  }
  return edges;
}

export function countProtectedFromJournal(data: ArgusData, inboxOverride?: InboxItem[]): ProtectedCounts {
  const inboxItems = inboxOverride ?? data.inboxItems;
  const activeInbox = inboxItems.filter(isActiveRecord);
  const activeLogs = data.logs.filter(isActiveRecord);
  const activeEntities = data.entities.filter(isActiveRecord);
  const activeJournalAttachments = data.attachments.filter(
    (a) => isActiveRecord(a) && a.parentType === "journal"
  );

  return {
    inbox: activeInbox.length,
    evidence: activeLogs.length + activeJournalAttachments.length,
    relationships: countRelationshipsInJournal(data, inboxItems),
    people: activeEntities.length,
  };
}

export function isProtectedCountDrop(before: ProtectedCounts, after: ProtectedCounts): boolean {
  return (
    after.inbox < before.inbox ||
    after.evidence < before.evidence ||
    after.relationships < before.relationships ||
    after.people < before.people
  );
}

export function formatProtectedCounts(counts: ProtectedCounts): string {
  return JSON.stringify(counts);
}

export function softDeleteEntity(entity: Entity, at = new Date().toISOString()): Entity {
  return { ...entity, deletedAt: at, updatedAt: at };
}

export function softDeleteLog(log: Log, at = new Date().toISOString()): Log {
  return { ...log, deletedAt: at, updatedAt: at };
}

export function softDeleteInboxItem(item: InboxItem, at = new Date().toISOString()): InboxItem {
  return { ...item, deletedAt: at };
}
