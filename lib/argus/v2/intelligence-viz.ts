import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { referenceKindFromNotes } from "../reference-types";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { buildTagPatternsForScope, tagPatternCount } from "./tag-patterns";
import { entitiesByKind } from "./hierarchy";
import { isEntityArchived } from "../entity-lifecycle";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { filterPrivateInbox } from "../private-access";
import { intelligenceEntityHref } from "./intelligence-nav";

export type V2KnowledgeNodeKind = "topic" | "project" | "organization";

export type V2KnowledgeNode = {
  id: string;
  name: string;
  kind: V2KnowledgeNodeKind;
  evidenceCount: number;
  recentCount: number;
  recentActivity: number;
  /** 0–1 — 1 = most recent evidence (within ~90d window). */
  recencyScore: number;
  /** Raw count of evidence items in the last 30 days. */
  recurrence30d: number;
  /** 0–1 — normalized recurrence for portfolio X axis. */
  recurrenceScore: number;
  /** @deprecated Portfolio no longer uses manual strategic value. */
  strategicValue?: number;
  /** @deprecated Portfolio no longer uses completion heuristic. */
  completion?: number;
  /** Number of recurring tag patterns on scope evidence (≥3 items, fresh within 90d). */
  tagPatternCount: number;
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

export type V2GraphEdgeKind = "linked" | "co-mentioned" | "project-link";

export type V2GraphEdge = {
  from: string;
  to: string;
  weight: number;
  kind?: V2GraphEdgeKind;
};

export type V2EntityNeighborhoodGraph = {
  nodes: V2GraphNode[];
  edges: V2GraphEdge[];
  centerId: string;
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
  tagPatternCount: number;
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

function entityHref(entity: Entity, from: "intelligence" | "treemap" | "portfolio" = "intelligence"): string {
  if (entity.type === "company") return intelligenceEntityHref("organization", entity.id, from);
  if (entity.type === "project") return intelligenceEntityHref("project", entity.id, from);
  const ref = referenceKindFromNotes(entity.notes ?? "");
  if (ref === "topic") return intelligenceEntityHref("topic", entity.id, from);
  if (ref === "event") return `/argus/v2/browse/events?selected=${entity.id}&focus=1&from=${from}`;
  if (entity.type === "person") return `/argus/v2/network/${entity.id}`;
  return `/argus/v2/network/${entity.id}`;
}

function isEventEntity(data: ArgusData, entityId: string): boolean {
  const entity = data.entities.find((e) => e.id === entityId && !e.deletedAt);
  return (
    entity != null &&
    entity.type === "other" &&
    referenceKindFromNotes(entity.notes ?? "") === "event"
  );
}

function getLinkedEventIdsForTopic(data: ArgusData, topicId: string, logs: Log[]): Set<string> {
  const eventIds = new Set<string>();
  const topic = data.entities.find((e) => e.id === topicId && !e.deletedAt);
  if (!topic) return eventIds;

  for (const id of topic.linkedEntityIds ?? []) {
    if (isEventEntity(data, id)) eventIds.add(id);
  }

  for (const project of data.entities) {
    if (project.deletedAt || project.type !== "project") continue;
    if (!(project.linkedTopicIds ?? []).includes(topicId)) continue;
    for (const id of project.linkedEventIds ?? []) {
      if (isEventEntity(data, id)) eventIds.add(id);
    }
    for (const id of project.linkedEntityIds ?? []) {
      if (isEventEntity(data, id)) eventIds.add(id);
    }
  }

  for (const log of logs) {
    if (!log.entityIds.includes(topicId)) continue;
    for (const id of log.entityIds) {
      if (id !== topicId && isEventEntity(data, id)) eventIds.add(id);
    }
  }

  return eventIds;
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

function countEvidenceForTopicIncludingEvents(
  data: ArgusData,
  inboxItems: InboxItem[],
  topicId: string,
  includePrivate: boolean,
  today: string,
  logs: Log[]
): { total: number; recent: number; dates: string[] } {
  const base = countEvidenceForEntity(data, inboxItems, topicId, includePrivate, today);
  const linkedEventIds = getLinkedEventIdsForTopic(data, topicId, logs);
  let total = base.total;
  let recent = base.recent;
  const dates = [...base.dates];

  for (const eventId of linkedEventIds) {
    const eventEvidence = countEvidenceForEntity(data, inboxItems, eventId, includePrivate, today);
    total += eventEvidence.total;
    recent += eventEvidence.recent;
    dates.push(...eventEvidence.dates);
  }

  return { total, recent, dates };
}

const RECENCY_WINDOW_DAYS = 90;
const RECURRENCE_WINDOW_DAYS = 30;

function recencyScoreFromDates(dates: string[], today: string): number {
  if (dates.length === 0) return 0;
  const lastDate = [...dates].sort().pop()!;
  const daysSince = Math.max(
    0,
    (new Date(`${today}T12:00:00`).getTime() - new Date(`${lastDate}T12:00:00`).getTime()) /
      86400000
  );
  if (daysSince >= RECENCY_WINDOW_DAYS) return 0;
  return 1 - daysSince / RECENCY_WINDOW_DAYS;
}

function countRecurrence30d(dates: string[], today: string): number {
  const windowStart = new Date(`${today}T12:00:00`);
  windowStart.setDate(windowStart.getDate() - RECURRENCE_WINDOW_DAYS);
  const cutoff = windowStart.toISOString().slice(0, 10);
  return dates.filter((d) => d >= cutoff).length;
}

function normalizeRecurrenceScores(nodes: V2KnowledgeNode[]): void {
  const portfolio = nodes.filter(
    (n) => n.kind === "topic" || n.kind === "project" || n.kind === "organization"
  );
  const maxRecurrence = Math.max(...portfolio.map((n) => n.recurrence30d), 1);
  for (const node of portfolio) {
    node.recurrenceScore = Math.min(1, node.recurrence30d / maxRecurrence);
  }
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
    if (isEntityArchived(entity, today)) continue;

    const evidence =
      kind === "topic"
        ? countEvidenceForTopicIncludingEvents(
            data,
            inboxItems,
            entity.id,
            includePrivate,
            today,
            logs
          )
        : countEvidenceForEntity(data, inboxItems, entity.id, includePrivate, today);

    const { total, recent, dates } = evidence;
    if (total === 0 && kind !== "organization") continue;

    const recurrence30d = countRecurrence30d(dates, today);

    const entityLogs = logs.filter((l) => l.entityIds.includes(entity.id));
    const entityInbox = getLinkedInboxForEntity(inboxItems, entity.id, includePrivate);
    const patterns = buildTagPatternsForScope(entityLogs, entityInbox, today);

    nodes.push({
      id: entity.id,
      name: entity.name,
      kind,
      evidenceCount: Math.max(total, 1),
      recentCount: recent,
      recentActivity: total ? recent / total : 0,
      recencyScore: recencyScoreFromDates(dates, today),
      recurrence30d,
      recurrenceScore: 0,
      href: entityHref(entity),
      group: primaryGroupForEntity(data, entity, logs),
      tagPatternCount: tagPatternCount(patterns),
    });
  }

  normalizeRecurrenceScores(nodes);

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
        tagPatternCount: item.tagPatternCount,
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

  const rawNodes: V2GraphNode[] = scored.map(({ entity, total }) => {
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

    return {
      id: entity.id,
      name: entity.name,
      kind,
      x: 0,
      y: 0,
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

  return { nodes: layoutGraphNodes(rawNodes), edges };
}

function graphKindForEntity(entity: Entity): V2GraphNode["kind"] {
  const ref = referenceKindFromNotes(entity.notes ?? "");
  if (entity.type === "company") return "organization";
  if (entity.type === "project") return "project";
  if (entity.type === "person") return "person";
  if (ref === "event") return "event";
  return "topic";
}

function collectLinkedNeighborIds(entity: Entity, entityMap: Map<string, Entity>): string[] {
  const ids: string[] = [];
  for (const id of entity.linkedEntityIds ?? []) {
    if (entityMap.has(id)) ids.push(id);
  }
  if (entity.type === "project") {
    for (const id of entity.linkedPersonIds ?? []) {
      if (entityMap.has(id)) ids.push(id);
    }
    for (const id of entity.linkedTopicIds ?? []) {
      if (entityMap.has(id)) ids.push(id);
    }
    for (const id of entity.linkedEventIds ?? []) {
      if (entityMap.has(id)) ids.push(id);
    }
  }
  return ids;
}

/** Local 1–2 hop subgraph from one entity — Kumu / Obsidian neighborhood pattern. */
export function buildV2EntityNeighborhoodGraph(
  data: ArgusData,
  inboxItems: InboxItem[],
  centerEntityId: string,
  includePrivate: boolean,
  today: string,
  options: { maxNodes?: number } = {}
): V2EntityNeighborhoodGraph {
  const maxNodes = options.maxNodes ?? 14;
  const entities = data.entities.filter((e) => !e.deletedAt);
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const center = entityMap.get(centerEntityId);
  if (!center) return { nodes: [], edges: [], centerId: centerEntityId };

  const neighborIds = new Set<string>([centerEntityId]);

  for (const id of collectLinkedNeighborIds(center, entityMap)) neighborIds.add(id);

  const hopOne = [...neighborIds];
  for (const id of hopOne) {
    if (id === centerEntityId) continue;
    const entity = entityMap.get(id);
    if (!entity) continue;
    for (const linkedId of collectLinkedNeighborIds(entity, entityMap)) neighborIds.add(linkedId);
  }

  for (const log of visibleLogs(data, includePrivate)) {
    if (!log.entityIds.includes(centerEntityId)) continue;
    for (const id of log.entityIds) {
      if (entityMap.has(id)) neighborIds.add(id);
    }
  }

  const scored = [...neighborIds]
    .map((id) => {
      const entity = entityMap.get(id)!;
      const { total } = countEvidenceForEntity(data, inboxItems, id, includePrivate, today);
      return { entity, total, isCenter: id === centerEntityId };
    })
    .sort((a, b) => {
      if (a.isCenter) return -1;
      if (b.isCenter) return 1;
      return b.total - a.total || a.entity.name.localeCompare(b.entity.name);
    })
    .slice(0, maxNodes);

  const idSet = new Set(scored.map((s) => s.entity.id));
  const rawNodes: V2GraphNode[] = scored.map(({ entity, total }) => ({
    id: entity.id,
    name: entity.name,
    kind: graphKindForEntity(entity),
    x: 0,
    y: 0,
    evidenceCount: total,
    href: entityHref(entity),
  }));

  const edgeMap = new Map<string, V2GraphEdge>();
  const addEdge = (from: string, to: string, weight: number, kind: V2GraphEdgeKind) => {
    if (!idSet.has(from) || !idSet.has(to) || from === to) return;
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    const existing = edgeMap.get(key);
    if (!existing || weight > existing.weight) {
      edgeMap.set(key, { from, to, weight, kind });
    }
  };

  for (const { entity } of scored) {
    for (const id of entity.linkedEntityIds ?? []) addEdge(entity.id, id, 2, "linked");
    if (entity.type === "project") {
      for (const id of entity.linkedPersonIds ?? []) addEdge(entity.id, id, 2, "project-link");
      for (const id of entity.linkedTopicIds ?? []) addEdge(entity.id, id, 2, "project-link");
      for (const id of entity.linkedEventIds ?? []) addEdge(entity.id, id, 1, "project-link");
    }
  }

  for (const log of visibleLogs(data, includePrivate)) {
    const linked = log.entityIds.filter((id) => idSet.has(id));
    for (let i = 0; i < linked.length; i++) {
      for (let j = i + 1; j < linked.length; j++) addEdge(linked[i], linked[j], 1, "co-mentioned");
    }
  }

  return {
    nodes: layoutNeighborhoodGraphNodes(rawNodes, centerEntityId),
    edges: [...edgeMap.values()],
    centerId: centerEntityId,
  };
}

/** Radial layout — center entity in the middle, neighbors on a ring. */
export function layoutNeighborhoodGraphNodes(nodes: V2GraphNode[], centerId: string): V2GraphNode[] {
  const center = nodes.find((n) => n.id === centerId);
  const neighbors = nodes.filter((n) => n.id !== centerId);
  const laidOut: V2GraphNode[] = [];

  if (center) laidOut.push({ ...center, x: 50, y: 50 });

  neighbors.forEach((node, index) => {
    const angle = (index / neighbors.length) * Math.PI * 2 - Math.PI / 2;
    const radius = neighbors.length <= 4 ? 28 : 32;
    laidOut.push({
      ...node,
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    });
  });

  return laidOut;
}

const GRAPH_COLUMN_X: Record<V2GraphNode["kind"], number> = {
  organization: 14,
  project: 32,
  person: 50,
  topic: 68,
  event: 86,
};

/** Spread nodes vertically per column — fills canvas (Obsidian / Neo4j pattern). */
export function layoutGraphNodes(nodes: V2GraphNode[]): V2GraphNode[] {
  const yMin = 16;
  const yMax = 84;
  const kinds: V2GraphNode["kind"][] = ["organization", "project", "person", "topic", "event"];
  const laidOut: V2GraphNode[] = [];

  for (const kind of kinds) {
    const group = nodes.filter((n) => n.kind === kind);
    if (group.length === 0) continue;
    group.forEach((node, index) => {
      const y =
        group.length === 1
          ? (yMin + yMax) / 2
          : yMin + (index / (group.length - 1)) * (yMax - yMin);
      laidOut.push({ ...node, x: GRAPH_COLUMN_X[kind], y });
    });
  }

  return laidOut;
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
