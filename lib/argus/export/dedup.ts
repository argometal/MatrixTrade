import type { InboxItem, Log } from "../types";
import type { EvidenceCrossReference } from "./types";

export function buildInboxLogCrossReferences(
  logs: Log[],
  inbox: InboxItem[]
): EvidenceCrossReference[] {
  const refs: EvidenceCrossReference[] = [];
  const logByInboxId = new Map<string, Log>();

  for (const log of logs) {
    if (log.inboxItemId) logByInboxId.set(log.inboxItemId, log);
  }

  for (const item of inbox) {
    const logId = item.convertedLogId;
    if (logId) {
      refs.push({ inboxId: item.id, logId, relation: "converted" });
      continue;
    }
    const linked = logByInboxId.get(item.id);
    if (linked) {
      refs.push({ inboxId: item.id, logId: linked.id, relation: "converted" });
    }
  }

  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.inboxId}:${ref.logId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Unique email evidence — inbox rows are canonical; converted logs are not extra emails. */
export function uniqueEmailCount(inbox: InboxItem[]): number {
  return inbox.length;
}

export function evidenceRecordCount(logs: Log[], inbox: InboxItem[]): number {
  return logs.length + inbox.length;
}
