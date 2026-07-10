import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { entitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { relativeActivityLabel, buildTimelineFromLogsAndInbox } from "./timeline-builders";
import {
  buildEntityEvidenceStream,
  countEvidenceStream,
  latestEvidenceIso,
} from "./evidence-stream";
import { buildTagPatternsForScope } from "./tag-patterns";
import type {
  V2TopicDetail,
  V2TopicLinkedEntity,
  V2TopicRow,
  V2TopicTab,
  V2TopicTagChip,
} from "./topic-browse-utils";
export type {
  V2TopicDetail,
  V2TopicLinkedEntity,
  V2TopicRow,
  V2TopicTab,
  V2TopicTagChip,
} from "./topic-browse-utils";
export {
  buildV2TopicTabCounts,
  filterV2TopicRows,
  parseV2TopicTab,
} from "./topic-browse-utils";

function visibleLogs(data: ArgusData, includePrivate: boolean): Log[] {
  const logs = data.logs.filter((l) => !l.deletedAt);
  return includePrivate ? logs : logs.filter((l) => !l.private);
}

function entityHref(entity: Entity): string {
  if (entity.type === "company") return `/argus/v2/organizations/${entity.id}`;
  if (entity.type === "project") return `/argus/v2/projects/${entity.id}`;
  if (entity.type === "person") return `/argus/v2/network/${entity.id}`;
  const ref = referenceKindFromNotes(entity.notes ?? "");
  if (ref === "topic") return `/argus/v2/browse/topics?selected=${entity.id}`;
  if (ref === "event") return `/argus/v2/browse/events?selected=${entity.id}`;
  return `/argus/v2/network/${entity.id}`;
}

function linkedEntityIcon(entity: Entity): string {
  if (entity.type === "company") return "🏢";
  if (entity.type === "project") return "📁";
  if (entity.type === "person") return "👤";
  const ref = referenceKindFromNotes(entity.notes ?? "");
  if (ref === "event") return "📅";
  return "🏷";
}

function collectLinkedEntities(data: ArgusData, topic: Entity, logs: Log[]): V2TopicLinkedEntity[] {
  const ids = new Set<string>(topic.linkedEntityIds ?? []);
  for (const log of logs) {
    if (!log.entityIds.includes(topic.id)) continue;
    for (const id of log.entityIds) {
      if (id !== topic.id) ids.add(id);
    }
  }

  const entities: V2TopicLinkedEntity[] = [];
  for (const id of ids) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (!entity || entity.id === topic.id) continue;
    const ref = referenceKindFromNotes(entity.notes ?? "");
    if (ref === "topic") continue;
    entities.push({
      id: entity.id,
      name: entity.name,
      icon: linkedEntityIcon(entity),
      href: entityHref(entity),
    });
  }

  return entities.sort((a, b) => a.name.localeCompare(b.name));
}

function countLinkedByKind(entities: V2TopicLinkedEntity[]) {
  let orgCount = 0;
  let projectCount = 0;
  let peopleCount = 0;
  for (const entity of entities) {
    if (entity.icon === "🏢") orgCount += 1;
    else if (entity.icon === "📁") projectCount += 1;
    else if (entity.icon === "👤") peopleCount += 1;
  }
  return { orgCount, projectCount, peopleCount };
}

function topicCategory(topic: Entity, logs: Log[]): string {
  for (const log of logs) {
    if (log.entityIds.includes(topic.id) && log.topics[0]) {
      const tag = log.topics[0].trim();
      if (tag) return tag.charAt(0).toUpperCase() + tag.slice(1);
    }
  }
  const notes = entityNotesForDisplay(topic.notes ?? "");
  if (notes) {
    const first = notes.split("\n")[0]?.trim();
    if (first && first.length < 40) return first;
  }
  return "General";
}

function topicEvidenceBundle(
  data: ArgusData,
  topicId: string,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
) {
  const history = getEntityHistory(data, topicId, includePrivate);
  const inbox = getLinkedInboxForEntity(inboxItems, topicId, includePrivate);
  const evidence = buildEntityEvidenceStream(data, topicId, inboxItems, includePrivate, today);
  const counts = countEvidenceStream(evidence);
  const lastIso = latestEvidenceIso(evidence, history[0]?.date || inbox[0]?.receivedAt || "");
  return { history, inbox, evidence, counts, lastIso };
}

export function buildV2TopicRows(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2TopicRow[] {
  const topics = entitiesByKind(data).topics;

  return topics
    .map((topic) => {
      const { counts, lastIso } = topicEvidenceBundle(data, topic.id, inboxItems, includePrivate, today);
      return {
        id: topic.id,
        name: topic.name,
        lastActivity: lastIso ? relativeActivityLabel(lastIso, today) : "—",
        lastSort: lastIso ?? "",
        journalCount: counts.journalCount,
        emailCount: counts.emailCount,
        fileCount: counts.fileCount + counts.photoCount,
        evidenceCount: counts.evidenceCount,
      };
    })
    .sort((a, b) => b.lastSort.localeCompare(a.lastSort) || a.name.localeCompare(b.name));
}

export function buildV2TopicDetails(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2TopicDetail[] {
  const topics = entitiesByKind(data).topics;

  return topics.map((topic) => {
    const { history, inbox, evidence, counts } = topicEvidenceBundle(
      data,
      topic.id,
      inboxItems,
      includePrivate,
      today
    );
    const linkedEntities = collectLinkedEntities(data, topic, history);
    const linkCounts = countLinkedByKind(linkedEntities);

    return {
      id: topic.id,
      name: topic.name,
      category: topicCategory(topic, history),
      description: entityNotesForDisplay(topic.notes ?? "") || "No description yet.",
      ...linkCounts,
      journalCount: counts.journalCount,
      emailCount: counts.emailCount,
      fileCount: counts.fileCount + counts.photoCount,
      photoCount: counts.photoCount,
      evidenceCount: counts.evidenceCount,
      linkedEntityIds: topic.linkedEntityIds ?? [],
      linkedEntities,
      aliases: (topic.linkedTags ?? []).map((tag) => tag.trim()).filter(Boolean),
      lifecycleStatus: topic.lifecycleStatus,
      evidence,
      timeline: buildTimelineFromLogsAndInbox(history, inbox),
      tagPatterns: buildTagPatternsForScope(history, inbox, today),
    };
  });
}

export function buildV2TopicTagChips(rows: V2TopicRow[], limit = 12): V2TopicTagChip[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.evidenceCount > 0) counts.set(row.name.toLowerCase(), row.evidenceCount);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

/** Global log-topic chips for the topics browse filter row. */
export function buildV2GlobalTopicChips(data: ArgusData, includePrivate: boolean, limit = 14): V2TopicTagChip[] {
  const counts = new Map<string, number>();
  for (const log of visibleLogs(data, includePrivate)) {
    for (const t of log.topics) {
      const key = t.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function isTopicEntity(entity: Entity): boolean {
  return entity.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "topic";
}

export function isEventEntity(entity: Entity): boolean {
  return entity.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "event";
}
