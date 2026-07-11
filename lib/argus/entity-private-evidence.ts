import { getLinkedInboxForEntity } from "./inbox-entity-links";
import { getEntityHistory } from "./network";
import type { ArgusData, Entity, InboxItem } from "./types";
import { getProjectEvidenceScope } from "./project-evidence-scope";

/** True when entity-linked journal or inbox evidence includes private rows. */
export function entityHasPrivateEvidence(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string
): boolean {
  const history = getEntityHistory(data, entityId, true);
  const inbox = getLinkedInboxForEntity(inboxItems, entityId, true);
  return history.some((log) => log.private) || inbox.some((item) => item.private);
}

/** Project scope — direct + via contacts (broader than entity link ids). */
export function projectHasPrivateEvidence(
  data: ArgusData,
  inboxItems: InboxItem[],
  project: Entity
): boolean {
  const scope = getProjectEvidenceScope(data, inboxItems, project, true);
  const inbox = scope.directInbox.concat(scope.viaContactInbox);
  const logs = scope.directLogs.concat(scope.viaContactLogs);
  return logs.some((log) => log.private) || inbox.some((item) => item.private);
}

export function resolveEntityPrivateEvidence(
  data: ArgusData,
  inboxItems: InboxItem[],
  entity: Entity
): boolean {
  if (entity.type === "project") return projectHasPrivateEvidence(data, inboxItems, entity);
  return entityHasPrivateEvidence(data, inboxItems, entity.id);
}
