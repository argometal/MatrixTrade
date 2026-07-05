import type { ArgusData, Entity, Log } from "../types";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../entity-evidence";
import { entitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { relativeActivityLabel } from "./timeline-builders";

export type V2TopicTab = "all" | "mine" | "followed";

export interface V2TopicRow {
  id: string;
  name: string;
  category: string;
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  lastActivity: string;
  lastSort: string;
  entryCount: number;
  tagHints: string[];
}

export interface V2TopicEntry {
  id: string;
  title: string;
  kind: "Log" | "Note" | "Follow-up";
  meta: string;
  href: string;
}

export interface V2TopicDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  recentEntries: V2TopicEntry[];
}

export interface V2TopicTagChip {
  name: string;
  count: number;
}

function visibleLogs(data: ArgusData, includePrivate: boolean): Log[] {
  const logs = data.logs.filter((l) => !l.deletedAt);
  return includePrivate ? logs : logs.filter((l) => !l.private);
}

function countLinkedByKind(data: ArgusData, topicId: string, logs: Log[]) {
  const ids = new Set<string>();
  for (const log of logs) {
    if (!log.entityIds.includes(topicId)) continue;
    for (const id of log.entityIds) {
      if (id !== topicId) ids.add(id);
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
      const counts = countLinkedByKind(data, topic.id, history);
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
    const counts = countLinkedByKind(data, topic.id, history);

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

export function buildV2TopicTabCounts(rows: V2TopicRow[]) {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const cutoff = monthAgo.toISOString().slice(0, 10);
  return {
    all: rows.length,
    mine: rows.filter((r) => r.entryCount > 0).length,
    followed: rows.filter((r) => r.lastSort.slice(0, 10) >= cutoff).length,
  };
}

export function filterV2TopicRows(rows: V2TopicRow[], tab: V2TopicTab): V2TopicRow[] {
  if (tab === "all") return rows;
  if (tab === "mine") return rows.filter((r) => r.entryCount > 0);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const cutoff = monthAgo.toISOString().slice(0, 10);
  return rows.filter((r) => r.lastSort.slice(0, 10) >= cutoff);
}

export function parseV2TopicTab(value: string | undefined): V2TopicTab {
  if (value === "mine" || value === "followed") return value;
  return "all";
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
