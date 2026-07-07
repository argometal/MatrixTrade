import type { ArgusData, Attachment, Entity, InboxItem, Log } from "../types";
import { filterPrivateInbox, filterPrivateLogs } from "../private-access";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import {
  getAllProjectScopeInbox,
  getProjectEvidenceScope,
  organizationEvidenceScope,
} from "../v2/hierarchy";
import { buildInboxLogCrossReferences } from "./dedup";
import { applyExportCollectionOptions } from "./filters";
import { resolveExportScope } from "./resolve-scope";
import type { CollectedVaultEvidence, ExportCollectionOptions, ExportScopeType } from "./types";

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function collectAttachmentIds(logs: Log[], inbox: InboxItem[]): Set<string> {
  const ids = new Set<string>();
  for (const log of logs) {
    for (const id of log.attachmentIds ?? []) ids.add(id);
  }
  for (const item of inbox) {
    for (const id of item.attachmentIds ?? []) ids.add(id);
  }
  return ids;
}

function resolveAttachments(data: ArgusData, attachmentIds: Set<string>): Attachment[] {
  return data.attachments.filter((att) => isActiveRecord(att) && attachmentIds.has(att.id));
}

function relatedEntityIdsFromEvidence(logs: Log[], inbox: InboxItem[], anchorId: string): string[] {
  const ids = new Set<string>();
  for (const log of logs) {
    for (const id of log.entityIds) {
      if (id !== anchorId) ids.add(id);
    }
  }
  for (const item of inbox) {
    for (const id of item.linkedEntityIds ?? []) {
      if (id !== anchorId) ids.add(id);
    }
  }
  return [...ids].sort();
}

function containsPrivateRecords(logs: Log[], inbox: InboxItem[]): boolean {
  return logs.some((log) => log.private) || inbox.some((item) => item.private);
}

function collectScopedLogsAndInbox(
  data: ArgusData,
  inboxItems: InboxItem[],
  entity: Entity,
  scopeType: ExportScopeType,
  includePrivate: boolean
): { logs: Log[]; inbox: InboxItem[] } {
  if (scopeType === "project") {
    const scope = getProjectEvidenceScope(data, inboxItems, entity, includePrivate);
    return {
      logs: uniqueById([...scope.directLogs, ...scope.viaContactLogs]),
      inbox: uniqueById(getAllProjectScopeInbox(inboxItems, entity, includePrivate)),
    };
  }

  const scope = organizationEvidenceScope(data, inboxItems, entity, includePrivate);
  return { logs: scope.logs, inbox: scope.inbox };
}

function includeConversionLogs(
  data: ArgusData,
  inbox: InboxItem[],
  logs: Log[],
  includePrivate: boolean
): Log[] {
  const inboxIds = new Set(inbox.map((item) => item.id));
  const visibleLogs = filterPrivateLogs(
    data.logs.filter((log) => isActiveRecord(log)),
    includePrivate
  );
  const linked = visibleLogs.filter(
    (log) => log.inboxItemId && inboxIds.has(log.inboxItemId)
  );
  return uniqueById([...logs, ...linked]).sort((a, b) => b.date.localeCompare(a.date));
}

export function collectVaultEvidence(input: {
  data: ArgusData;
  inboxItems: InboxItem[];
  scopeType: ExportScopeType;
  scopeId: string;
  includePrivate: boolean;
  options?: ExportCollectionOptions;
}): CollectedVaultEvidence | null {
  const { data, inboxItems, scopeType, scopeId, includePrivate, options } = input;
  const resolved = resolveExportScope(data, scopeType, scopeId);
  if (!resolved) return null;

  const { entity, scope } = resolved;
  const visibleInbox = filterPrivateInbox(
    inboxItems.filter((item) => isActiveRecord(item)),
    includePrivate
  );

  let { logs, inbox } = collectScopedLogsAndInbox(data, visibleInbox, entity, scopeType, includePrivate);
  logs = includeConversionLogs(data, inbox, logs, includePrivate);
  inbox = [...inbox].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  const attachmentIds = collectAttachmentIds(logs, inbox);
  const attachments = resolveAttachments(data, attachmentIds);

  const base = {
    scope,
    entity,
    logs,
    inbox,
    attachments,
    crossReferences: buildInboxLogCrossReferences(logs, inbox),
    relatedEntityIds: relatedEntityIdsFromEvidence(logs, inbox, entity.id),
    containsPrivate: containsPrivateRecords(logs, inbox),
  };

  return applyExportCollectionOptions(base, options ?? {});
}
