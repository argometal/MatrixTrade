import type { ArgusData, Entity, InboxItem } from "../types";
import { getAllProjectScopeInbox, getProjectEvidenceScope } from "../project-evidence-scope";

/** True when project scope includes private journal or inbox evidence. */
export function projectHasPrivateEvidence(
  data: ArgusData,
  inboxItems: InboxItem[],
  project: Entity
): boolean {
  const scope = getProjectEvidenceScope(data, inboxItems, project, true);
  const inbox = getAllProjectScopeInbox(inboxItems, project, true);
  const logs = [...scope.directLogs, ...scope.viaContactLogs];
  return logs.some((log) => log.private) || inbox.some((item) => item.private);
}
