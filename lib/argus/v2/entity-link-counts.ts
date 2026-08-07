import type { ArgusData, Entity, Log } from "../types";
import { referenceKindFromNotes } from "../reference-types";

export type LinkKindCounts = {
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  topicCount: number;
  eventCount: number;
};

/**
 * @deprecated Use `collectNeighborEntityIds` from `scope-node-counts.ts`
 * (outbound + reverse + project bridge + co-mention + parent orgs).
 * Kept as a thin outbound+journal helper for legacy call sites only.
 */
export function collectRelatedEntityIds(entity: Entity, logs: Log[]): Set<string> {
  const ids = new Set<string>([
    ...(entity.linkedEntityIds ?? []),
    ...(entity.linkedPersonIds ?? []),
  ]);
  for (const log of logs) {
    if (!log.entityIds.includes(entity.id)) continue;
    for (const id of log.entityIds) {
      if (id !== entity.id) ids.add(id);
    }
  }
  return ids;
}

export function countLinkKinds(data: ArgusData, ids: Iterable<string>): LinkKindCounts {
  const counts: LinkKindCounts = {
    orgCount: 0,
    projectCount: 0,
    peopleCount: 0,
    topicCount: 0,
    eventCount: 0,
  };
  for (const id of ids) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (!entity) continue;
    if (entity.type === "company") counts.orgCount += 1;
    else if (entity.type === "project") counts.projectCount += 1;
    else if (entity.type === "person") counts.peopleCount += 1;
    else if (referenceKindFromNotes(entity.notes ?? "") === "topic") counts.topicCount += 1;
    else if (referenceKindFromNotes(entity.notes ?? "") === "event") counts.eventCount += 1;
  }
  return counts;
}

export function partitionIdsByEntityKind(entities: Entity[], ids: string[]) {
  const personIds: string[] = [];
  const topicIds: string[] = [];
  const eventIds: string[] = [];
  for (const id of ids) {
    const entity = entities.find((e) => e.id === id);
    if (!entity) continue;
    if (entity.type === "person") personIds.push(id);
    else if (referenceKindFromNotes(entity.notes ?? "") === "topic") topicIds.push(id);
    else if (referenceKindFromNotes(entity.notes ?? "") === "event") eventIds.push(id);
  }
  return { personIds, topicIds, eventIds };
}

export function collectProjectLinkIds(project: Entity): string[] {
  return [
    ...new Set([
      ...(project.linkedEntityIds ?? []),
      ...(project.linkedPersonIds ?? []),
      ...(project.linkedTopicIds ?? []),
      ...(project.linkedEventIds ?? []),
    ]),
  ];
}

/** Topic entity names only — do not mix evidence tag strings into link metrics. */
export function linkedTopicNames(data: ArgusData, ids: Iterable<string>, _tagStrings: string[] = []): string[] {
  const names = new Set<string>();
  for (const id of ids) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (entity && referenceKindFromNotes(entity.notes ?? "") === "topic") {
      names.add(entity.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function linkedTopicRefs(
  data: ArgusData,
  ids: Iterable<string>
): Array<{ id: string; name: string; href: string }> {
  const refs: Array<{ id: string; name: string; href: string }> = [];
  for (const id of ids) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (!entity || referenceKindFromNotes(entity.notes ?? "") !== "topic") continue;
    refs.push({
      id: entity.id,
      name: entity.name,
      href: `/argus/v2/browse/topics?selected=${entity.id}`,
    });
  }
  return refs.sort((a, b) => a.name.localeCompare(b.name));
}

export function linkedEventRefs(
  data: ArgusData,
  ids: Iterable<string>
): Array<{ id: string; name: string; href: string }> {
  const refs: Array<{ id: string; name: string; href: string }> = [];
  for (const id of ids) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (!entity || referenceKindFromNotes(entity.notes ?? "") !== "event") continue;
    refs.push({
      id: entity.id,
      name: entity.name,
      href: `/argus/v2/browse/events?selected=${entity.id}`,
    });
  }
  return refs.sort((a, b) => a.name.localeCompare(b.name));
}
