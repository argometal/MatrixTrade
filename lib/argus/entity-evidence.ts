import type { Log } from "./types";
import { enrichInboxItems, type EnrichedInboxItem } from "./inbox-enrich";
import {
  getEntityEvidence,
  getInboxCardsForEntity,
  getLinkedInboxForEntity,
  countProjectLinkedEvidence,
} from "./inbox-entity-links";
import { getInboxItems, readArgus } from "./server-storage";

export {
  getEntityEvidence,
  getInboxCardsForEntity,
  getLinkedInboxForEntity,
  countProjectLinkedEvidence,
};

export async function loadEntityEvidence(entityId: string, includePrivate: boolean) {
  const [data, inboxItemsRaw] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  return getEntityEvidence(data, inboxItemsRaw, entityId, includePrivate);
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
