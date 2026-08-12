/**
 * Portfolio Timeline for Org / Project — base evidence ∪ linked Topic/Event
 * anchors ∪ Notes/emails on those binders (Topic Chronicle–style rollup).
 */

import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { isEventEntity, isTopicEntity } from "./scope-node-counts";
import type { V2TimelineEntry } from "./mock-data";
import {
  buildTimelineFromLogsAndInbox,
  inboxToTimelineEntry,
  logToTimelineEntry,
  mergeTimelineEntries,
} from "./timeline-builders";

function annotateSource(entry: V2TimelineEntry, sourceName: string, kindLabel: string): V2TimelineEntry {
  const prefix = `${kindLabel} · ${sourceName}`;
  return {
    ...entry,
    author: entry.author ? `${prefix} · ${entry.author}` : prefix,
    meta: entry.meta ? `${prefix} · ${entry.meta}` : prefix,
  };
}

function eventAnchor(event: Entity): V2TimelineEntry {
  const date = (event.startDate || event.endDate || event.createdAt || "").slice(0, 10);
  return {
    id: `anchor-event-${event.id}`,
    date: date || "1970-01-01",
    kind: "event",
    title: event.name,
    body: "Linked Event",
    author: "Event",
    href: `/argus/v2/browse/events?selected=${event.id}`,
    meta: "Event anchor",
  };
}

function topicAnchor(topic: Entity): V2TimelineEntry {
  const date = (topic.createdAt || topic.updatedAt || "").slice(0, 10);
  return {
    id: `anchor-topic-${topic.id}`,
    date: date || "1970-01-01",
    kind: "topic",
    title: topic.name,
    body: "Linked Topic",
    author: "Topic",
    href: `/argus/v2/browse/topics?selected=${topic.id}`,
    meta: "Topic anchor",
  };
}

/**
 * Build Timeline entries for an Org/Project portfolio lens.
 * Dedupes by entry id (base evidence wins over rolled-in copies).
 */
export function buildPortfolioEntityTimeline(options: {
  data: ArgusData;
  inboxItems: InboxItem[];
  includePrivate: boolean;
  baseLogs: Log[];
  baseInbox: InboxItem[];
  topicIds: Iterable<string>;
  eventIds: Iterable<string>;
  /** When set, only include rolled-in rows / anchors whose date passes. */
  dateInScope?: (iso: string) => boolean;
}): V2TimelineEntry[] {
  const {
    data,
    inboxItems,
    includePrivate,
    baseLogs,
    baseInbox,
    topicIds,
    eventIds,
    dateInScope,
  } = options;

  const inScope = (iso: string) => (dateInScope ? dateInScope(iso) : true);
  const byId = new Map<string, V2TimelineEntry>();

  function add(entry: V2TimelineEntry) {
    if (!entry.date || !inScope(entry.date)) return;
    if (byId.has(entry.id)) return;
    byId.set(entry.id, entry);
  }

  for (const entry of buildTimelineFromLogsAndInbox(baseLogs, baseInbox)) {
    // Base scope already date-filtered by callers — always include.
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }

  for (const eventId of eventIds) {
    const event = data.entities.find((e) => e.id === eventId && !e.deletedAt);
    if (!event || !isEventEntity(event)) continue;
    add(eventAnchor(event));
    const logs = getEntityHistory(data, eventId, includePrivate);
    const inbox = getLinkedInboxForEntity(inboxItems, eventId, includePrivate);
    for (const log of logs) {
      add(annotateSource(logToTimelineEntry(log), event.name, "Event"));
    }
    for (const item of inbox) {
      add(annotateSource(inboxToTimelineEntry(item), event.name, "Event"));
    }
  }

  for (const topicId of topicIds) {
    const topic = data.entities.find((e) => e.id === topicId && !e.deletedAt);
    if (!topic || !isTopicEntity(topic)) continue;
    add(topicAnchor(topic));
    const logs = getEntityHistory(data, topicId, includePrivate);
    const inbox = getLinkedInboxForEntity(inboxItems, topicId, includePrivate);
    for (const log of logs) {
      add(annotateSource(logToTimelineEntry(log), topic.name, "Topic"));
    }
    for (const item of inbox) {
      add(annotateSource(inboxToTimelineEntry(item), topic.name, "Topic"));
    }
  }

  return mergeTimelineEntries([...byId.values()]);
}
