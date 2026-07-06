import type { ArgusData, Entity, Log } from "../types";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { entitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { relativeActivityLabel } from "./timeline-builders";
import type {
  V2TopicDetail,
  V2TopicEntry,
  V2TopicRow,
  V2TopicTab,
  V2TopicTagChip,
} from "./topic-browse-utils";
export type {
  V2TopicDetail,
  V2TopicEntry,
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

function countLinkedByKind(data: ArgusData, topic: Entity, logs: Log[]) {
  const ids = new Set<string>(topic.linkedEntityIds ?? []);
  for (const log of logs) {
    if (!log.entityIds.includes(topic.id)) continue;
    for (const id of log.entityIds) {
      if (id !== topic.id) ids.add(id);
    }
  }
  let orgCount = 0;
  let projectCount = 0;
  let peopleCount = 0;
  for (const id of ids) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (!entity) continue;
    if (entity.type === "company") orgCount += 1;
    else if (entity.type === "project") projectCount += 1;
    else if (entity.type === "person") peopleCount += 1;
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

function logKindLabel(kind: Log["kind"]): V2TopicEntry["kind"] {
  if (kind === "log") return "Log";
  if (kind === "follow_up") return "Follow-up";
  return "Note";
}

export function buildV2TopicRows(data: ArgusData, includePrivate: boolean, today: string): V2TopicRow[] {
  const topics = entitiesByKind(data).topics;
  const logs = visibleLogs(data, includePrivate);

  return topics
    .map((topic) => {
      const history = getEntityHistory(data, topic.id, includePrivate);
      const counts = countLinkedByKind(data, topic, history);
      const lastIso = history[0]?.date || topic.updatedAt;
      const tagHints = [...new Set(history.flatMap((l) => l.topics).filter(Boolean))].slice(0, 4);

      return {
        id: topic.id,
        name: topic.name,
        category: topicCategory(topic, history),
        ...counts,
        lastActivity: lastIso ? relativeActivityLabel(lastIso, today) : "—",
        lastSort: lastIso ?? "",
        entryCount: history.length,
        tagHints,
      };
    })
    .sort((a, b) => b.lastSort.localeCompare(a.lastSort) || a.name.localeCompare(b.name));
}

export function buildV2TopicDetails(
  data: ArgusData,
  includePrivate: boolean,
  today: string
): V2TopicDetail[] {
  const topics = entitiesByKind(data).topics;
  const entityMap = new Map(data.entities.filter(isActiveRecord).map((e) => [e.id, e]));

  return topics.map((topic) => {
    const history = getEntityHistory(data, topic.id, includePrivate);
    const counts = countLinkedByKind(data, topic, history);

    const recentEntries = history.slice(0, 6).map((log) => {
      const linked = log.entityIds.map((id) => entityMap.get(id)?.name).filter(Boolean);
      return {
        id: log.id,
        title: log.title || logKindLabel(log.kind),
        kind: logKindLabel(log.kind),
        meta: linked.slice(0, 2).join(" · ") || relativeActivityLabel(log.date, today),
        href: `/argus/logs/${log.id}`,
      };
    });

    return {
      id: topic.id,
      name: topic.name,
      category: topicCategory(topic, history),
      description: entityNotesForDisplay(topic.notes ?? "") || "No description yet.",
      ...counts,
      linkedEntityIds: topic.linkedEntityIds ?? [],
      recentEntries,
    };
  });
}

export function buildV2TopicTagChips(rows: V2TopicRow[], limit = 12): V2TopicTagChip[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tagHints) {
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
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

export function getTopicRelatedEmails(data: ArgusData, inboxItems: import("../types").InboxItem[], topicId: string, includePrivate: boolean) {
  return getLinkedInboxForEntity(inboxItems, topicId, includePrivate).slice(0, 5);
}
