import type { ArgusData, Attachment, ClassificationStatus, Log } from "./types";

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
    classificationStatus,
    kind: log.kind ?? "log",
    topics: log.topics ?? [],
    attachmentIds: log.attachmentIds ?? [],
  };
}

export function normalizeAttachment(att: Attachment): Attachment {
  return {
    ...att,
    parentType: att.parentType ?? "journal",
    parentId: att.parentId ?? "",
  };
}

export function normalizeArgusData(data: ArgusData): ArgusData {
  const logs = (data.logs ?? []).map(normalizeLog);
  const inboxItems = data.inboxItems ?? [];
  const attachments = backfillAttachmentParents(
    (data.attachments ?? []).map(normalizeAttachment),
    logs,
    inboxItems
  );

  return {
    ...data,
    logs,
    entities: data.entities ?? [],
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
