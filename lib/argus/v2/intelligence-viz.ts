import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { referenceKindFromNotes } from "../reference-types";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { signalTagKey, signalTagKeySet } from "../signal-tags";
import { buildTagPatternsForScope, tagPatternCount } from "./tag-patterns";
import { entitiesByKind } from "./hierarchy";
import { isEntityArchived } from "../entity-lifecycle";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { filterPrivateInbox } from "../private-access";
import { intelligenceEntityHref } from "./intelligence-nav";
import {
  collectNeighborEntityIds,
  countTopicsAndEventsInScope,
  outboundStructuralIds,
} from "./scope-node-counts";
import { watchedTrackerTagsOnEntity } from "./entity-watched";

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
  /**
   * True when binder ∪ direct evidence intersects journal Trackers (definition D).
   * Branch / neighborhood vocabulary does not count.
   */
  hasTracker: boolean;
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
  /**
   * True when scoped evidence carries a journal Tracker (`signalTags`).
   * Visual: rose/amber halo — Tracker on evidence (not a new entity).
   */
  focusCritical?: boolean;
  /** Matching Tracker Tag display names on this node's evidence. */
  focusTags?: string[];
};

export type V2GraphEdgeKind = "linked" | "co-mentioned" | "project-link" | "focus-affinity";

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

function getLinkedEventIdsForTopic(data: ArgusData, topicId: string, logs: Log[]): Set<string> {
  const topic = data.entities.find((e) => e.id === topicId && !e.deletedAt);
  if (!topic) return new Set();
  // Same policy as metrics / Connections — outbound + reverse + project bridge + co-mention
  return new Set(countTopicsAndEventsInScope(data, topic, logs).eventIds);
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

function countEvidenceAcrossEntityIds(
  data: ArgusData,
  inboxItems: InboxItem[],
  scopeIds: Iterable<string>,
  includePrivate: boolean,
  today: string
): { total: number; recent: number; dates: string[] } {
  const seenLog = new Set<string>();
  const seenInbox = new Set<string>();
  const dates: string[] = [];

  for (const entityId of scopeIds) {
    for (const log of visibleLogs(data, includePrivate)) {
      if (!log.entityIds.includes(entityId) || seenLog.has(log.id)) continue;
      seenLog.add(log.id);
      dates.push((log.updatedAt || log.date).slice(0, 10));
    }
    for (const item of getLinkedInboxForEntity(inboxItems, entityId, includePrivate)) {
      if (seenInbox.has(item.id)) continue;
      seenInbox.add(item.id);
      dates.push(item.receivedAt.slice(0, 10));
    }
  }

  const weekAgo = new Date(`${today}T12:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = weekAgo.toISOString().slice(0, 10);
  return {
    total: seenLog.size + seenInbox.size,
    recent: dates.filter((d) => d >= cutoff).length,
    dates,
  };
}

function countEvidenceForTopicIncludingEvents(
  data: ArgusData,
  inboxItems: InboxItem[],
  topicId: string,
  includePrivate: boolean,
  today: string,
  logs: Log[]
): { total: number; recent: number; dates: string[] } {
  // Union evidence across topic + linked events (shared topic+event logs count once).
  const scopeIds = new Set<string>([topicId, ...getLinkedEventIdsForTopic(data, topicId, logs)]);
  return countEvidenceAcrossEntityIds(data, inboxItems, scopeIds, includePrivate, today);
}

/** Project volume = direct evidence ∪ evidence on linked topics/events (same binder neighborhood). */
function countEvidenceForProjectIncludingLinks(
  data: ArgusData,
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate: boolean,
  today: string,
  logs: Log[]
): { total: number; recent: number; dates: string[] } {
  const { topicIds, eventIds } = countTopicsAndEventsInScope(data, project, logs);
  const scopeIds = new Set<string>([project.id, ...topicIds, ...eventIds]);
  return countEvidenceAcrossEntityIds(data, inboxItems, scopeIds, includePrivate, today);
}

const RECENCY_WINDOW_DAYS = 90;
const RECURRENCE_WINDOW_DAYS = 30;

export function recencyScoreFromDates(dates: string[], today: string): number {
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

export function countRecurrence30d(dates: string[], today: string): number {
  const windowStart = new Date(`${today}T12:00:00`);
  windowStart.setDate(windowStart.getDate() - RECURRENCE_WINDOW_DAYS);
  const cutoff = windowStart.toISOString().slice(0, 10);
  return dates.filter((d) => d >= cutoff).length;
}

/** Shared activity scores for entity portfolio and Focus Tag portfolio. */
export function scoreEvidenceDates(dates: string[], today: string): {
  recencyScore: number;
  recurrence30d: number;
  lastSeen: string;
} {
  const sorted = [...dates].filter(Boolean).sort();
  return {
    recencyScore: recencyScoreFromDates(sorted, today),
    recurrence30d: countRecurrence30d(sorted, today),
    lastSeen: sorted.length > 0 ? sorted[sorted.length - 1]! : "",
  };
}

export type BubbleLayoutPoint = {
  id: string;
  x: number;
  y: number;
  r: number;
};

function hashUnit(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Separate overlapping portfolio bubbles (Notion board / Observable scatter pattern).
 * Deterministic jitter + short repulsion so identical scores do not stack.
 */
export function resolveBubblePositions(
  points: BubbleLayoutPoint[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  options: { iterations?: number; padding?: number; jitter?: number } = {}
): BubbleLayoutPoint[] {
  const iterations = options.iterations ?? 10;
  const padding = options.padding ?? 0.35;
  const jitter = options.jitter ?? 1.4;
  const out = points.map((p) => {
    const jx = (hashUnit(p.id) - 0.5) * jitter;
    const jy = (hashUnit(`${p.id}:y`) - 0.5) * jitter;
    return {
      id: p.id,
      x: p.x + jx,
      y: p.y + jy,
      r: p.r,
    };
  });

  const clamp = (p: BubbleLayoutPoint) => {
    const maxR = Math.min(p.r, (bounds.maxX - bounds.minX) / 4, (bounds.maxY - bounds.minY) / 4);
    p.r = Math.max(0.8, maxR);
    p.x = Math.min(bounds.maxX - p.r, Math.max(bounds.minX + p.r, p.x));
    p.y = Math.min(bounds.maxY - p.r, Math.max(bounds.minY + p.r, p.y));
  };

  for (const p of out) clamp(p);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!;
        const b = out[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const minDist = a.r + b.r + padding;
        if (dist >= minDist) continue;
        if (dist < 0.001) {
          const angle = hashUnit(`${a.id}|${b.id}`) * Math.PI * 2;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 0.001;
        }
        const push = (minDist - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
    for (const p of out) clamp(p);
  }

  return out;
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
  // Prefer org neighbors, then project (outbound + reverse + bridge + co-mention).
  const neighbors = collectNeighborEntityIds(data, entity, logs);
  let projectName: string | null = null;
  for (const id of neighbors) {
    const other = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (!other) continue;
    if (other.type === "company") return other.name;
    if (other.type === "project" && !projectName) projectName = other.name;
  }
  return projectName ?? "General";
}

/**
 * Knowledge nodes for Home Treemap / Portfolio.
 * Includes every non-archived organization, project, and topic (empty binders keep a
 * minimum tile weight). No hard top-N cut — Treemap must reflect the full portfolio.
 */
export function buildV2KnowledgeNodes(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string,
  limit?: number
): V2KnowledgeNode[] {
  const logs = visibleLogs(data, includePrivate);
  const entities = data.entities.filter((e) => !e.deletedAt);
  const focusKeys = signalTagKeySet(data.signalTags);
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
        : kind === "project"
          ? countEvidenceForProjectIncludingLinks(
              data,
              inboxItems,
              entity,
              includePrivate,
              today,
              logs
            )
          : countEvidenceForEntity(data, inboxItems, entity.id, includePrivate, today);

    const { total, recent, dates } = evidence;

    const recurrence30d = countRecurrence30d(dates, today);

    const entityLogs = logs.filter((l) => l.entityIds.includes(entity.id));
    const entityInbox = getLinkedInboxForEntity(inboxItems, entity.id, includePrivate);
    const patterns = buildTagPatternsForScope(entityLogs, entityInbox, today);
    const hasTracker =
      watchedTrackerTagsOnEntity(data, inboxItems, entity.id, includePrivate, focusKeys).length > 0;

    nodes.push({
      id: entity.id,
      name: entity.name,
      kind,
      // Keep true volume; layoutTreemap applies a floor so empty binders still draw.
      evidenceCount: total,
      recentCount: recent,
      recentActivity: total ? recent / total : 0,
      recencyScore: recencyScoreFromDates(dates, today),
      recurrence30d,
      recurrenceScore: 0,
      href: entityHref(entity),
      group: primaryGroupForEntity(data, entity, logs),
      tagPatternCount: tagPatternCount(patterns),
      hasTracker,
    });
  }

  normalizeRecurrenceScores(nodes);

  const sorted = nodes.sort(
    (a, b) => b.evidenceCount - a.evidenceCount || a.name.localeCompare(b.name)
  );
  return typeof limit === "number" && limit > 0 ? sorted.slice(0, limit) : sorted;
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

    const weight = (n: V2KnowledgeNode) => Math.max(n.evidenceCount, 1);
    const total = items.reduce((sum, n) => sum + weight(n), 0) || 1;
    const horizontal = w >= h;
    const mid = Math.ceil(items.length / 2);
    const left = items.slice(0, mid);
    const right = items.slice(mid);
    const leftWeight = left.reduce((sum, n) => sum + weight(n), 0) / total;

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
  const ids = new Set<string>();

  for (const id of outboundStructuralIds(entity)) {
    if (entityMap.has(id)) ids.add(id);
  }

  // Reverse links — entities that point at this one (projects → topics, orgs → people, etc.)
  for (const other of entityMap.values()) {
    if (other.id === entity.id) continue;
    if (outboundStructuralIds(other).includes(entity.id)) ids.add(other.id);
  }

  return [...ids];
}

/**
 * Journal Trackers that appear on this entity under definition D
 * (binder ∪ direct evidence; Topic includes linked Event rollup).
 * Branch / neighborhood vocabulary never counts.
 */
function focusTagsOnEntity(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean,
  focusKeys: Set<string>
): string[] {
  return watchedTrackerTagsOnEntity(data, inboxItems, entityId, includePrivate, focusKeys);
}

/**
 * Context center for the small Home dock: one level above the selection when possible
 * (Topic/Project → parent Org; Topic → Project; else the entity itself with a wider graph).
 */
export function resolveNeighborhoodContextCenter(
  data: ArgusData,
  entityId: string,
  includePrivate: boolean
): { centerId: string; label: "parent" | "self"; parentName?: string } {
  const entities = data.entities.filter((e) => !e.deletedAt);
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const center = entityMap.get(entityId);
  if (!center) return { centerId: entityId, label: "self" };

  const logs = visibleLogs(data, includePrivate);
  const neighbors = collectNeighborEntityIds(data, center, logs);

  let orgId: string | undefined;
  let projectId: string | undefined;
  for (const id of neighbors) {
    const other = entityMap.get(id);
    if (!other) continue;
    if (!orgId && other.type === "company") orgId = other.id;
    if (!projectId && other.type === "project") projectId = other.id;
  }

  // Prefer organization (one level above project/topic), else project above topic.
  if (orgId && center.type !== "company") {
    return { centerId: orgId, label: "parent", parentName: entityMap.get(orgId)?.name };
  }
  if (projectId && center.type !== "project" && center.type !== "company") {
    const ref = referenceKindFromNotes(center.notes ?? "");
    if (ref === "topic" || ref === "event" || center.type === "person") {
      return { centerId: projectId, label: "parent", parentName: entityMap.get(projectId)?.name };
    }
  }
  return { centerId: entityId, label: "self" };
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

  const logs = visibleLogs(data, includePrivate);
  const neighborIds = new Set<string>([centerEntityId]);

  // Same neighbor policy as Topic/Event metrics (bridge + parent org + co-mention).
  for (const id of collectNeighborEntityIds(data, center, logs)) {
    if (entityMap.has(id)) neighborIds.add(id);
  }

  // Hop-2 stays structural (outbound/reverse) so the canvas does not explode.
  const hopOne = [...neighborIds];
  for (const id of hopOne) {
    if (id === centerEntityId) continue;
    const entity = entityMap.get(id);
    if (!entity) continue;
    for (const linkedId of collectLinkedNeighborIds(entity, entityMap)) neighborIds.add(linkedId);
  }

  const focusKeys = signalTagKeySet(data.signalTags);
  const scored = [...neighborIds]
    .map((id) => {
      const entity = entityMap.get(id)!;
      const { total } = countEvidenceForEntity(data, inboxItems, id, includePrivate, today);
      const focusTags = focusTagsOnEntity(data, inboxItems, id, includePrivate, focusKeys);
      return { entity, total, focusTags, isCenter: id === centerEntityId };
    })
    .sort((a, b) => {
      if (a.isCenter) return -1;
      if (b.isCenter) return 1;
      // Prefer Focus-trigger nodes when trimming the neighborhood.
      if (a.focusTags.length > 0 !== b.focusTags.length > 0) {
        return b.focusTags.length > 0 ? 1 : -1;
      }
      return b.total - a.total || a.entity.name.localeCompare(b.entity.name);
    })
    .slice(0, maxNodes);

  const idSet = new Set(scored.map((s) => s.entity.id));
  const rawNodes: V2GraphNode[] = scored.map(({ entity, total, focusTags }) => ({
    id: entity.id,
    name: entity.name,
    kind: graphKindForEntity(entity),
    x: 0,
    y: 0,
    evidenceCount: total,
    href: entityHref(entity),
    focusCritical: focusTags.length > 0,
    focusTags,
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
    for (const id of outboundStructuralIds(entity)) addEdge(entity.id, id, 2, "linked");
  }

  for (const log of logs) {
    const linked = log.entityIds.filter((id) => idSet.has(id));
    for (let i = 0; i < linked.length; i++) {
      for (let j = i + 1; j < linked.length; j++) addEdge(linked[i], linked[j], 1, "co-mentioned");
    }
  }

  // Focus-affinity: dashed suggestion when two nodes share a Focus Tag (Forge affinity ≠ confirmed).
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const a = scored[i];
      const b = scored[j];
      if (a.focusTags.length === 0 || b.focusTags.length === 0) continue;
      const aKeys = new Set(a.focusTags.map(signalTagKey));
      if (!b.focusTags.some((tag) => aKeys.has(signalTagKey(tag)))) continue;
      addEdge(a.entity.id, b.entity.id, 0.5, "focus-affinity");
    }
  }

  return {
    nodes: layoutNeighborhoodGraphNodes(rawNodes, centerEntityId, [...edgeMap.values()]),
    edges: [...edgeMap.values()],
    centerId: centerEntityId,
  };
}

/** Undirected link count per node in a neighborhood edge set. */
export function neighborhoodDegreeMap(edges: V2GraphEdge[]): Map<string, number> {
  const deg = new Map<string, number>();
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    deg.set(edge.from, (deg.get(edge.from) ?? 0) + 1);
    deg.set(edge.to, (deg.get(edge.to) ?? 0) + 1);
  }
  return deg;
}

/**
 * Extra length when either endpoint is a busy hub (many links).
 * Rule: links touching high-degree nodes should be longer.
 */
export function degreeLinkLengthExtra(degreeA: number, degreeB: number): number {
  const hub = Math.max(degreeA, degreeB);
  if (hub <= 2) return 0;
  return Math.min(28, (hub - 2) * 3.5);
}

/** Radial layout — center entity in the middle, neighbors on a ring (or dual ring when crowded). */
export function layoutNeighborhoodGraphNodes(
  nodes: V2GraphNode[],
  centerId: string,
  edges: V2GraphEdge[] = []
): V2GraphNode[] {
  const center = nodes.find((n) => n.id === centerId);
  const neighbors = nodes.filter((n) => n.id !== centerId);
  const laidOut: V2GraphNode[] = [];
  const degrees = neighborhoodDegreeMap(edges);
  const hasEdges = edges.length > 0;
  const centerDeg = hasEdges ? (degrees.get(centerId) ?? neighbors.length) : 0;

  if (center) laidOut.push({ ...center, x: 50, y: 50 });

  const n = neighbors.length;
  neighbors.forEach((node, index) => {
    const angle = (index / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    // Ego views with few nodes get more breathing room; crowded sets use inner+outer rings.
    let radius = 30;
    if (n <= 3) radius = 22;
    else if (n <= 6) radius = 28;
    else if (n <= 10) radius = 32;
    else {
      radius = index % 2 === 0 ? 26 : 36;
    }
    // Longer spokes for busy hubs (center and/or highly linked neighbor).
    if (hasEdges) {
      const neighborDeg = degrees.get(node.id) ?? 1;
      radius = Math.min(46, radius + degreeLinkLengthExtra(centerDeg, neighborDeg) * 0.55);
    }
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
