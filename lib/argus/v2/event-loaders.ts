import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { resolveEntityLifecycleStatus } from "../entity-lifecycle";
import { entityNotesForDisplay } from "../reference-types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import { entityHasPrivateEvidence } from "../entity-private-evidence";
import { entityDeleteRequiresAuthenticator } from "../delete-link-check";
import { browseEntitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { relativeActivityLabel } from "./timeline-builders";
import { countLinkKinds, linkedOrgRefs, linkedPersonRefs, linkedProjectRefs, linkedTopicNames, linkedTopicRefs } from "./entity-link-counts";
import {
  collectNeighborEntityIds,
  countTopicsAndEventsInScope,
  linkModalStructuralIds,
} from "./scope-node-counts";
import { buildTagPatternsForScope } from "./tag-patterns";
import { collectEvidenceTagsForTopicIds, collectEvidenceTagCountsForTopicIds } from "./topic-loaders";
import { readTagsForRole, tagKey, normalizeTagDisplay } from "../tag-ontology";
import type {
  V2EventDetail,
  V2EventEmail,
  V2EventEntry,
  V2EventEvidenceItem,
  V2EventInboxOption,
  V2EventRow,
  V2EventTab,
  V2EventTriageTab,
  V2EventWhenTab,
} from "./event-browse-utils";
import { parseEventRecord } from "./event-record";
import { buildEntityEvidenceStream } from "./evidence-stream";
export type {
  V2EventDetail,
  V2EventEmail,
  V2EventEntry,
  V2EventEvidenceItem,
  V2EventInboxOption,
  V2EventRow,
  V2EventTab,
  V2EventTriageTab,
  V2EventWhenTab,
} from "./event-browse-utils";
export {
  V2_EVENT_PAGE_SIZE,
  buildV2EventTabCounts,
  buildV2EventTriageCounts,
  buildV2EventWhenCounts,
  eventRowIsOrphan,
  filterV2EventRows,
  groupV2EventRows,
  parseV2EventTab,
  parseV2EventTriageTab,
  parseV2EventWhenTab,
  resolveV2EventBrowseParams,
  sortV2EventRows,
} from "./event-browse-utils";

function visibleLogs(data: ArgusData, includePrivate: boolean): Log[] {
  const logs = data.logs.filter((l) => !l.deletedAt);
  return includePrivate ? logs : logs.filter((l) => !l.private);
}

function formatEventDate(iso: string): { dateLabel: string; timeLabel: string; sortDate: string } {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const dateLabel = d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase()
    .replace(".", "");
  const timeLabel = iso.length > 10 ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "All day";
  return { dateLabel, timeLabel, sortDate: iso.slice(0, 10) };
}

function extractMeetingUrl(notes: string): string | undefined {
  const match = notes.match(/https?:\/\/[^\s)]+/i);
  return match?.[0];
}

function eventTypeLabel(event: Entity): string {
  if (/milestone|kickoff|handover/i.test(event.name)) return "Project milestone";
  if (/call|sync|meeting/i.test(event.name)) return "Meeting";
  return "Event";
}

function linkedProject(data: ArgusData, event: Entity) {
  const projectId = (event.linkedEntityIds ?? []).find((id) => data.entities.find((e) => e.id === id)?.type === "project");
  if (projectId) {
    const project = data.entities.find((e) => e.id === projectId);
    if (project) return { name: project.name, href: `/argus/v2/projects/${project.id}` };
  }
  for (const log of visibleLogs(data, true)) {
    if (!log.entityIds.includes(event.id)) continue;
    const project = log.entityIds
      .map((id) => data.entities.find((e) => e.id === id))
      .find((e) => e?.type === "project");
    if (project) return { name: project.name, href: `/argus/v2/projects/${project.id}` };
  }
  return undefined;
}

/** People from the same neighbor set as metrics (outbound + reverse + project bridge + co-mention). */
function attendeePeople(data: ArgusData, event: Entity, logs: Log[]): string[] {
  const people = new Set<string>();
  for (const id of collectNeighborEntityIds(data, event, logs)) {
    const p = data.entities.find((e) => e.id === id && !e.deletedAt && e.type === "person");
    if (p) people.add(p.name);
  }
  return [...people].sort((a, b) => a.localeCompare(b));
}

function attendeeInitials(names: string[]): string[] {
  return names
    .slice(0, 5)
    .map((name) =>
      name
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    );
}

export function buildV2EventInboxOptions(
  inboxItems: InboxItem[],
  eventId: string,
  includePrivate: boolean,
  today: string
): V2EventInboxOption[] {
  const visible = includePrivate
    ? inboxItems.filter(isActiveRecord)
    : inboxItems.filter(isActiveRecord).filter((i) => !i.private);

  return visible
    .filter((item) => item.status !== "archived")
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 40)
    .map((item) => ({
      id: item.id,
      subject: item.subject || "(No subject)",
      from: item.from?.replace(/<.*>/, "").trim() || "Unknown",
      date: relativeActivityLabel(item.receivedAt, today),
      alreadyLinked: (item.linkedEntityIds ?? []).includes(eventId),
    }));
}

export function buildV2EventRows(data: ArgusData, includePrivate: boolean, today: string): V2EventRow[] {
  const events = browseEntitiesByKind(data).events;

  return events
    .map((event) => {
      const eventDate = event.startDate || event.endDate || event.createdAt.slice(0, 10);
      const endDate = event.endDate || eventDate;
      const isUpcoming = endDate >= today;
      const { dateLabel, timeLabel, sortDate } = formatEventDate(eventDate);
      const notes = entityNotesForDisplay(event.notes ?? "");
      const project = linkedProject(data, event);
      const history = getEntityHistory(data, event.id, includePrivate);
      const people = attendeePeople(data, event, history);
      const scopeLinkIds = [...collectNeighborEntityIds(data, event, history)];
      const lifecycleStatus = resolveEntityLifecycleStatus(event, today);
      const isOrphan = lifecycleStatus !== "archived" && scopeLinkIds.length === 0;

      return {
        id: event.id,
        name: event.name,
        dateLabel,
        timeLabel,
        meetingUrl: extractMeetingUrl(notes),
        projectName: project?.name,
        projectHref: project?.href,
        typeLabel: eventTypeLabel(event),
        attendeeInitials: attendeeInitials(people),
        isUpcoming,
        sortDate,
        scopeLinkIds,
        lifecycleStatus,
        isOrphan,
      };
    })
    // Latest first — Upcoming filter re-sorts soonest-first in filterV2EventRows.
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.name.localeCompare(b.name));
}

export function buildV2EventDetails(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2EventDetail[] {
  const events = browseEntitiesByKind(data).events;
  const entityMap = new Map(data.entities.filter(isActiveRecord).map((e) => [e.id, e]));

  return events.map((event) => {
    const eventDate = event.startDate || event.endDate || event.createdAt.slice(0, 10);
    const rawNotes = event.notes ?? "";
    const { record: legacyRecord } = parseEventRecord(rawNotes);
    const displayNotes = entityNotesForDisplay(rawNotes);
    const notes = legacyRecord || displayNotes;
    const project = linkedProject(data, event);
    const history = getEntityHistory(data, event.id, includePrivate);
    const people = attendeePeople(data, event, history);
    const initials = attendeeInitials(people);
    const inbox = getLinkedInboxForEntity(inboxItems, event.id, includePrivate);

    const topicTags = [...new Set(history.flatMap((l) => l.topics).filter(Boolean))].slice(0, 6);
    const relatedIds = collectNeighborEntityIds(data, event, history);
    const linkCounts = countLinkKinds(data, relatedIds);
    const nodeCounts = countTopicsAndEventsInScope(data, event, history);
    const linkedTopicNamesList = linkedTopicNames(data, nodeCounts.topicIds);
    const linkedTopics = linkedTopicRefs(data, nodeCounts.topicIds);
    const topicContextTags = collectEvidenceTagsForTopicIds(
      data,
      inboxItems,
      linkedTopics.map((topic) => topic.id),
      includePrivate,
      today
    );

    const linkedEntries = history.slice(0, 5).map((log) => ({
      id: log.id,
      title: log.title || "Journal entry",
      kind: log.kind === "log" ? "Log" : log.kind === "follow_up" ? "Follow-up" : "Note",
      // Deprecated phone editor — Chronicle reads notes in place.
      href: "",
    }));

    const relatedEmails = inbox.slice(0, 8).map((item) => ({
      id: item.id,
      subject: item.subject || "(No subject)",
      from: item.from?.replace(/<.*>/, "").trim() || "Unknown",
      date: relativeActivityLabel(item.receivedAt, today),
      href: `/argus/v2/inbox?selected=${item.id}`,
    }));

    const evidence = buildEntityEvidenceStream(data, event.id, inboxItems, includePrivate, today) as V2EventEvidenceItem[];
    const linkedProjects = linkedProjectRefs(data, relatedIds);

    const eventEvidenceCounts = countTagOccurrences([
      ...history.flatMap((log) => log.topics ?? []),
      ...inbox.flatMap((item) => item.topics ?? []),
    ]);
    const topicContextCounted = collectEvidenceTagCountsForTopicIds(
      data,
      inboxItems,
      linkedTopics.map((t) => t.id),
      includePrivate,
      today
    );
    const projectBranchCounts = accumulateProjectNeighborhoodTags(
      data,
      inboxItems,
      linkedProjects.map((p) => p.id),
      includePrivate
    );

    const branchTagGroups: V2EventDetail["branchTagGroups"] = [
      {
        id: "event",
        label: "Notes on this Event",
        contextName: "evidence",
        tags: eventEvidenceCounts,
      },
    ];
    if (linkedTopics.length > 0) {
      branchTagGroups.push({
        id: "topic",
        label: "Topic",
        contextName:
          linkedTopics.length === 1 ? linkedTopics[0].name : `${linkedTopics.length} linked`,
        href: linkedTopics.length === 1 ? linkedTopics[0].href : undefined,
        tags: topicContextCounted,
      });
    }
    if (linkedProjects.length > 0) {
      branchTagGroups.push({
        id: "project",
        label: "Project",
        contextName:
          linkedProjects.length === 1
            ? linkedProjects[0].name
            : `${linkedProjects.length} linked`,
        href: linkedProjects.length === 1 ? linkedProjects[0].href : undefined,
        tags: projectBranchCounts,
      });
    }

    const dateTimeLabel = `${formatEventDate(eventDate).dateLabel} · ${formatEventDate(eventDate).timeLabel}`;

    return {
      id: event.id,
      name: event.name,
      dateTimeLabel,
      eventDate,
      meetingUrl: extractMeetingUrl(displayNotes),
      projectName: project?.name,
      projectHref: project?.href,
      topicTags,
      linkedTopicNames: linkedTopicNamesList,
      linkedTopics,
      topicContextTags,
      description:
        history.length > 0
          ? `${history.length} chronicle entr${history.length === 1 ? "y" : "ies"}`
          : legacyRecord
            ? "Legacy note pending migration"
            : "No chronicle entries yet.",
      linkedTags: (event.linkedTags ?? []).map((tag) => tag.trim()).filter(Boolean),
      eventTags: readTagsForRole(data, "event", { entityId: event.id }),
      branchTagGroups,
      chronicleCount: history.length,
      attendeeInitials: initials,
      attendeeNames: people,
      attendeeCount: people.length,
      orgCount: linkCounts.orgCount,
      projectCount: linkCounts.projectCount,
      peopleCount: linkCounts.peopleCount,
      topicCount: nodeCounts.topicCount,
      linkedOrgs: linkedOrgRefs(data, relatedIds),
      linkedProjects,
      linkedPeople: linkedPersonRefs(data, relatedIds),
      linkedEntityIds: linkModalStructuralIds(data, event),
      linkedEntries,
      relatedEmails,
      evidence,
      lifecycleStatus: event.lifecycleStatus,
      hasPrivateEvidence: entityHasPrivateEvidence(data, inboxItems, event.id),
      deleteRequiresAuthenticator: entityDeleteRequiresAuthenticator(event),
      tagPatterns: buildTagPatternsForScope(history, inbox, today),
    };
  });
}

function countTagOccurrences(rawTags: string[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const raw of rawTags) {
    const tag = normalizeTagDisplay(raw);
    if (!tag) continue;
    const key = tagKey(tag);
    const row = counts.get(key) ?? { tag, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function accumulateProjectNeighborhoodTags(
  data: ArgusData,
  inboxItems: InboxItem[],
  projectIds: string[],
  includePrivate: boolean
): Array<{ tag: string; count: number }> {
  if (projectIds.length === 0) return [];
  const raw: string[] = [];
  for (const projectId of projectIds) {
    for (const tag of readTagsForRole(data, "project", { entityId: projectId })) {
      raw.push(tag);
    }
    const history = getEntityHistory(data, projectId, includePrivate);
    for (const log of history) raw.push(...(log.topics ?? []));
    const linkedInbox = getLinkedInboxForEntity(inboxItems, projectId, includePrivate);
    for (const item of linkedInbox) raw.push(...(item.topics ?? []));
  }
  return countTagOccurrences(raw);
}
