import type { ArgusData, Entity, Log } from "../types";
import { referenceKindFromNotes } from "../reference-types";

export type LinkKindCounts = {
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  topicCount: number;
  eventCount: number;
};

export function collectRelatedEntityIds(entity: Entity, logs: Log[]): Set<string> {
  const ids = new Set<string>(entity.linkedEntityIds ?? []);
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

export function linkedTopicNames(data: ArgusData, ids: Iterable<string>, tagStrings: string[] = []): string[] {
  const names = new Set<string>(tagStrings.filter(Boolean));
  for (const id of ids) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (entity && referenceKindFromNotes(entity.notes ?? "") === "topic") {
      names.add(entity.name);
    }
  }
  return [...names];
}
