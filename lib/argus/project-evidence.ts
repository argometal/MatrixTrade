import type { Entity, InboxItem } from "./types";
import { enrichInboxItems, type EnrichedInboxItem } from "./inbox-enrich";
import {
  getAllProjectScopeInbox,
  getDirectProjectInbox,
  getProjectEvidenceScope,
  getProjectHomeCounts,
  getViaContactProjectInbox,
} from "./project-evidence-scope";
import { getInboxItems, readArgus } from "./server-storage";

export {
  getAllProjectScopeInbox,
  getDirectProjectInbox,
  getProjectEvidenceScope,
  getProjectHomeCounts,
  getViaContactProjectInbox,
};

export async function loadEnrichedProjectEvidence(
  project: Entity,
  includePrivate: boolean
): Promise<{
  directInbox: InboxItem[];
  viaContactInbox: InboxItem[];
  directLogs: import("./types").Log[];
  viaContactLogs: import("./types").Log[];
  enrichedInbox: EnrichedInboxItem[];
  viaContactEnrichedInbox: EnrichedInboxItem[];
  emailCount: number;
  logCount: number;
  totalCount: number;
}> {
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const scope = getProjectEvidenceScope(data, inboxItems, project, includePrivate);
  const [enrichedInbox, viaContactEnrichedInbox] = await Promise.all([
    enrichInboxItems(scope.directInbox),
    enrichInboxItems(scope.viaContactInbox),
  ]);

  return {
    ...scope,
    enrichedInbox,
    viaContactEnrichedInbox,
  };
}
