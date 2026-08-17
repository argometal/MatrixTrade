/**
 * One Tag pipeline — binder Tabs, Notes, and Home Tags vocabulary.
 *
 * Create and delete cannot exist independently:
 * - Add on a Tag tab → binder + Note evidence + Home vocabulary
 * - Remove on a Tag tab → binder + Note/email Topics on that entity
 * - Add on Notes → merge onto the linked binder + Home vocabulary
 * - Remove the last Note use → prune that binder Tag
 *
 * Trackers (`signalTags`) are Flags on this same string vocabulary.
 * Flagging registers the Tag in Home Tags (`globalTags`).
 */
import type { ArgusData, Entity, Log } from "../types";
import { autoTitleFromBody } from "../journal-helpers";
import {
  binderTagWritePatch,
  isEventBinder,
  isTopicBinder,
  normalizeTagDisplay,
  normalizeTagList,
  readTagsForRole,
  tagKey,
  type TagRole,
} from "../tag-ontology";
import { eventAnchorDate } from "./event-chronicle";

export type BinderTagRole = Extract<TagRole, "event" | "topic" | "project">;

export type TagListDiff = {
  added: string[];
  removed: string[];
};

export type TagPipelineResult = {
  added: string[];
  removed: string[];
  placeholderCount: number;
  homeRegistered: number;
};

export function placeholderBodyForTags(tags: string[]): string {
  const list = normalizeTagList(tags);
  if (list.length === 0) return "Tagged";
  return `Tagged: ${list.map((tag) => `#${tag}`).join(" ")}`;
}

/** @deprecated Use placeholderBodyForTags — same pipeline for every binder. */
export function placeholderBodyForEventTags(tags: string[]): string {
  return placeholderBodyForTags(tags);
}

export function binderRoleForEntity(entity: Entity): BinderTagRole | null {
  if (entity.deletedAt) return null;
  if (isEventBinder(entity)) return "event";
  if (isTopicBinder(entity)) return "topic";
  if (entity.type === "project") return "project";
  return null;
}

export function diffTagLists(prev: string[] | undefined, next: string[] | undefined): TagListDiff {
  const prevList = normalizeTagList(prev);
  const nextList = normalizeTagList(next);
  const prevKeys = new Set(prevList.map(tagKey));
  const nextKeys = new Set(nextList.map(tagKey));
  return {
    added: nextList.filter((tag) => !prevKeys.has(tagKey(tag))),
    removed: prevList.filter((tag) => !nextKeys.has(tagKey(tag))),
  };
}

export function mergeBinderTagLists(current: string[] | undefined, incoming: string[]): string[] {
  return normalizeTagList([...(current ?? []), ...incoming]);
}

/** Canonical keys already present on this entity’s Notes / linked emails. */
export function evidenceTagKeysForEntity(data: ArgusData, entityId: string): Set<string> {
  const keys = new Set<string>();
  for (const log of data.logs ?? []) {
    if (log.deletedAt || !(log.entityIds ?? []).includes(entityId)) continue;
    for (const raw of log.topics ?? []) {
      const key = tagKey(raw);
      if (key) keys.add(key);
    }
  }
  for (const item of data.inboxItems ?? []) {
    if (item.deletedAt || !(item.linkedEntityIds ?? []).includes(entityId)) continue;
    for (const raw of item.topics ?? []) {
      const key = tagKey(raw);
      if (key) keys.add(key);
    }
  }
  return keys;
}

export function evidenceTagKeysForEvent(data: ArgusData, eventId: string): Set<string> {
  return evidenceTagKeysForEntity(data, eventId);
}

/** Tags from `candidates` not yet on any evidence row for this entity. */
export function tagsMissingFromEntityEvidence(
  data: ArgusData,
  entityId: string,
  candidates: string[]
): string[] {
  const existing = evidenceTagKeysForEntity(data, entityId);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const display = normalizeTagDisplay(raw);
    if (!display) continue;
    const key = tagKey(display);
    if (!key || seen.has(key) || existing.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out;
}

export function tagsMissingFromEventEvidence(
  data: ArgusData,
  eventId: string,
  candidates: string[]
): string[] {
  return tagsMissingFromEntityEvidence(data, eventId, candidates);
}

/** Register Tags in Home Tags vocabulary (`globalTags`). Does not Flag Trackers. */
export function registerHomeVocabulary(data: ArgusData, tags: string[]): number {
  const incoming = normalizeTagList(tags);
  if (incoming.length === 0) return 0;
  const before = normalizeTagList(data.globalTags);
  const next = normalizeTagList([...before, ...incoming]);
  if (next.length === before.length && next.every((tag, i) => tag === before[i])) return 0;
  data.globalTags = next;
  return next.length - before.length;
}

function evidenceDateForEntity(entity: Entity, nowIso: string): string {
  if (isEventBinder(entity)) return eventAnchorDate(entity);
  return entity.startDate?.slice(0, 10) || entity.createdAt.slice(0, 10) || nowIso.slice(0, 10);
}

function pushPlaceholderEvidence(
  data: ArgusData,
  entity: Entity,
  tags: string[],
  options: { nowIso: string; newId: () => string }
): number {
  const missing = tagsMissingFromEntityEvidence(data, entity.id, tags);
  if (missing.length === 0) return 0;
  const body = placeholderBodyForTags(missing);
  const nowIso = options.nowIso;
  const log: Log = {
    id: options.newId(),
    kind: "log",
    date: evidenceDateForEntity(entity, nowIso),
    title: autoTitleFromBody(body),
    body,
    entityIds: [entity.id],
    topics: missing,
    source: "manual",
    private: false,
    attachmentIds: [],
    classificationStatus: "classified",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  data.logs = [...(data.logs ?? []), log];
  return missing.length;
}

/** Strip Tag membership from Notes/emails on this entity. Does not delete Notes. */
export function stripTagsFromEntityEvidence(
  data: ArgusData,
  entityId: string,
  tags: string[]
): number {
  const keys = new Set(normalizeTagList(tags).map(tagKey).filter(Boolean));
  if (keys.size === 0) return 0;
  let touched = 0;

  data.logs = (data.logs ?? []).map((log) => {
    if (log.deletedAt || !(log.entityIds ?? []).includes(entityId)) return log;
    const topics = log.topics ?? [];
    if (!topics.some((tag) => keys.has(tagKey(tag)))) return log;
    touched += 1;
    return {
      ...log,
      topics: normalizeTagList(topics.filter((tag) => !keys.has(tagKey(tag)))),
      updatedAt: log.updatedAt,
    };
  });

  data.inboxItems = (data.inboxItems ?? []).map((item) => {
    if (item.deletedAt || !(item.linkedEntityIds ?? []).includes(entityId)) return item;
    const topics = item.topics ?? [];
    if (!topics.some((tag) => keys.has(tagKey(tag)))) return item;
    touched += 1;
    return {
      ...item,
      topics: normalizeTagList(topics.filter((tag) => !keys.has(tagKey(tag)))),
    };
  });

  return touched;
}

function writeBinderTags(
  data: ArgusData,
  entity: Entity,
  role: BinderTagRole,
  tags: string[],
  nowIso?: string
): void {
  const patch = binderTagWritePatch(entity, role, tags);
  const idx = data.entities.findIndex((entry) => entry.id === entity.id);
  if (idx === -1) return;
  data.entities[idx] = {
    ...data.entities[idx],
    ...patch,
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

/**
 * Replace binder Tags and keep Notes + Home vocabulary in the same system.
 * Add → placeholder Note when missing + Home register.
 * Remove → strip from Notes/emails on this entity (Notes stay).
 */
export function applyBinderTagSync(
  data: ArgusData,
  entityId: string,
  nextTags: string[],
  options: { nowIso: string; newId: () => string }
): TagPipelineResult {
  const empty: TagPipelineResult = { added: [], removed: [], placeholderCount: 0, homeRegistered: 0 };
  const entity = data.entities.find((entry) => entry.id === entityId && !entry.deletedAt);
  if (!entity) return empty;
  const role = binderRoleForEntity(entity);
  if (!role) return empty;

  const prev = readTagsForRole(data, role, { entityId });
  const next = normalizeTagList(nextTags);
  const { added, removed } = diffTagLists(prev, next);

  writeBinderTags(data, entity, role, next, options.nowIso);

  let placeholderCount = 0;
  if (removed.length > 0) {
    stripTagsFromEntityEvidence(data, entityId, removed);
  }
  if (added.length > 0) {
    placeholderCount = pushPlaceholderEvidence(data, data.entities[data.entities.findIndex((e) => e.id === entityId)]!, added, options);
  }
  const homeRegistered = added.length > 0 ? registerHomeVocabulary(data, added) : 0;

  return { added, removed, placeholderCount, homeRegistered };
}

/** Merge Tags onto binder + Notes + Home without removing anything. */
export function ensureTagsInPipeline(
  data: ArgusData,
  entityId: string,
  tags: string[],
  options: { nowIso: string; newId: () => string }
): TagPipelineResult {
  const empty: TagPipelineResult = { added: [], removed: [], placeholderCount: 0, homeRegistered: 0 };
  const incoming = normalizeTagList(tags);
  if (incoming.length === 0) return empty;
  const entity = data.entities.find((entry) => entry.id === entityId && !entry.deletedAt);
  if (!entity) return empty;
  const role = binderRoleForEntity(entity);
  if (!role) {
    const placeholderCount = pushPlaceholderEvidence(data, entity, incoming, options);
    const homeRegistered = registerHomeVocabulary(data, incoming);
    return { added: incoming, removed: [], placeholderCount, homeRegistered };
  }

  const prev = readTagsForRole(data, role, { entityId });
  const next = mergeBinderTagLists(prev, incoming);
  const { added } = diffTagLists(prev, next);
  writeBinderTags(data, entity, role, next, options.nowIso);
  const live = data.entities.find((entry) => entry.id === entityId)!;
  const placeholderCount = pushPlaceholderEvidence(data, live, incoming, options);
  const homeRegistered = registerHomeVocabulary(data, incoming);
  return { added, removed: [], placeholderCount, homeRegistered };
}

/**
 * Evidence → binder: merge Note/email Tags onto linked binders + Home vocabulary.
 * Used when creating/updating Notes so Tag tabs cannot drift.
 */
export function mergeEvidenceTagsIntoBinders(
  data: ArgusData,
  entityIds: string[],
  tags: string[]
): number {
  const incoming = normalizeTagList(tags);
  if (incoming.length === 0 || entityIds.length === 0) return 0;
  let touched = 0;
  for (const entityId of entityIds) {
    const entity = data.entities.find((entry) => entry.id === entityId && !entry.deletedAt);
    if (!entity) continue;
    const role = binderRoleForEntity(entity);
    if (!role) continue;
    const prev = readTagsForRole(data, role, { entityId });
    const next = mergeBinderTagLists(prev, incoming);
    if (next.length === prev.length && next.every((tag, i) => tag === prev[i])) continue;
    writeBinderTags(data, entity, role, next);
    touched += 1;
  }
  registerHomeVocabulary(data, incoming);
  return touched;
}

/**
 * After Note Topics are removed, drop the Tag from the binder when no evidence remains.
 */
export function pruneBinderTagsMissingEvidence(
  data: ArgusData,
  entityIds: string[],
  removedTags: string[]
): number {
  const removed = normalizeTagList(removedTags);
  if (removed.length === 0 || entityIds.length === 0) return 0;
  let touched = 0;
  for (const entityId of entityIds) {
    const entity = data.entities.find((entry) => entry.id === entityId && !entry.deletedAt);
    if (!entity) continue;
    const role = binderRoleForEntity(entity);
    if (!role) continue;
    const remainingEvidence = evidenceTagKeysForEntity(data, entityId);
    const prev = readTagsForRole(data, role, { entityId });
    const next = prev.filter((tag) => {
      const key = tagKey(tag);
      if (!removed.some((raw) => tagKey(raw) === key)) return true;
      return remainingEvidence.has(key);
    });
    if (next.length === prev.length) continue;
    writeBinderTags(data, entity, role, next);
    touched += 1;
  }
  return touched;
}
