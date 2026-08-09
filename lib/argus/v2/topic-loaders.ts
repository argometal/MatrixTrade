import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { entityHasPrivateEvidence } from "../entity-private-evidence";
import { entityDeleteRequiresAuthenticator } from "../delete-link-check";
import { browseEntitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { relativeActivityLabel, buildTimelineFromLogsAndInbox } from "./timeline-builders";
import {
  buildEntityEvidenceStream,
  countEvidenceStream,
  latestEvidenceIso,
} from "./evidence-stream";
import { buildTagPatternsForScope } from "./tag-patterns";
import {
  collectNeighborEntityIds,
  countTopicsAndEventsInScope,
  isEventEntity as scopeIsEventEntity,
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

function topicEvidenceBundle(
  data: ArgusData,
  topicId: string,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
) {
  const history = getEntityHistory(data, topicId, includePrivate);
  const inbox = getLinkedInboxForEntity(inboxItems, topicId, includePrivate);
  const evidence = buildEntityEvidenceStream(data, topicId, inboxItems, includePrivate, today);
  const counts = countEvidenceStream(evidence);
  const lastIso = latestEvidenceIso(evidence, history[0]?.date || inbox[0]?.receivedAt || "");
  return { history, inbox, evidence, counts, lastIso };
}

function topicRowFilterMeta(
  data: ArgusData,
  topic: Entity,
  history: Log[],
  inbox: InboxItem[],
  today: string
) {
  const evidenceTags = new Set<string>();
  for (const log of history) {
    for (const tag of log.topics) {
      const key = tag.trim().toLowerCase();
      if (key) evidenceTags.add(key);
    }
  }
  for (const item of inbox) {
    for (const tag of item.topics ?? []) {
      const key = tag.trim().toLowerCase();
      if (key) evidenceTags.add(key);
    }
  }

  const tagPatterns = buildTagPatternsForScope(history, inbox, today);
  const neighborIds = collectNeighborEntityIds(data, topic, history);
  const nodeCounts = countTopicsAndEventsInScope(data, topic, history);
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
    aliases: (topic.linkedTags ?? []).map((tag) => tag.trim()).filter(Boolean),
    evidenceTags: [...evidenceTags],
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
      const filterMeta = topicRowFilterMeta(data, topic, history, inbox, today);
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

    return {
      id: topic.id,
      name: topic.name,
      category: topicCategory(topic, history),
      description: entityNotesForDisplay(topic.notes ?? "") || "No description yet.",
      orgCount: linkCounts.orgCount,
      projectCount: linkCounts.projectCount,
      peopleCount: linkCounts.peopleCount,
      eventCount: eventIds.size,
      journalCount: counts.journalCount,
      emailCount: counts.emailCount,
      fileCount: counts.fileCount + counts.photoCount,
      photoCount: counts.photoCount,
      evidenceCount: counts.evidenceCount,
      linkedEntityIds: linkModalIds,
      neighborEntityIds: [...neighborIds],
      linkedEntities,
      linkedEvents,
      aliases: (topic.linkedTags ?? []).map((tag) => tag.trim()).filter(Boolean),
      lifecycleStatus: topic.lifecycleStatus,
      hasPrivateEvidence: entityHasPrivateEvidence(data, inboxItems, topic.id),
      deleteRequiresAuthenticator: entityDeleteRequiresAuthenticator(topic),
      evidence,
      timeline: buildTimelineFromLogsAndInbox(history, inbox),
      tagPatterns: buildTagPatternsForScope(history, inbox, today),
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
