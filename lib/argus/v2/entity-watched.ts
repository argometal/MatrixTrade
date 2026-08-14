/**
 * Definition D — entity “Watched” / Tracker intersection truth.
 *
 * A Tracker is a journal-wide Flag (`ArgusData.signalTags`) on a Tag key.
 * An entity is Watched when binder ∪ direct evidence intersects that set.
 * Branch / neighborhood vocabulary never counts.
 *
 * Event:  (eventTags ∪ direct Event Note/email Tags) ∩ signalTags
 * Topic:  (topicTags ∪ direct Topic Note/email Tags ∪ linked Events’
 *         binder∪direct evidence when those Events are in the Topic rollup) ∩ signalTags
 * Project/Org/Person: (binder Tags ∪ direct evidence on that entity) ∩ signalTags
 *
 * UI note: Topic Tags → Trackers section lists only Topic binder ∪ Topic-direct
 * Flags. By Event rows show ⚑ on Event-owned Tags without making the Topic
 * “own” those Trackers in the Trackers section.
 */
import type { ArgusData, Entity, InboxItem } from "../types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { referenceKindFromNotes } from "../reference-types";
import { readTagsForRole } from "../tag-ontology";
import { signalTagKey, signalTagKeySet } from "../signal-tags";
import {
  collectNeighborEntityIds,
  countTopicsAndEventsInScope,
  outboundStructuralIds,
} from "./scope-node-counts";

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function isEventEntity(entity: Entity): boolean {
  return referenceKindFromNotes(entity.notes ?? "") === "event";
}

function isTopicEntity(entity: Entity): boolean {
  return referenceKindFromNotes(entity.notes ?? "") === "topic";
}

/** Binder classification Tags for an entity (role-aware). */
export function binderTagsForEntity(data: ArgusData, entity: Entity): string[] {
  const ref = referenceKindFromNotes(entity.notes ?? "");
  if (ref === "event") return readTagsForRole(data, "event", { entityId: entity.id });
  if (ref === "topic") return readTagsForRole(data, "topic", { entityId: entity.id });
  if (entity.type === "project") return readTagsForRole(data, "project", { entityId: entity.id });
  return [];
}

/** Tags on Notes/emails directly linked to this entity id. */
export function directEvidenceTagsForEntity(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean
): string[] {
  const out = new Map<string, string>();
  for (const log of getEntityHistory(data, entityId, includePrivate)) {
    for (const raw of log.topics ?? []) {
      const tag = normalizeTag(raw);
      const key = signalTagKey(tag);
      if (tag && key && !out.has(key)) out.set(key, tag);
    }
  }
  for (const item of getLinkedInboxForEntity(inboxItems, entityId, includePrivate)) {
    for (const raw of item.topics ?? []) {
      const tag = normalizeTag(raw);
      const key = signalTagKey(tag);
      if (tag && key && !out.has(key)) out.set(key, tag);
    }
  }
  return [...out.values()].sort((a, b) => a.localeCompare(b));
}

/** Linked Event ids for a Topic — same rollup scope as Topic Tags / Chronicle. */
export function collectTopicLinkedEventIdsForWatch(
  data: ArgusData,
  topic: Entity,
  includePrivate: boolean
): Set<string> {
  const history = getEntityHistory(data, topic.id, includePrivate);
  const neighborIds = collectNeighborEntityIds(data, topic, history);
  const nodeCounts = countTopicsAndEventsInScope(data, topic, history);
  const eventIds = new Set(nodeCounts.eventIds);
  for (const id of neighborIds) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (entity && isEventEntity(entity)) eventIds.add(id);
  }
  for (const id of outboundStructuralIds(topic)) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (entity && isEventEntity(entity)) eventIds.add(id);
  }
  return eventIds;
}

/**
 * Tag strings that belong to this entity for Watched / hasTracker (definition D).
 * Excludes branch / neighborhood pools.
 */
export function ownershipTagsForEntity(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean
): string[] {
  const entity = data.entities.find((e) => e.id === entityId && !e.deletedAt);
  if (!entity) return [];

  const byKey = new Map<string, string>();
  function addAll(tags: string[]) {
    for (const raw of tags) {
      const tag = normalizeTag(raw);
      const key = signalTagKey(tag);
      if (tag && key && !byKey.has(key)) byKey.set(key, tag);
    }
  }

  addAll(binderTagsForEntity(data, entity));
  addAll(directEvidenceTagsForEntity(data, inboxItems, entity.id, includePrivate));

  // Topic Watched includes linked Events’ binder ∪ direct evidence (rollup),
  // without treating those as Topic-owned in the Trackers section UI.
  if (isTopicEntity(entity)) {
    for (const eventId of collectTopicLinkedEventIdsForWatch(data, entity, includePrivate)) {
      const event = data.entities.find((e) => e.id === eventId && !e.deletedAt);
      if (!event || !isEventEntity(event)) continue;
      addAll(binderTagsForEntity(data, event));
      addAll(directEvidenceTagsForEntity(data, inboxItems, event.id, includePrivate));
    }
  }

  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Flagged Trackers that appear on this entity’s ownership vocabulary (definition D).
 * Returns display strings from the Flag list when possible.
 */
export function watchedTrackerTagsOnEntity(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean,
  focusKeys?: Set<string>
): string[] {
  const keys = focusKeys ?? signalTagKeySet(data.signalTags);
  if (keys.size === 0) return [];

  const matched = new Map<string, string>();
  for (const raw of ownershipTagsForEntity(data, inboxItems, entityId, includePrivate)) {
    const key = signalTagKey(raw);
    if (!key || !keys.has(key) || matched.has(key)) continue;
    matched.set(key, normalizeTag(raw));
  }
  return [...matched.values()].sort((a, b) => a.localeCompare(b));
}

export function entityHasTracker(
  data: ArgusData,
  inboxItems: InboxItem[],
  entityId: string,
  includePrivate: boolean
): boolean {
  return watchedTrackerTagsOnEntity(data, inboxItems, entityId, includePrivate).length > 0;
}

/**
 * Topic Trackers-section ownership only: Topic binder ∪ Topic-direct evidence.
 * Does not include linked Event Tags (those show ⚑ under By Event).
 */
export function topicLocalOwnershipTags(
  data: ArgusData,
  inboxItems: InboxItem[],
  topicId: string,
  includePrivate: boolean
): string[] {
  const topic = data.entities.find((e) => e.id === topicId && !e.deletedAt);
  if (!topic || !isTopicEntity(topic)) return [];
  const byKey = new Map<string, string>();
  for (const raw of [
    ...binderTagsForEntity(data, topic),
    ...directEvidenceTagsForEntity(data, inboxItems, topic.id, includePrivate),
  ]) {
    const tag = normalizeTag(raw);
    const key = signalTagKey(tag);
    if (tag && key && !byKey.has(key)) byKey.set(key, tag);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
