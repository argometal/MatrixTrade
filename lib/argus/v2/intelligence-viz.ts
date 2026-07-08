import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { referenceKindFromNotes } from "../reference-types";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { entitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { filterPrivateInbox } from "../private-access";

export type V2KnowledgeNodeKind = "topic" | "project" | "organization" | "tag";

export type V2KnowledgeNode = {
  id: string;
  name: string;
  kind: V2KnowledgeNodeKind;
  evidenceCount: number;
  recentCount: number;
  recentActivity: number;
  strategicValue: number;
  completion: number;
  href: string;
  group: string;
};

export type V2GraphNode = {
  id: string;
  name: string;
  kind: "person" | "organization" | "project" | "topic" | "event";
  x: number;
  y: number;
  evidenceCount: number;
  href: string;
};

export type V2GraphEdge = {
  from: string;
  to: string;
  weight: number;
};

export type V2TreemapRect = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  evidenceCount: number;
  recentActivity: number;
  href: string;
  group: string;
};

function visibleLogs(data: ArgusData, includePrivate: boolean): Log[] {
  const logs = data.logs.filter((l) => !l.deletedAt);
  return includePrivate ? logs : logs.filter((l) => !l.private);
}

function visibleInbox(inboxItems: InboxItem[], includePrivate: boolean): InboxItem[] {
  return filterPrivateInbox(
    inboxItems.filter(isActiveRecord).filter((i) => i.status !== "archived"),
    includePrivate
  );
}

function entityKind(entity: Entity): V2KnowledgeNodeKind | "person" | "event" | null {
  if (entity.type === "company") return "organization";
  if (entity.type === "project") return "project";
  if (entity.type === "person") return "person";
  const ref = referenceKindFromNotes(entity.notes ?? "");
  if (ref === "topic") return "topic";
  if (ref === "event") return "event";
  return null;
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

function countEvidenceForEntity(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean,
  today: string
): { total: number; recent: number; dates: string[] } {
  const logs = visibleLogs(data, includePrivate).filter((l) => l.entityIds.includes(entityId));
  const inbox = getLinkedInboxForEntity(inboxItems, entityId, includePrivate);
  const dates = [
    ...logs.map((l) => (l.updatedAt || l.date).slice(0, 10)),
    ...inbox.map((i) => i.receivedAt.slice(0, 10)),
  ];
  const weekAgo = new Date(`${today}T12:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = weekAgo.toISOString().slice(0, 10);
  const recent = dates.filter((d) => d >= cutoff).length;
  return { total: logs.length + inbox.length, recent, dates };
}

function completionScore(entity: Entity, evidenceCount: number, dates: string[], today: string): number {
  if (entity.type === "project") {
    if (entity.endDate && entity.endDate <= today) return 1;
    if (entity.startDate && entity.endDate) {
      const start = new Date(`${entity.startDate}T12:00:00`).getTime();
      const end = new Date(`${entity.endDate}T12:00:00`).getTime();
      const now = new Date(`${today}T12:00:00`).getTime();
      if (end > start) return Math.min(1, Math.max(0, (now - start) / (end - start)));
    }
    return Math.min(1, evidenceCount / 12);
  }
  if (dates.length === 0) return 0.1;
  const sorted = [...dates].sort();
  const spanDays = Math.max(
    1,
    (new Date(`${sorted[sorted.length - 1]}T12:00:00`).getTime() -
      new Date(`${sorted[0]}T12:00:00`).getTime()) /
      86400000
  );
  return Math.min(1, evidenceCount / Math.max(4, spanDays / 30));
}

function primaryGroupForEntity(data: ArgusData, entity: Entity, logs: Log[]): string {
  const linked = new Set(entity.linkedEntityIds ?? []);
  for (const log of logs) {
    if (!log.entityIds.includes(entity.id)) continue;
    for (const id of log.entityIds) linked.add(id);
  }
  for (const id of linked) {
    const other = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (other?.type === "company") return other.name;
    if (other?.type === "project") return other.name;
  }
  return "General";
}

function buildTagNodes(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string,
  limit: number
): V2KnowledgeNode[] {
  const counts = new Map<string, { total: number; recent: number }>();
  const weekAgo = new Date(`${today}T12:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = weekAgo.toISOString().slice(0, 10);

  const bump = (tag: string, date: string) => {
    const key = tag.trim().toLowerCase();
    if (!key) return;
    const row = counts.get(key) ?? { total: 0, recent: 0 };
    row.total += 1;
    if (date.slice(0, 10) >= cutoff) row.recent += 1;
    counts.set(key, row);
  };

  for (const log of visibleLogs(data, includePrivate)) {
    for (const tag of log.topics) bump(tag, log.updatedAt || log.date);
  }
  for (const item of visibleInbox(inboxItems, includePrivate)) {
    for (const tag of item.topics ?? []) bump(tag, item.receivedAt);
  }

  const topicNames = new Set(
    entitiesByKind(data).topics.map((t) => t.name.trim().toLowerCase())
  );

  return [...counts.entries()]
    .filter(([name]) => !topicNames.has(name))
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([name, row]) => ({
      id: `tag:${name}`,
      name,
      kind: "tag" as const,
      evidenceCount: row.total,
      recentCount: row.recent,
      recentActivity: row.total ? row.recent / row.total : 0,
      strategicValue: 3,
      completion: Math.min(1, row.total / 8),
      href: `/argus/v2/inbox?tag=${encodeURIComponent(name)}`,
      group: "Tags",
    }));
}

export function buildV2KnowledgeNodes(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string,
  limit = 24
): V2KnowledgeNode[] {
  const logs = visibleLogs(data, includePrivate);
  const entities = data.entities.filter((e) => !e.deletedAt);
  const nodes: V2KnowledgeNode[] = [];

  for (const entity of entities) {
    const kind = entityKind(entity);
    if (!kind || kind === "person" || kind === "event") continue;
    const { total, recent, dates } = countEvidenceForEntity(data, inboxItems, entity.id, includePrivate, today);
    if (total === 0 && kind !== "organization") continue;

    nodes.push({
      id: entity.id,
      name: entity.name,
      kind,
      evidenceCount: Math.max(total, 1),
      recentCount: recent,
      recentActivity: total ? recent / total : 0,
      strategicValue: entity.strategicValue ?? 3,
      completion: completionScore(entity, total, dates, today),
      href: entityHref(entity),
      group: primaryGroupForEntity(data, entity, logs),
    });
  }

  nodes.push(...buildTagNodes(data, inboxItems, includePrivate, today, 8));

  return nodes
    .sort((a, b) => b.evidenceCount - a.evidenceCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Slice-and-dice treemap — stable enough for Home experiment. */
export function layoutTreemap(
  nodes: V2KnowledgeNode[],
  width: number,
  height: number
): V2TreemapRect[] {
  if (nodes.length === 0) return [];

  const rects: V2TreemapRect[] = [];

  function layoutSlice(
    items: V2KnowledgeNode[],
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    if (items.length === 0) return;
    if (items.length === 1) {
      const item = items[0];
      rects.push({
        id: item.id,
        name: item.name,
        x,
        y,
        w,
        h,
        evidenceCount: item.evidenceCount,
        recentActivity: item.recentActivity,
        href: item.href,
        group: item.group,
      });
      return;
    }

    const total = items.reduce((sum, n) => sum + n.evidenceCount, 0) || 1;
    const horizontal = w >= h;
    const mid = Math.ceil(items.length / 2);
    const left = items.slice(0, mid);
    const right = items.slice(mid);
    const leftWeight = left.reduce((sum, n) => sum + n.evidenceCount, 0) / total;

    if (horizontal) {
      const lw = w * leftWeight;
      layoutSlice(left, x, y, lw, h);
      layoutSlice(right, x + lw, y, w - lw, h);
    } else {
      const lh = h * leftWeight;
      layoutSlice(left, x, y, w, lh);
      layoutSlice(right, x, y + lh, w, h - lh);
    }
  }

  layoutSlice(nodes, 0, 0, width, height);
  return rects;
}

export function buildV2KnowledgeGraph(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string,
  limit = 18
): { nodes: V2GraphNode[]; edges: V2GraphEdge[] } {
  const entities = data.entities.filter((e) => !e.deletedAt);
  const kinds = entitiesByKind(data);
  const candidates = [
    ...kinds.organizations,
    ...kinds.projects,
    ...kinds.people.slice(0, 8),
    ...kinds.topics.slice(0, 8),
    ...kinds.events.slice(0, 4),
  ];

  const scored = candidates
    .map((entity) => {
      const { total } = countEvidenceForEntity(data, inboxItems, entity.id, includePrivate, today);
      return { entity, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  const idSet = new Set(scored.map((s) => s.entity.id));
  const columns: Record<V2GraphNode["kind"], number> = {
    organization: 0,
    project: 1,
    person: 2,
    topic: 3,
    event: 4,
  };

  const colCounts: Record<number, number> = {};
  const nodes: V2GraphNode[] = scored.map(({ entity, total }) => {
    const ref = referenceKindFromNotes(entity.notes ?? "");
    const kind: V2GraphNode["kind"] =
      entity.type === "company"
        ? "organization"
        : entity.type === "project"
          ? "project"
          : entity.type === "person"
            ? "person"
            : ref === "event"
              ? "event"
              : "topic";
    const col = columns[kind];
    const row = colCounts[col] ?? 0;
    colCounts[col] = row + 1;

    return {
      id: entity.id,
      name: entity.name,
      kind,
      x: 12 + col * 22,
      y: 10 + row * 16,
      evidenceCount: total,
      href: entityHref(entity),
    };
  });

  const edgeMap = new Map<string, number>();
  const addEdge = (from: string, to: string, weight = 1) => {
    if (!idSet.has(from) || !idSet.has(to) || from === to) return;
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    edgeMap.set(key, (edgeMap.get(key) ?? 0) + weight);
  };

  for (const { entity } of scored) {
    for (const id of entity.linkedEntityIds ?? []) addEdge(entity.id, id, 2);
    if (entity.type === "project") {
      for (const id of entity.linkedPersonIds ?? []) addEdge(entity.id, id, 2);
      for (const id of entity.linkedTopicIds ?? []) addEdge(entity.id, id, 2);
      for (const id of entity.linkedEventIds ?? []) addEdge(entity.id, id, 1);
    }
  }

  for (const log of visibleLogs(data, includePrivate)) {
    const linked = log.entityIds.filter((id) => idSet.has(id));
    for (let i = 0; i < linked.length; i++) {
      for (let j = i + 1; j < linked.length; j++) addEdge(linked[i], linked[j], 1);
    }
  }

  const edges: V2GraphEdge[] = [...edgeMap.entries()].map(([key, weight]) => {
    const [from, to] = key.split("|");
    return { from, to, weight };
  });

  return { nodes, edges };
}

export type V2HomeEvidenceSummary = {
  journal: number;
  emails: number;
  people: number;
  organizations: number;
  projects: number;
  journalWeek: number;
  emailWeek: number;
};

export function buildV2HomeEvidenceSummary(
  data: ArgusData,
  inboxItems: InboxItem[],
  today: string
): V2HomeEvidenceSummary {
  const logs = visibleLogs(data, true);
  const inbox = visibleInbox(inboxItems, true);
  const kinds = entitiesByKind(data);
  const weekAgo = new Date(`${today}T12:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = weekAgo.toISOString().slice(0, 10);

  return {
    journal: logs.length,
    emails: inbox.length,
    people: kinds.people.length,
    organizations: kinds.organizations.length,
    projects: kinds.projects.length,
    journalWeek: logs.filter((l) => (l.updatedAt || l.date).slice(0, 10) >= cutoff).length,
    emailWeek: inbox.filter((i) => i.receivedAt.slice(0, 10) >= cutoff).length,
  };
}
