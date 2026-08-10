import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { entityHasPrivateEvidence } from "../entity-private-evidence";
import { entityDeleteRequiresAuthenticator } from "../delete-link-check";
import { browseEntitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { relativeActivityLabel } from "./timeline-builders";
import {
  buildEntityEvidenceStream,
  countEvidenceStream,
  latestEvidenceIso,
  type V2EvidenceStreamItem,
} from "./evidence-stream";
import { buildTagPatternsForScope } from "./tag-patterns";
import { readTagsForRole } from "../tag-ontology";
import {
  collectNeighborEntityIds,
  countTopicsAndEventsInScope,
  isEventEntity as scopeIsEventEntity,
  isEventEntityForMetrics as scopeIsEventEntityForMetrics,
  isTopicEntity as scopeIsTopicEntity,
  linkModalStructuralIds,
  outboundStructuralIds,
} from "./scope-node-counts";
import { countLinkKinds, linkedEventRefs } from "./entity-link-counts";
import type {
  V2TopicDetail,
  V2TopicLinkedEntity,
  V2TopicRow,
  V2TopicTab,
  V2TopicTagChip,
} from "./topic-browse-utils";
export type {
  V2TopicDetail,
  V2TopicFilterOptions,
  V2TopicFilters,
  V2TopicLinkedEntity,
  V2TopicRow,
  V2TopicTab,
  V2TopicTagChip,
} from "./topic-browse-utils";
export {
  buildV2TopicFilterOptions,
  buildV2TopicTabCounts,
  filterV2TopicRows,
  hasActiveV2TopicFilters,
  paginateV2TopicRows,
  parseV2TopicFilters,
  parseV2TopicTab,
  v2TopicPageCount,
  V2_TOPIC_PAGE_SIZE,
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
  const ids = collectNeighborEntityIds(data, topic, logs);

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

/** Linked Event ids for a Topic — same binder scope as Tags rollup / Home treemap. */
function collectTopicLinkedEventIds(data: ArgusData, topic: Entity, history: Log[]): Set<string> {
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

function mergeEvidenceStreams(streams: V2EvidenceStreamItem[][]): V2EvidenceStreamItem[] {
  const seen = new Set<string>();
  const out: V2EvidenceStreamItem[] = [];
  for (const stream of streams) {
    for (const item of stream) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out.sort((a, b) => b.sortIso.localeCompare(a.sortIso));
}

/**
 * Topic Chronicle + metric counts = portfolio evidence (topic ∪ linked Events).
 * Notes are born on Events; Topic is the aggregation lens — Chronicle must show that story.
 */
function topicEvidenceBundle(
  data: ArgusData,
  topicId: string,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
) {
  const topic = data.entities.find((e) => e.id === topicId && !e.deletedAt);
  const history = getEntityHistory(data, topicId, includePrivate);
  const inbox = getLinkedInboxForEntity(inboxItems, topicId, includePrivate);
  const topicDirect = buildEntityEvidenceStream(data, topicId, inboxItems, includePrivate, today);

  const streams: V2EvidenceStreamItem[][] = [topicDirect];
  if (topic) {
    for (const eventId of collectTopicLinkedEventIds(data, topic, history)) {
      const event = data.entities.find((e) => e.id === eventId && !e.deletedAt);
      const eventStream = buildEntityEvidenceStream(data, eventId, inboxItems, includePrivate, today);
      if (!event) {
        streams.push(eventStream);
        continue;
      }
      // Annotate source Event so the Topic lens shows where evidence was born.
      streams.push(
        eventStream.map((item) => ({
          ...item,
          meta: `${event.name} · ${item.meta}`,
        }))
      );
    }
  }
  const evidence = mergeEvidenceStreams(streams);
  const counts = countEvidenceStream(evidence);
  const lastIso = latestEvidenceIso(
    evidence,
    history[0]?.date || inbox[0]?.receivedAt || ""
  );
  return { history, inbox, evidence, counts, lastIso };
}

function normalizeEvidenceTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Derived Tag pool for Note pickers — Tags already used on Notes/emails in Topic scope
 * (topic-direct ∪ linked Events). Not persisted; no Topic Tag ownership.
 */
export function collectEvidenceTagsForTopicIds(
  data: ArgusData,
  inboxItems: InboxItem[],
  topicIds: string[],
  includePrivate: boolean,
  today: string
): string[] {
  return collectEvidenceTagCountsForTopicIds(data, inboxItems, topicIds, includePrivate, today).map(
    (row) => row.tag
  );
}

/** Same as collectEvidenceTagsForTopicIds with trustworthy evidence counts. */
export function collectEvidenceTagCountsForTopicIds(
  data: ArgusData,
  inboxItems: InboxItem[],
  topicIds: string[],
  includePrivate: boolean,
  today: string
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, { tag: string; count: number }>();

  for (const topicId of topicIds) {
    const topic = data.entities.find((entity) => entity.id === topicId && !entity.deletedAt);
    if (!topic || !isTopicEntity(topic)) continue;
    const history = getEntityHistory(data, topic.id, includePrivate);
    const inbox = getLinkedInboxForEntity(inboxItems, topic.id, includePrivate);
    const neighborIds = collectNeighborEntityIds(data, topic, history);
    const nodeCounts = countTopicsAndEventsInScope(data, topic, history);
    const eventIds = new Set(nodeCounts.eventIds);
    for (const id of neighborIds) {
      const entity = data.entities.find((e) => e.id === id);
      if (entity && isEventEntity(entity)) eventIds.add(id);
    }
    for (const id of outboundStructuralIds(topic)) {
      const entity = data.entities.find((e) => e.id === id);
      if (entity && isEventEntity(entity)) eventIds.add(id);
    }
    const { evidenceTagCounts } = topicTagRollup(
      data,
      topic,
      history,
      inbox,
      eventIds,
      inboxItems,
      includePrivate,
      today
    );
    for (const row of evidenceTagCounts) {
      const key = row.tag.toLowerCase();
      const existing = counts.get(key);
      if (existing) existing.count += row.count;
      else counts.set(key, { tag: row.tag, count: row.count });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Union topic + linked-event evidence for Patterns, and per-event tag lists for the Tags tab.
 * Chronicle stays topic ∪ linked Events (aggregation lens); Tags roll up binders so Event note tags are visible here.
 */
function topicTagRollup(
  data: ArgusData,
  topic: Entity,
  topicHistory: Log[],
  topicInbox: InboxItem[],
  eventIds: Iterable<string>,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
) {
  const logs: Log[] = [...topicHistory];
  const inbox: InboxItem[] = [...topicInbox];
  const seenLog = new Set(topicHistory.map((log) => log.id));
  const seenInbox = new Set(topicInbox.map((item) => item.id));
  const eventEvidenceTags: V2TopicDetail["eventEvidenceTags"] = [];

  for (const eventId of eventIds) {
    const event = data.entities.find((e) => e.id === eventId && !e.deletedAt);
    if (!event || !isEventEntity(event)) continue;
    const eHistory = getEntityHistory(data, eventId, includePrivate);
    const eInbox = getLinkedInboxForEntity(inboxItems, eventId, includePrivate);
    const tags = new Set<string>();
    for (const log of eHistory) {
      if (!seenLog.has(log.id)) {
        logs.push(log);
        seenLog.add(log.id);
      }
      for (const raw of log.topics ?? []) {
        const tag = normalizeEvidenceTag(raw);
        if (tag) tags.add(tag);
      }
    }
    for (const item of eInbox) {
      if (!seenInbox.has(item.id)) {
        inbox.push(item);
        seenInbox.add(item.id);
      }
      for (const raw of item.topics ?? []) {
        const tag = normalizeEvidenceTag(raw);
        if (tag) tags.add(tag);
      }
    }
    if (tags.size === 0) continue;
    const date = event.startDate || event.endDate || event.createdAt;
    eventEvidenceTags.push({
      id: event.id,
      name: event.name,
      href: `/argus/v2/browse/events?selected=${event.id}`,
      dateLabel: date ? date.slice(0, 10) : undefined,
      tags: [...tags].sort((a, b) => a.localeCompare(b)),
    });
  }

  eventEvidenceTags.sort((a, b) => a.name.localeCompare(b.name));

  const tagCounts = new Map<string, { tag: string; count: number }>();
  function bump(raw: string) {
    const tag = normalizeEvidenceTag(raw);
    if (!tag) return;
    const key = tag.toLowerCase();
    const row = tagCounts.get(key) ?? { tag, count: 0 };
    row.count += 1;
    tagCounts.set(key, row);
  }
  for (const log of logs) {
    for (const raw of log.topics ?? []) bump(raw);
  }
  for (const item of inbox) {
    for (const raw of item.topics ?? []) bump(raw);
  }

  const evidenceTagCounts = [...tagCounts.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
  );

  return {
    tagPatterns: buildTagPatternsForScope(logs, inbox, today),
    eventEvidenceTags,
    evidenceTagCounts,
  };
}

function topicRowFilterMeta(
  data: ArgusData,
  topic: Entity,
  history: Log[],
  inbox: InboxItem[],
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
) {
  const neighborIds = collectNeighborEntityIds(data, topic, history);
  const nodeCounts = countTopicsAndEventsInScope(data, topic, history);
  const { tagPatterns, evidenceTagCounts } = topicTagRollup(
    data,
    topic,
    history,
    inbox,
    nodeCounts.eventIds,
    inboxItems,
    includePrivate,
    today
  );

  const linkedOrgIds: string[] = [];
  const linkedProjectIds: string[] = [];
  const linkedEntityIds = [...neighborIds];

  for (const id of neighborIds) {
    const entity = data.entities.find((e) => e.id === id && !e.deletedAt);
    if (!entity) continue;
    if (entity.type === "company") linkedOrgIds.push(entity.id);
    else if (entity.type === "project") linkedProjectIds.push(entity.id);
  }

  return {
    // Topic Tags (binder) — prefer topicTags, dual-read linkedTags (ORDER 001).
    aliases: readTagsForRole(data, "topic", { entityId: topic.id }),
    evidenceTags: evidenceTagCounts.map((row) => row.tag),
    patternCount: tagPatterns.length,
    eventCount: nodeCounts.eventCount,
    linkedOrgIds,
    linkedProjectIds,
    linkedEntityIds,
    searchText: entityNotesForDisplay(topic.notes ?? ""),
  };
}

export function buildV2TopicRows(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2TopicRow[] {
  const topics = browseEntitiesByKind(data).topics;

  return topics
    .map((topic) => {
      const { history, inbox, counts, lastIso } = topicEvidenceBundle(
        data,
        topic.id,
        inboxItems,
        includePrivate,
        today
      );
      const filterMeta = topicRowFilterMeta(
        data,
        topic,
        history,
        inbox,
        inboxItems,
        includePrivate,
        today
      );
      return {
        id: topic.id,
        name: topic.name,
        lastActivity: lastIso ? relativeActivityLabel(lastIso, today) : "—",
        lastSort: lastIso ?? "",
        journalCount: counts.journalCount,
        emailCount: counts.emailCount,
        fileCount: counts.fileCount + counts.photoCount,
        evidenceCount: counts.evidenceCount,
        ...filterMeta,
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
  const topics = browseEntitiesByKind(data).topics;

  return topics.map((topic) => {
    const { history, inbox, evidence, counts } = topicEvidenceBundle(
      data,
      topic.id,
      inboxItems,
      includePrivate,
      today
    );
    const linkedEntities = collectLinkedEntities(data, topic, history);
    const neighborIds = collectNeighborEntityIds(data, topic, history);
    const linkCounts = countLinkKinds(data, neighborIds);
    const nodeCounts = countTopicsAndEventsInScope(data, topic, history);
    // Belt-and-suspenders: union scope event ids with any event neighbors + outbound bags.
    const eventIds = new Set(nodeCounts.eventIds);
    for (const id of neighborIds) {
      const entity = data.entities.find((e) => e.id === id);
      if (entity && isEventEntity(entity)) eventIds.add(id);
    }
    for (const id of outboundStructuralIds(topic)) {
      const entity = data.entities.find((e) => e.id === id);
      if (entity && isEventEntity(entity)) eventIds.add(id);
    }
    const linkedEvents = linkedEventRefs(data, eventIds);
    // Link modal: outbound bags ∪ reverse Event binders (one-way Event→Topic stays visible/healable).
    const linkModalIds = linkModalStructuralIds(data, topic);
    const { tagPatterns, eventEvidenceTags, evidenceTagCounts } = topicTagRollup(
      data,
      topic,
      history,
      inbox,
      eventIds,
      inboxItems,
      includePrivate,
      today
    );

    return {
      id: topic.id,
      name: topic.name,
      category: topicCategory(topic, history),
      description: entityNotesForDisplay(topic.notes ?? "") || "No description yet.",
      orgCount: linkCounts.orgCount,
      projectCount: linkCounts.projectCount,
      peopleCount: linkCounts.peopleCount,
      eventCount: [...eventIds].filter((id) =>
        scopeIsEventEntityForMetrics(data.entities.find((e) => e.id === id))
      ).length,
      journalCount: counts.journalCount,
      emailCount: counts.emailCount,
      fileCount: counts.fileCount + counts.photoCount,
      photoCount: counts.photoCount,
      evidenceCount: counts.evidenceCount,
      linkedEntityIds: linkModalIds,
      neighborEntityIds: [...neighborIds],
      linkedEntities,
      linkedEvents,
      aliases: readTagsForRole(data, "topic", { entityId: topic.id }),
      lifecycleStatus: topic.lifecycleStatus,
      hasPrivateEvidence: entityHasPrivateEvidence(data, inboxItems, topic.id),
      deleteRequiresAuthenticator: entityDeleteRequiresAuthenticator(topic),
      evidence,
      tagPatterns,
      eventEvidenceTags,
      evidenceTagCounts,
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

/** Kind-based — same policy as scope-node-counts (do not require type === "other"). */
export function isTopicEntity(entity: Entity): boolean {
  return scopeIsTopicEntity(entity);
}

export function isEventEntity(entity: Entity): boolean {
  return scopeIsEventEntity(entity);
}
