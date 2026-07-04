import type { ArgusData, Attachment, ClassificationStatus, Entity, InboxItem, Log } from "./types";

export function resolveClassificationStatus(entityIds: string[]): ClassificationStatus {
  return entityIds.length > 0 ? "classified" : "needs_classification";
}

export function normalizeLog(log: Log): Log {
  const entityIds = log.entityIds ?? [];
  const classificationStatus: ClassificationStatus =
    entityIds.length > 0 ? "classified" : "needs_classification";

  return {
    ...log,
    entityIds,
    private: log.private ?? false,
    classificationStatus,
    kind: log.kind ?? "log",
    topics: log.topics ?? [],
    attachmentIds: log.attachmentIds ?? [],
    deletedAt: log.deletedAt,
  };
}

export function normalizeAttachment(att: Attachment): Attachment {
  return {
    ...att,
    parentType: att.parentType ?? "journal",
    parentId: att.parentId ?? "",
    deletedAt: att.deletedAt,
  };
}

export function normalizeEntity(entity: Entity): Entity {
  const raw = entity.strategicValue ?? 3;
  const strategicValue = (raw >= 1 && raw <= 5 ? raw : 3) as Entity["strategicValue"];
  return {
    ...entity,
    alias: entity.alias ?? "",
    notes: entity.notes ?? "",
    strategicValue,
    linkedPersonIds: entity.linkedPersonIds ?? [],
    linkedTopicIds: entity.linkedTopicIds ?? [],
    linkedEventIds: entity.linkedEventIds ?? [],
    linkedEntityIds: entity.linkedEntityIds ?? [],
    linkedTags: entity.linkedTags ?? [],
    startDate: entity.startDate?.slice(0, 10),
    endDate: entity.endDate?.slice(0, 10),
    deletedAt: entity.deletedAt,
  };
}

export function normalizeInboxItem(item: InboxItem): InboxItem {
  const linkedEntityIds = item.linkedEntityIds ?? [];
  let status = item.status ?? "pending";
  if (status !== "archived" && !item.deletedAt) {
    if (item.convertedLogId) status = "converted";
    else if (linkedEntityIds.length > 0 && status === "pending") status = "linked";
  }
  return {
    ...item,
    linkedEntityIds,
    attachmentIds: item.attachmentIds ?? [],
    private: item.private ?? false,
    status,
    deletedAt: item.deletedAt,
  };
}

export function normalizeArgusData(data: ArgusData): ArgusData {
  const logs = (data.logs ?? []).map(normalizeLog);
  const inboxItems = (data.inboxItems ?? []).map(normalizeInboxItem);
  const attachments = backfillAttachmentParents(
    (data.attachments ?? []).map(normalizeAttachment),
    logs,
    inboxItems
  );

  return {
    ...data,
    logs,
    entities: (data.entities ?? []).map(normalizeEntity),
    inboxItems,
    attachments,
    version: 3,
  };
}

/** Infer parent linkage for legacy attachments missing parentType/parentId */
function backfillAttachmentParents(
  attachments: Attachment[],
  logs: Log[],
  inboxItems: ArgusData["inboxItems"]
): Attachment[] {
  const parentByAtt = new Map<string, { parentType: Attachment["parentType"]; parentId: string }>();

  for (const item of inboxItems) {
    for (const aid of item.attachmentIds) {
      parentByAtt.set(aid, { parentType: "inbox", parentId: item.id });
    }
  }
  for (const log of logs) {
    for (const aid of log.attachmentIds) {
      if (!parentByAtt.has(aid)) {
        parentByAtt.set(aid, { parentType: "journal", parentId: log.id });
      }
    }
  }

  return attachments.map((att) => {
    if (att.parentId) return att;
    const inferred = parentByAtt.get(att.id);
    if (!inferred) return att;
    return { ...att, ...inferred };
  });
}
