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
  /** Depth experiment metadata — UI can warn when Extended trim is incomplete. */
  meta?: {
    maxHops: NeighborhoodHopDepth;
    candidateCount: number;
    keptCount: number;
    trimmed: boolean;
  };
};

/** Local neighborhood hop depth. 2 = coherent default; 5 = Extended (trim errors likely). */
export type NeighborhoodHopDepth = 2 | 3 | 5;

export const NEIGHBORHOOD_HOP_DEPTHS: NeighborhoodHopDepth[] = [2, 3, 5];

export function isNeighborhoodHopDepth(value: unknown): value is NeighborhoodHopDepth {
  return value === 2 || value === 3 || value === 5;
}

/** Canvas budget scales with hop depth — pan/zoom can hold more than the old 14-cap. */
export function neighborhoodMaxNodesForDepth(maxHops: NeighborhoodHopDepth): number {
  if (maxHops >= 5) return 28;
  if (maxHops >= 3) return 22;
  return 16;
}

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

/** Logs + inbox for Pattern mining across a binder neighborhood (deduped). */
function collectEvidenceForPatternScope(
  data: ArgusData,
  inboxItems: InboxItem[],
  scopeIds: Iterable<string>,
  includePrivate: boolean,
  allLogs: Log[]
): { logs: Log[]; inbox: InboxItem[] } {
  const logs: Log[] = [];
  const inbox: InboxItem[] = [];
  const seenLog = new Set<string>();
  const seenInbox = new Set<string>();

  for (const entityId of scopeIds) {
    for (const log of allLogs) {
      if (!log.entityIds.includes(entityId) || seenLog.has(log.id)) continue;
      seenLog.add(log.id);
      logs.push(log);
    }
    for (const item of getLinkedInboxForEntity(inboxItems, entityId, includePrivate)) {
      if (seenInbox.has(item.id)) continue;
      seenInbox.add(item.id);
      inbox.push(item);
    }
  }
  return { logs, inbox };
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

    // Patterns mine evidence Tags only — for Topics/Projects use the same neighborhood
    // as evidenceCount (Topic ∪ linked Events; Project ∪ linked Topics/Events).
    let patternLogs: Log[];
    let patternInbox: InboxItem[];
    if (kind === "topic") {
      const scopeIds = new Set<string>([entity.id, ...getLinkedEventIdsForTopic(data, entity.id, logs)]);
      const scoped = collectEvidenceForPatternScope(data, inboxItems, scopeIds, includePrivate, logs);
      patternLogs = scoped.logs;
      patternInbox = scoped.inbox;
    } else if (kind === "project") {
      const { topicIds, eventIds } = countTopicsAndEventsInScope(data, entity, logs);
      const scopeIds = new Set<string>([entity.id, ...topicIds, ...eventIds]);
      const scoped = collectEvidenceForPatternScope(data, inboxItems, scopeIds, includePrivate, logs);
      patternLogs = scoped.logs;
      patternInbox = scoped.inbox;
    } else {
      patternLogs = logs.filter((l) => l.entityIds.includes(entity.id));
      patternInbox = getLinkedInboxForEntity(inboxItems, entity.id, includePrivate);
    }
    const patterns = buildTagPatternsForScope(patternLogs, patternInbox, today);
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

/** Undirected structural adjacency for neighborhood connectivity repairs. */
function buildStructuralAdjacency(
  ids: Iterable<string>,
  entityMap: Map<string, Entity>
): Map<string, Set<string>> {
  const idSet = new Set(ids);
  const adj = new Map<string, Set<string>>();
  function link(a: string, b: string) {
    if (a === b || !idSet.has(a) || !idSet.has(b)) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  for (const id of idSet) {
    const entity = entityMap.get(id);
    if (!entity) continue;
    for (const other of outboundStructuralIds(entity)) link(id, other);
  }
  return adj;
}

function structuralPath(
  fromId: string,
  toId: string,
  adj: Map<string, Set<string>>
): string[] | null {
  if (fromId === toId) return [fromId];
  const prev = new Map<string, string | null>([[fromId, null]]);
  const queue = [fromId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (prev.has(next)) continue;
      prev.set(next, id);
      if (next === toId) {
        const path = [toId];
        let cur: string | null = toId;
        while (cur && cur !== fromId) {
          cur = prev.get(cur) ?? null;
          if (cur) path.push(cur);
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

function isReachable(
  fromId: string,
  toId: string,
  keep: Set<string>,
  adj: Map<string, Set<string>>
): boolean {
  if (fromId === toId) return true;
  const seen = new Set<string>([fromId]);
  const queue = [fromId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (!keep.has(next) || seen.has(next)) continue;
      if (next === toId) return true;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

/**
 * After maxNodes trim, Events/Topics can remain while their bridge was dropped —
 * leaving a visible node with no drawn relation. Always restore the shortest
 * structural path hops so every kept neighbor stays connected to center.
 * Prefer a slightly larger canvas over orphan nodes (budget no longer aborts mid-path).
 */
export function promoteNeighborhoodBridgeIds(
  centerId: string,
  keptIds: Set<string>,
  candidateIds: Set<string>,
  entityMap: Map<string, Entity>,
  _options: { maxExtra?: number } = {}
): Set<string> {
  const adj = buildStructuralAdjacency(candidateIds, entityMap);
  const result = new Set(keptIds);
  if (!result.has(centerId)) result.add(centerId);

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...result]) {
      if (id === centerId) continue;
      if (isReachable(centerId, id, result, adj)) continue;
      const path = structuralPath(centerId, id, adj);
      if (!path || path.length < 2) continue;
      for (const hop of path) {
        if (result.has(hop)) continue;
        if (!candidateIds.has(hop) && hop !== centerId) continue;
        result.add(hop);
        changed = true;
      }
    }
  }
  return result;
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

/** Local N-hop subgraph from one entity — Kumu / Obsidian neighborhood pattern. */
export function buildV2EntityNeighborhoodGraph(
  data: ArgusData,
  inboxItems: InboxItem[],
  centerEntityId: string,
  includePrivate: boolean,
  today: string,
  options: { maxNodes?: number; maxHops?: NeighborhoodHopDepth } = {}
): V2EntityNeighborhoodGraph {
  const maxHops: NeighborhoodHopDepth = isNeighborhoodHopDepth(options.maxHops)
    ? options.maxHops
    : 2;
  const maxNodes = options.maxNodes ?? neighborhoodMaxNodesForDepth(maxHops);
  const entities = data.entities.filter((e) => !e.deletedAt);
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const center = entityMap.get(centerEntityId);
  if (!center) return { nodes: [], edges: [], centerId: centerEntityId };

  const logs = visibleLogs(data, includePrivate);
  const neighborIds = new Set<string>([centerEntityId]);

  // Hop 1 — rich neighbor policy (bridge + parent org + co-mention).
  for (const id of collectNeighborEntityIds(data, center, logs)) {
    if (entityMap.has(id)) neighborIds.add(id);
  }

  // Hops 2..maxHops — structural only (outbound/reverse) so co-mention does not explode.
  let frontier = [...neighborIds].filter((id) => id !== centerEntityId);
  for (let hop = 2; hop <= maxHops; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      const entity = entityMap.get(id);
      if (!entity) continue;
      for (const linkedId of collectLinkedNeighborIds(entity, entityMap)) {
        if (neighborIds.has(linkedId)) continue;
        neighborIds.add(linkedId);
        next.push(linkedId);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  const focusKeys = signalTagKeySet(data.signalTags);
  const scoredAll = [...neighborIds]
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
    });

  const candidateCount = scoredAll.length;
  const trimmed = scoredAll.slice(0, maxNodes);
  const keptIds = new Set(trimmed.map((s) => s.entity.id));
  // If an Event (or any hop-2 binder) survived the cut, keep its structural path
  // so the relation stays drawable when the node is on canvas.
  const connectedIds = promoteNeighborhoodBridgeIds(
    centerEntityId,
    keptIds,
    neighborIds,
    entityMap
  );

  const byId = new Map(scoredAll.map((s) => [s.entity.id, s]));
  const scored = [...connectedIds]
    .map((id) => byId.get(id))
    .filter((row): row is (typeof scoredAll)[number] => Boolean(row))
    .sort((a, b) => {
      if (a.isCenter) return -1;
      if (b.isCenter) return 1;
      return b.total - a.total || a.entity.name.localeCompare(b.entity.name);
    });

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

  // Structural edges both ways (outbound ∪ reverse) so Topic→Event always draws
  // when both nodes are present — even if only one bag stores the link.
  for (const id of idSet) {
    const entity = entityMap.get(id);
    if (!entity) continue;
    for (const otherId of outboundStructuralIds(entity)) {
      addEdge(id, otherId, 2, "linked");
    }
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

  const keptCount = scored.length;
  return {
    nodes: layoutNeighborhoodGraphNodes(rawNodes, centerEntityId, [...edgeMap.values()]),
    edges: [...edgeMap.values()],
    centerId: centerEntityId,
    meta: {
      maxHops,
      candidateCount,
      keptCount,
      trimmed: candidateCount > keptCount,
    },
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
 * Chem-lite shared bond length (viewBox units).
 * Radial rings and Molecule springs must use the same unit so layouts stay coherent.
 */
export const CHEM_NEIGHBORHOOD_LINK_UNIT = 15;

/**
 * Shortest-hop distance from center (undirected). Missing nodes default to 1 for layout.
 * Prefer structural / strong edges when present so co-mention shortcuts do not flatten the molecule.
 */
export function neighborhoodHopMap(
  centerId: string,
  edges: V2GraphEdge[]
): Map<string, number> {
  const adj = new Map<string, Set<string>>();
  function link(a: string, b: string) {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  const structural = edges.filter((e) => e.kind === "linked" || e.weight >= 2);
  const useEdges = structural.length > 0 ? structural : edges;
  for (const edge of useEdges) link(edge.from, edge.to);

  const hops = new Map<string, number>([[centerId, 0]]);
  const queue = [centerId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const base = hops.get(id) ?? 0;
    for (const next of adj.get(id) ?? []) {
      if (hops.has(next)) continue;
      hops.set(next, base + 1);
      queue.push(next);
    }
  }
  return hops;
}

/**
 * Chem-lite link-distance multiplier (uniform short bonds; mild bump only for hubs).
 * 1–3 links → 1× · 4+ links → 1.4×
 * Crowding at degree 3 uses angles / collide / charge — not bond stretch.
 */
export function degreeDistanceMultiplier(degree: number): number {
  if (degree <= 3) return 1;
  return 1.4;
}

/**
 * Extra length beyond a single unit — kept for callers that add onto a base radius.
 * Prefer `degreeDistanceMultiplier` for new layout math.
 */
export function degreeLinkLengthExtra(degreeA: number, degreeB: number): number {
  const hub = Math.max(degreeA, degreeB);
  const mult = degreeDistanceMultiplier(hub);
  // Unit ≈ CHEM_NEIGHBORHOOD_LINK_UNIT → extras: 1x→0, 4+ → ~6
  return (mult - 1) * CHEM_NEIGHBORHOOD_LINK_UNIT;
}

/**
 * Preferred chem bond length for one edge (shared by Radial radius math + Molecule springs).
 */
export function chemNeighborhoodLinkDistance(
  degreeA: number,
  degreeB: number,
  weightNudge = 0
): number {
  const mult = degreeDistanceMultiplier(Math.max(degreeA, degreeB));
  return Math.min(52, CHEM_NEIGHBORHOOD_LINK_UNIT * mult + weightNudge);
}

/** Radial layout — center in the middle; hop rings × chem-lite bond length. */
export function layoutNeighborhoodGraphNodes(
  nodes: V2GraphNode[],
  centerId: string,
  edges: V2GraphEdge[] = []
): V2GraphNode[] {
  const center = nodes.find((n) => n.id === centerId);
  const neighbors = nodes.filter((n) => n.id !== centerId);
  const laidOut: V2GraphNode[] = [];
  const degrees = neighborhoodDegreeMap(edges);
  const hops = edges.length > 0 ? neighborhoodHopMap(centerId, edges) : new Map<string, number>();
  const hasEdges = edges.length > 0;
  const centerDeg = hasEdges ? (degrees.get(centerId) ?? neighbors.length) : 0;

  if (center) laidOut.push({ ...center, x: 50, y: 50 });

  // Place each hop ring evenly so 2-hop nodes sit farther than 1-hop (chem path length).
  const byHop = new Map<number, V2GraphNode[]>();
  for (const node of neighbors) {
    const hop = hasEdges ? Math.max(1, hops.get(node.id) ?? 1) : 1;
    const list = byHop.get(hop) ?? [];
    list.push(node);
    byHop.set(hop, list);
  }

  const hopKeys = [...byHop.keys()].sort((a, b) => a - b);
  for (const hop of hopKeys) {
    const ring = byHop.get(hop) ?? [];
    const n = ring.length;
    ring.forEach((node, index) => {
      const angle = (index / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
      const neighborDeg = hasEdges ? (degrees.get(node.id) ?? 1) : 1;
      const hubDeg = hasEdges ? Math.max(hop === 1 ? centerDeg : 0, neighborDeg) : 1;
      const bond = chemNeighborhoodLinkDistance(hubDeg, neighborDeg);
      let radius = hop * bond;
      // Crowded ego: slight alternate so same-ring nodes do not stack.
      if (n > 8) {
        radius = Math.min(48, radius + (index % 2 === 0 ? -1.2 : 1.2));
      } else {
        radius = Math.min(48, radius);
      }
      laidOut.push({
        ...node,
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
      });
    });
  }

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
