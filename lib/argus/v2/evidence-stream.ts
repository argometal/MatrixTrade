import type { ArgusData, InboxItem, Log } from "../types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { relativeActivityLabel } from "./timeline-builders";

export type V2EvidenceStreamKind = "email" | "journal" | "photo" | "file";

export interface V2EvidenceStreamItem {
  id: string;
  kind: V2EvidenceStreamKind;
  title: string;
  meta: string;
  sortIso: string;
  href: string;
}

export type V2EvidenceStreamCounts = {
  journalCount: number;
  emailCount: number;
  fileCount: number;
  photoCount: number;
  evidenceCount: number;
};

function logKindLabel(kind: Log["kind"]): string {
  if (kind === "log") return "Log";
  if (kind === "follow_up") return "Follow-up";
  return "Note";
}

/** Unified chronological evidence for any entity — journal, inbox, attachments. */
export function buildEntityEvidenceStream(
  data: ArgusData,
  entityId: string,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2EvidenceStreamItem[] {
  const inbox = getLinkedInboxForEntity(inboxItems, entityId, includePrivate);
  const history = getEntityHistory(data, entityId, includePrivate);
  const items: V2EvidenceStreamItem[] = [];

  for (const item of inbox) {
    items.push({
      id: `email-${item.id}`,
      kind: "email",
      title: item.subject || "(No subject)",
      meta: `${item.from?.replace(/<.*>/, "").trim() || "Unknown"} · ${relativeActivityLabel(item.receivedAt, today)}`,
      sortIso: item.receivedAt,
      href: `/argus/v2/inbox?selected=${item.id}`,
    });
    for (const aid of item.attachmentIds ?? []) {
      const att = data.attachments.find((a) => a.id === aid && !a.deletedAt);
      if (!att) continue;
      const isPhoto = att.mimeType.startsWith("image/");
      items.push({
        id: `att-${att.id}`,
        kind: isPhoto ? "photo" : "file",
        title: att.fileName,
        meta: `${isPhoto ? "Photo" : "File"} from email · ${relativeActivityLabel(item.receivedAt, today)}`,
        sortIso: item.receivedAt,
        href: isPhoto ? `/api/argus/files/${att.id}?inline=1` : `/api/argus/files/${att.id}`,
      });
    }
  }

  for (const log of history) {
    items.push({
      id: `journal-${log.id}`,
      kind: "journal",
      title: log.title || "Journal entry",
      meta: `${logKindLabel(log.kind)} · ${relativeActivityLabel(log.updatedAt || log.date, today)}`,
      sortIso: log.updatedAt || log.date,
      href: `/argus/logs/${log.id}`,
    });
    for (const aid of log.attachmentIds ?? []) {
      const att = data.attachments.find((a) => a.id === aid && !a.deletedAt);
      if (!att) continue;
      const isPhoto = att.mimeType.startsWith("image/");
      items.push({
        id: `att-${att.id}`,
        kind: isPhoto ? "photo" : "file",
        title: att.fileName,
        meta: `${isPhoto ? "Photo" : "File"} from journal · ${relativeActivityLabel(log.date, today)}`,
        sortIso: log.date,
        href: isPhoto ? `/api/argus/files/${att.id}?inline=1` : `/api/argus/files/${att.id}`,
      });
    }
  }

  return items.sort((a, b) => b.sortIso.localeCompare(a.sortIso));
}

export function countEvidenceStream(items: V2EvidenceStreamItem[]): V2EvidenceStreamCounts {
  let journalCount = 0;
  let emailCount = 0;
  let fileCount = 0;
  let photoCount = 0;
  for (const item of items) {
    if (item.kind === "journal") journalCount += 1;
    else if (item.kind === "email") emailCount += 1;
    else if (item.kind === "file") fileCount += 1;
    else if (item.kind === "photo") photoCount += 1;
  }
  return {
    journalCount,
    emailCount,
    fileCount,
    photoCount,
    evidenceCount: items.length,
  };
}

export function latestEvidenceIso(items: V2EvidenceStreamItem[], fallback?: string): string {
  return items[0]?.sortIso ?? fallback ?? "";
}
