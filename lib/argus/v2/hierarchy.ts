/**
 * ARGUS v2 hierarchy rules — code mirrors md/argus/design-matrix-stage.md
 *
 * Organization: forever timeline, direct links only (people = roster, not evidence proxy).
 * Project: bounded [startDate, endDate], direct + via linkedPersonIds contacts.
 * Person: direct links only; behavior / risk / performance lens (separate from org roll-up).
 */

import type { Entity, InboxItem, Log } from "../types";
import { isEntityActiveForMetrics, isEntityArchived } from "../entity-lifecycle";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { getEntityHistory } from "../network";
import {
  getAllProjectScopeInbox,
  getProjectEvidenceScope,
  getProjectHomeCounts,
} from "../project-evidence-scope";
import type { ArgusData } from "../types";
import { referenceKindFromNotes } from "../reference-types";

export type LensKind = "organization" | "project" | "person";

export function isOrganizationEntity(entity: Entity): boolean {
  return entity.type === "company";
}

export function isProjectEntity(entity: Entity): boolean {
  return entity.type === "project";
}

export function isPersonEntity(entity: Entity): boolean {
  return entity.type === "person";
}

/** Org shell: people linked on the entity record (roster), not inferred from journal. */
export function organizationLinkedPersonIds(entity: Entity): string[] {
  if (!isOrganizationEntity(entity)) return [];
  return [...new Set([...(entity.linkedPersonIds ?? []), ...(entity.linkedEntityIds ?? [])])];
}

/** Projects associated with an org via project.linkedEntityIds or org.linkedEntityIds. */
export function projectsForOrganization(data: ArgusData, org: Entity): Entity[] {
  if (!isOrganizationEntity(org)) return [];
  const today = new Date().toISOString().slice(0, 10);
  return data.entities
    .filter((e) => e.type === "project" && isEntityActiveForMetrics(e, today))
    .filter(
      (project) =>
        (project.linkedEntityIds ?? []).includes(org.id) ||
        (org.linkedEntityIds ?? []).includes(project.id)
    )
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

/** Organization evidence — direct links only, all dates. */
export function organizationEvidenceScope(
  data: ArgusData,
  inboxItems: InboxItem[],
  org: Entity,
  includePrivate: boolean
) {
  const logs = getEntityHistory(data, org.id, includePrivate);
  const inbox = getLinkedInboxForEntity(inboxItems, org.id, includePrivate);
  return {
    logs,
    inbox,
    logCount: logs.length,
    emailCount: inbox.length,
    totalCount: logs.length + inbox.length,
  };
}

/** Person evidence — direct links only, all dates (HR / performance file). */
export function personEvidenceScope(
  data: ArgusData,
  inboxItems: InboxItem[],
  person: Entity,
  includePrivate: boolean
) {
  if (!isPersonEntity(person)) {
    return { logs: [] as Log[], inbox: [] as InboxItem[], logCount: 0, emailCount: 0, totalCount: 0 };
  }
  return organizationEvidenceScope(data, inboxItems, person, includePrivate);
}

/** Re-export project scope for v2 — bounded dates + via contacts. */
export {
  getAllProjectScopeInbox,
  getProjectEvidenceScope,
  getProjectHomeCounts,
};

export function activeEntities(data: ArgusData, today?: string): Entity[] {
  const day = today ?? new Date().toISOString().slice(0, 10);
  return data.entities.filter((e) => isEntityActiveForMetrics(e, day));
}

export function archivedEntities(data: ArgusData, today?: string): Entity[] {
  const day = today ?? new Date().toISOString().slice(0, 10);
  return data.entities.filter((e) => !e.deletedAt && isEntityArchived(e, day));
}

export function entitiesByKind(data: ArgusData, today?: string) {
  const entities = activeEntities(data, today);
  return {
    organizations: entities.filter(isOrganizationEntity),
    projects: entities.filter(isProjectEntity),
    people: entities.filter(isPersonEntity),
    topics: entities.filter(
      (e) => e.type === "other" && referenceKindFromNotes(e.notes ?? "") === "topic"
    ),
    events: entities.filter(
      (e) => e.type === "other" && referenceKindFromNotes(e.notes ?? "") === "event"
    ),
  };
}
