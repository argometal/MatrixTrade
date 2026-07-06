import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { entityNotesForDisplay } from "../reference-types";
import { getEntityHistory } from "../network";
import { getLinkedInboxForEntity } from "../entity-evidence";
import { entitiesByKind } from "./hierarchy";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { relativeActivityLabel } from "./timeline-builders";
import {
  collectRelatedEntityIds,
  countLinkKinds,
  linkedTopicNames,
} from "./entity-link-counts";
import type {
  V2EventDetail,
  V2EventEmail,
  V2EventEntry,
  V2EventRow,
  V2EventTab,
} from "./event-browse-utils";
export type {
  V2EventDetail,
  V2EventEmail,
  V2EventEntry,
  V2EventRow,
  V2EventTab,
} from "./event-browse-utils";
export {
  buildV2EventTabCounts,
  filterV2EventRows,
  groupV2EventRows,
  parseV2EventTab,
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

function attendeeInitials(data: ArgusData, event: Entity, logs: Log[]): string[] {
  const people = new Set<string>();
  for (const id of event.linkedPersonIds ?? []) {
    const p = data.entities.find((e) => e.id === id && e.type === "person");
    if (p) people.add(p.name);
  }
  for (const id of event.linkedEntityIds ?? []) {
    const p = data.entities.find((e) => e.id === id && e.type === "person");
    if (p) people.add(p.name);
  }
  for (const log of logs) {
    if (!log.entityIds.includes(event.id)) continue;
    for (const id of log.entityIds) {
      const p = data.entities.find((e) => e.id === id && e.type === "person");
      if (p) people.add(p.name);
    }
  }
  return [...people]
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

export function buildV2EventRows(data: ArgusData, includePrivate: boolean, today: string): V2EventRow[] {
  const events = entitiesByKind(data).events;

  return events
    .map((event) => {
      const eventDate = event.startDate || event.endDate || event.createdAt.slice(0, 10);
      const endDate = event.endDate || eventDate;
      const isUpcoming = endDate >= today;
      const { dateLabel, timeLabel, sortDate } = formatEventDate(eventDate);
      const notes = entityNotesForDisplay(event.notes ?? "");
      const project = linkedProject(data, event);
      const history = getEntityHistory(data, event.id, includePrivate);

      return {
        id: event.id,
        name: event.name,
        dateLabel,
        timeLabel,
        meetingUrl: extractMeetingUrl(notes),
        projectName: project?.name,
        projectHref: project?.href,
        typeLabel: eventTypeLabel(event),
        attendeeInitials: attendeeInitials(data, event, history),
        isUpcoming,
        sortDate,
      };
    })
    .sort((a, b) => {
      if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
      return a.isUpcoming
        ? a.sortDate.localeCompare(b.sortDate)
        : b.sortDate.localeCompare(a.sortDate);
    });
}

export function buildV2EventDetails(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2EventDetail[] {
  const events = entitiesByKind(data).events;
  const entityMap = new Map(data.entities.filter(isActiveRecord).map((e) => [e.id, e]));

  return events.map((event) => {
    const eventDate = event.startDate || event.endDate || event.createdAt.slice(0, 10);
    const notes = entityNotesForDisplay(event.notes ?? "");
    const project = linkedProject(data, event);
    const history = getEntityHistory(data, event.id, includePrivate);
    const initials = attendeeInitials(data, event, history);
    const inbox = getLinkedInboxForEntity(inboxItems, event.id, includePrivate);

    const topicTags = [...new Set(history.flatMap((l) => l.topics).filter(Boolean))].slice(0, 6);
    const relatedIds = collectRelatedEntityIds(event, history);
    const linkCounts = countLinkKinds(data, relatedIds);
    const linkedTopicNamesList = linkedTopicNames(data, relatedIds, topicTags);

    const linkedEntries = history.slice(0, 5).map((log) => ({
      id: log.id,
      title: log.title || "Journal entry",
      kind: log.kind === "log" ? "Log" : log.kind === "follow_up" ? "Follow-up" : "Note",
      href: `/argus/logs/${log.id}`,
    }));

    const relatedEmails = inbox.slice(0, 3).map((item) => ({
      id: item.id,
      subject: item.subject || "(No subject)",
      from: item.from?.replace(/<.*>/, "").trim() || "Unknown",
      date: relativeActivityLabel(item.receivedAt, today),
      href: `/argus/v2/inbox?selected=${item.id}`,
    }));

    const dateTimeLabel = `${formatEventDate(eventDate).dateLabel} · ${formatEventDate(eventDate).timeLabel}`;

    return {
      id: event.id,
      name: event.name,
      dateTimeLabel,
      meetingUrl: extractMeetingUrl(notes),
      projectName: project?.name,
      projectHref: project?.href,
      topicTags,
      linkedTopicNames: linkedTopicNamesList,
      description: notes || "No description yet.",
      attendeeInitials: initials,
      attendeeCount: Math.max(initials.length, linkCounts.peopleCount),
      orgCount: linkCounts.orgCount,
      projectCount: linkCounts.projectCount,
      peopleCount: linkCounts.peopleCount,
      topicCount: linkCounts.topicCount,
      linkedEntityIds: event.linkedEntityIds ?? [],
      linkedEntries,
      relatedEmails,
    };
  });
}
