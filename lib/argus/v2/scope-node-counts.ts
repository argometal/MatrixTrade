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

/** All outbound structural link ids for neighborhood / counting. */
export function outboundStructuralIds(entity: Entity): string[] {
  if (entity.type === "project") return collectProjectLinkIds(entity);
  return [
    ...new Set([...(entity.linkedEntityIds ?? []), ...(entity.linkedPersonIds ?? [])]),
  ];
}

/** Entities that point at `targetId` (reverse links). */
export function entitiesLinkingTo(data: ArgusData, targetId: string): Entity[] {
  return data.entities.filter((entity) => {
    if (entity.deletedAt || entity.id === targetId) return false;
    return outboundStructuralIds(entity).includes(targetId);
  });
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

/** Topics/Events linked to one entity (direct + reverse + journal co-mention). No tag strings. */
export function collectTopicAndEventIdsForEntity(
  data: ArgusData,
  entity: Entity,
  logs: Log[] = []
): { topicIds: Set<string>; eventIds: Set<string> } {
  const topicIds = new Set<string>();
  const eventIds = new Set<string>();

  collectFromIdList(data, outboundStructuralIds(entity), topicIds, eventIds);

  for (const other of entitiesLinkingTo(data, entity.id)) {
    if (isTopicEntity(other)) topicIds.add(other.id);
    else if (isEventEntity(other)) eventIds.add(other.id);
    // When a project links to this org/person, also pull that project's topics/events
    if (other.type === "project" && (entity.type === "company" || entity.type === "person")) {
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
