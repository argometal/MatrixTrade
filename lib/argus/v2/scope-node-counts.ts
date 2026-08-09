/**
 * Canonical Topics / Events node counts — one policy for browse + detail.
 *
 * Library: Topic and Event are graph binders/anchors (entities), not tags.
 * Tags stay on evidence (patterns/badges) and never inflate these counters.
 *
 * Duplicity: counts use Set union (same topic under two projects = 1 on the org).
 * Evidence volume stays unique elsewhere (hierarchy / evidence stream).
 *
 * Hierarchy rollup (org): union of direct links + topics/events on child projects.
 */

import type { ArgusData, Entity, Log } from "../types";
import { referenceKindFromNotes } from "../reference-types";
import { projectsForOrganization } from "./hierarchy";
import { collectProjectLinkIds } from "./entity-link-counts";

export function isTopicEntity(entity: Entity | undefined): boolean {
  return Boolean(entity && !entity.deletedAt && referenceKindFromNotes(entity.notes ?? "") === "topic");
}

export function isEventEntity(entity: Entity | undefined): boolean {
  return Boolean(entity && !entity.deletedAt && referenceKindFromNotes(entity.notes ?? "") === "event");
}

/**
 * All outbound structural link ids for neighborhood / counting.
 * Union every link bag — legacy topic/event rows may store binders in
 * linkedTopicIds / linkedEventIds instead of (or in addition to) linkedEntityIds.
 */
export function outboundStructuralIds(entity: Entity): string[] {
  return collectProjectLinkIds(entity);
}

/** Entities that point at `targetId` (reverse links). */
export function entitiesLinkingTo(data: ArgusData, targetId: string): Entity[] {
  return data.entities.filter((entity) => {
    if (entity.deletedAt || entity.id === targetId) return false;
    return outboundStructuralIds(entity).includes(targetId);
  });
}

/**
 * Ids for the Link modal on a Topic/Event: outbound bags plus reverse Topic↔Event binders.
 * Seeding reverse binders makes one-way Event→Topic visible on the Topic Link control;
 * saving then heals the mirror into linkedEntityIds (add-only).
 */
export function linkModalStructuralIds(data: ArgusData, entity: Entity): string[] {
  const ids = new Set(outboundStructuralIds(entity));
  const kind = referenceKindFromNotes(entity.notes ?? "");
  if (kind !== "topic" && kind !== "event") return [...ids];
  const accept = kind === "topic" ? isEventEntity : isTopicEntity;
  for (const other of entitiesLinkingTo(data, entity.id)) {
    if (accept(other)) ids.add(other.id);
  }
  return [...ids];
}

function addIfTopicOrEvent(
  data: ArgusData,
  id: string,
  topicIds: Set<string>,
  eventIds: Set<string>
) {
  const entity = data.entities.find((e) => e.id === id);
  if (isTopicEntity(entity)) topicIds.add(id);
  else if (isEventEntity(entity)) eventIds.add(id);
}

function collectFromIdList(
  data: ArgusData,
  ids: Iterable<string>,
  topicIds: Set<string>,
  eventIds: Set<string>
) {
  for (const id of ids) addIfTopicOrEvent(data, id, topicIds, eventIds);
}

function collectFromJournalCoMentions(
  data: ArgusData,
  centerId: string,
  logs: Log[],
  topicIds: Set<string>,
  eventIds: Set<string>
) {
  for (const log of logs) {
    if (!log.entityIds.includes(centerId)) continue;
    for (const id of log.entityIds) {
      if (id === centerId) continue;
      addIfTopicOrEvent(data, id, topicIds, eventIds);
    }
  }
}

function centerUsesProjectBridge(entity: Entity): boolean {
  if (entity.type === "company" || entity.type === "person") return true;
  const kind = referenceKindFromNotes(entity.notes ?? "");
  return kind === "topic" || kind === "event";
}

/** Orgs tied to a project (either direction) — keeps `?org=` / `?entity=org` filters in parity with org rollups. */
function associatedOrgIdsForProject(data: ArgusData, project: Entity): string[] {
  if (project.type !== "project" || project.deletedAt) return [];
  const ids = new Set<string>();
  for (const id of project.linkedEntityIds ?? []) {
    const other = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (other?.type === "company") ids.add(other.id);
  }
  for (const org of data.entities) {
    if (org.deletedAt || org.type !== "company") continue;
    if ((org.linkedEntityIds ?? []).includes(project.id)) ids.add(org.id);
  }
  return [...ids];
}

function addParentOrgsForProjects(data: ArgusData, ids: Set<string>) {
  const projectIds = [...ids].filter((id) => {
    const e = data.entities.find((ent) => ent.id === id && !ent.deletedAt);
    return e?.type === "project";
  });
  for (const projectId of projectIds) {
    const project = data.entities.find((e) => e.id === projectId);
    if (!project) continue;
    for (const orgId of associatedOrgIdsForProject(data, project)) {
      ids.add(orgId);
    }
  }
}

/**
 * All structural neighbors (org/project/person/topic/event):
 * outbound + reverse + project bridge + journal co-mentions + parent orgs of linked projects.
 * Use for Connections lists and browse `?entity=` / `?project=` / `?org=` filters.
 */
export function collectNeighborEntityIds(
  data: ArgusData,
  entity: Entity,
  logs: Log[] = []
): Set<string> {
  const ids = new Set<string>();

  for (const id of outboundStructuralIds(entity)) {
    if (id !== entity.id) ids.add(id);
    // Center → project outbound: pull sibling structural links (same as reverse bridge)
    if (centerUsesProjectBridge(entity)) {
      const linked = data.entities.find((e) => e.id === id && !e.deletedAt);
      if (linked?.type === "project") {
        for (const siblingId of outboundStructuralIds(linked)) {
          if (siblingId !== entity.id) ids.add(siblingId);
        }
      }
    }
  }

  for (const other of entitiesLinkingTo(data, entity.id)) {
    ids.add(other.id);
    // Project that links this topic/event/org/person → include sibling structural links
    if (other.type === "project" && centerUsesProjectBridge(entity)) {
      for (const id of outboundStructuralIds(other)) {
        if (id !== entity.id) ids.add(id);
      }
    }
  }

  for (const log of logs) {
    if (!log.entityIds.includes(entity.id)) continue;
    for (const id of log.entityIds) {
      if (id !== entity.id) ids.add(id);
    }
  }

  addParentOrgsForProjects(data, ids);

  return ids;
}

/** Topics/Events linked to one entity (direct + reverse + project bridge + journal). No tag strings. */
export function collectTopicAndEventIdsForEntity(
  data: ArgusData,
  entity: Entity,
  logs: Log[] = []
): { topicIds: Set<string>; eventIds: Set<string> } {
  const topicIds = new Set<string>();
  const eventIds = new Set<string>();

  for (const id of outboundStructuralIds(entity)) {
    addIfTopicOrEvent(data, id, topicIds, eventIds);
    if (centerUsesProjectBridge(entity)) {
      const linked = data.entities.find((e) => e.id === id && !e.deletedAt);
      if (linked?.type === "project") {
        collectFromIdList(data, outboundStructuralIds(linked), topicIds, eventIds);
      }
    }
  }

  for (const other of entitiesLinkingTo(data, entity.id)) {
    if (isTopicEntity(other)) topicIds.add(other.id);
    else if (isEventEntity(other)) eventIds.add(other.id);
    // Project bridge: org/person/topic/event centers pull sibling topics/events from the project
    if (other.type === "project" && centerUsesProjectBridge(entity)) {
      collectFromIdList(data, outboundStructuralIds(other), topicIds, eventIds);
    }
  }

  collectFromJournalCoMentions(data, entity.id, logs, topicIds, eventIds);

  return { topicIds, eventIds };
}

export type ScopeNodeCounts = {
  topicCount: number;
  eventCount: number;
  topicIds: string[];
  eventIds: string[];
};

/**
 * Standard counters for any entity surface.
 * Org: also unions topics/events from associated projects (hierarchical set rollup).
 */
export function countTopicsAndEventsInScope(
  data: ArgusData,
  entity: Entity,
  logs: Log[] = []
): ScopeNodeCounts {
  const { topicIds, eventIds } = collectTopicAndEventIdsForEntity(data, entity, logs);

  if (entity.type === "company") {
    for (const project of projectsForOrganization(data, entity)) {
      const child = collectTopicAndEventIdsForEntity(data, project, logs);
      for (const id of child.topicIds) topicIds.add(id);
      for (const id of child.eventIds) eventIds.add(id);
    }
  }

  return {
    topicCount: topicIds.size,
    eventCount: eventIds.size,
    topicIds: [...topicIds],
    eventIds: [...eventIds],
  };
}
