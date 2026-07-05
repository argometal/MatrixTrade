import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { entityNotesForDisplay } from "../reference-types";
import { buildEntityIntelligence } from "../network-intelligence";
import { getUpcomingFollowUps } from "../network";
import { getLinkedInboxForEntity } from "../entity-evidence";
import {
  entitiesByKind,
  getProjectEvidenceScope,
  getProjectHomeCounts,
  organizationEvidenceScope,
  projectsForOrganization,
} from "./hierarchy";
import { getAllProjectScopeInbox } from "../project-evidence";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { filterPrivateInbox } from "../private-access";

import {
  buildTimelineFromLogsAndInbox,
  logToTimelineEntry,
  inboxToTimelineEntry,
  mergeTimelineEntries,
  relativeActivityLabel,
} from "./timeline-builders";

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

function countThisWeek(isoDates: string[], today: string): number {
  const weekAgo = new Date(`${today}T12:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = weekAgo.toISOString().slice(0, 10);
  return isoDates.filter((d) => d.slice(0, 10) >= cutoff).length;
}

export function buildV2HomeStats(data: ArgusData, inboxItems: InboxItem[], today: string) {
  const logs = visibleLogs(data, true);
  const inbox = visibleInbox(inboxItems, true);
  const kinds = entitiesByKind(data);

  const logDates = logs.map((l) => l.date);
  const inboxDates = inbox.map((i) => i.receivedAt);

  return [
    {
      label: "Journal Entries",
      value: String(logs.length),
      delta: `+${countThisWeek(logDates, today)} this week`,
      icon: "journal" as const,
    },
    {
      label: "Emails",
      value: String(inbox.length),
      delta: `+${countThisWeek(inboxDates, today)} this week`,
      icon: "email" as const,
    },
    {
      label: "People",
      value: String(kinds.people.length),
      delta: kinds.people.length ? "Active roster" : "None yet",
      icon: "people" as const,
    },
    {
      label: "Organizations",
      value: String(kinds.organizations.length),
      delta: kinds.organizations.length ? "Browse" : "None yet",
      icon: "org" as const,
    },
    {
      label: "Projects",
      value: String(kinds.projects.length),
      delta: kinds.projects.length ? "Browse" : "None yet",
      icon: "project" as const,
    },
  ];
}

export function buildV2RecentActivity(
  data: ArgusData,
  entities: Entity[],
  includePrivate: boolean,
  today: string,
  limit = 6
) {
  const logs = visibleLogs(data, includePrivate)
    .sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date))
    .slice(0, limit);

  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return logs.map((log) => {
    const linkedNames = log.entityIds
      .map((id) => entityMap.get(id)?.name)
      .filter(Boolean)
      .slice(0, 2);
    const kindLabel = log.kind === "log" ? "Log" : log.kind === "follow_up" ? "Follow-up" : "Note";
    return {
      id: log.id,
      title: log.title || kindLabel,
      meta: [...linkedNames, kindLabel].filter(Boolean).join(" · "),
      time: relativeActivityLabel(log.updatedAt || log.date, today),
      kind: log.kind === "event" && /\bmeeting\b/i.test(log.title) ? ("meeting" as const) : ("journal" as const),
      href: `/argus/logs/${log.id}`,
    };
  });
}

export function buildV2FollowUps(
  data: ArgusData,
  entities: Entity[],
  includePrivate: boolean,
  today: string
) {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const logs = visibleLogs(data, includePrivate).filter((l) => l.followUpDate || l.kind === "follow_up");
  return logs
    .map((log) => {
      const dueIso = (log.followUpDate ?? log.date).slice(0, 10);
      let tone: "danger" | "warning" | "muted" = "muted";
      if (dueIso < today) tone = "danger";
      else if (dueIso <= addDays(today, 3)) tone = "warning";

      const linkedNames = log.entityIds
        .map((id) => entityMap.get(id)?.name)
        .filter(Boolean)
        .slice(0, 2);
      const dueLabel =
        dueIso < today
          ? "Overdue"
          : dueIso === today
            ? "Due today"
            : dueIso <= addDays(today, 3)
              ? "Due soon"
              : "Upcoming";
      const metaParts = [...linkedNames];
      if (dueIso === today) metaParts.push("Today");
      else if (dueIso === addDays(today, 1)) metaParts.push("Tomorrow");
      else if (dueIso > today) {
        metaParts.push(formatShortDate(dueIso));
      }

      return {
        id: log.id,
        title: log.title || "Follow-up",
        meta: metaParts.join(" · ") || dueLabel,
        due: dueLabel,
        dueIso,
        tone,
        href: `/argus/logs/${log.id}`,
      };
    })
    .sort((a, b) => a.dueIso.localeCompare(b.dueIso))
    .slice(0, 5);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildV2HomeTimeline(data: ArgusData, inboxItems: InboxItem[], includePrivate: boolean, limit = 8) {
  const logs = visibleLogs(data, includePrivate).slice(0, limit);
  const inbox = visibleInbox(inboxItems, includePrivate).slice(0, limit);
  return mergeTimelineEntries([
    ...logs.map(logToTimelineEntry),
    ...inbox.map(inboxToTimelineEntry),
  ]).slice(0, limit);
}

export interface V2EntityRow {
  id: string;
  name: string;
  type: string;
  people: number;
  last: string;
  lastSort: string;
  active: boolean;
  href: string;
}

export function buildV2EntityRows(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string,
  tab: "organizations" | "projects" | "people"
): V2EntityRow[] {
  const kinds = entitiesByKind(data);
  const list =
    tab === "organizations" ? kinds.organizations : tab === "projects" ? kinds.projects : kinds.people;

  return list
    .map((entity) => {
      let lastIso: string | undefined;
      let peopleCount = 0;

      if (tab === "organizations") {
        const scope = organizationEvidenceScope(data, inboxItems, entity, includePrivate);
        lastIso =
          scope.logs[0]?.date ||
          scope.inbox[0]?.receivedAt ||
          entity.updatedAt;
        peopleCount = (entity.linkedPersonIds ?? []).length + (entity.linkedEntityIds ?? []).filter((id) => {
          const p = data.entities.find((e) => e.id === id);
          return p?.type === "person";
        }).length;
      } else if (tab === "projects") {
        const counts = getProjectHomeCounts(entity, data.logs, inboxItems, includePrivate);
        peopleCount = (entity.linkedPersonIds ?? []).length;
        lastIso = entity.updatedAt;
        void counts;
      } else {
        const logs = visibleLogs(data, includePrivate).filter((l) => l.entityIds.includes(entity.id));
        const inbox = getLinkedInboxForEntity(inboxItems, entity.id, includePrivate);
        lastIso = logs[0]?.date || inbox[0]?.receivedAt || entity.updatedAt;
      }

      const href =
        tab === "organizations"
          ? `/argus/v2/organizations/${entity.id}`
          : tab === "projects"
            ? `/argus/v2/projects/${entity.id}`
            : `/argus/network/${entity.id}`;

      return {
        id: entity.id,
        name: entity.name,
        type:
          tab === "organizations"
            ? entityNotesForDisplay(entity.notes) || "Organization"
            : tab === "projects"
              ? "Project"
              : entity.alias || "Person",
        people: peopleCount,
        last: relativeActivityLabel(lastIso, today),
        lastSort: lastIso ?? "",
        active: lastIso ? relativeActivityLabel(lastIso, today) === "Today" : false,
        href,
      };
    })
    .sort((a, b) => b.lastSort.localeCompare(a.lastSort))
    .slice(0, 8);
}

export function buildV2TagCloud(data: ArgusData, includePrivate: boolean, limit = 12) {
  const counts = new Map<string, number>();
  for (const log of visibleLogs(data, includePrivate)) {
    for (const t of log.topics) {
      const key = t.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const colors = ["violet", "emerald", "amber", "sky", "orange"] as const;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count], i) => ({
      name,
      count,
      color: colors[i % colors.length],
    }));
}

export function buildV2NavCounts(data: ArgusData, inboxItems: InboxItem[], includePrivate: boolean) {
  const kinds = entitiesByKind(data);
  const inbox = visibleInbox(inboxItems, includePrivate).filter(
    (i) => i.status === "pending" || i.status === "linked"
  );
  const followUps = getUpcomingFollowUps(data, includePrivate, 100).length;
  return {
    inbox: inbox.length,
    organizations: kinds.organizations.length,
    projects: kinds.projects.length,
    people: kinds.people.length,
    topics: kinds.topics.length,
    events: kinds.events.length,
    network: kinds.people.length + kinds.organizations.length,
    followUps,
    reminders: followUps,
  };
}

export type V2NavCounts = ReturnType<typeof buildV2NavCounts>;

export function loadOrganizationPageData(
  data: ArgusData,
  inboxItems: InboxItem[],
  org: Entity,
  includePrivate: boolean,
  today: string
) {
  const scope = organizationEvidenceScope(data, inboxItems, org, includePrivate);
  const timeline = buildTimelineFromLogsAndInbox(scope.logs, scope.inbox);
  const intel = buildEntityIntelligence(data, org, includePrivate, today);
  const linkedPersonIds = [
    ...new Set([...(org.linkedPersonIds ?? []), ...(org.linkedEntityIds ?? [])]),
  ];
  const linkedPeople = linkedPersonIds
    .map((id) => data.entities.find((e) => e.id === id && e.type === "person"))
    .filter((e): e is Entity => Boolean(e));
  const orgProjects = projectsForOrganization(data, org);

  const firstLog = scope.logs[scope.logs.length - 1];
  const firstInbox = scope.inbox[scope.inbox.length - 1];
  const firstContact = [firstLog?.date, firstInbox?.receivedAt].filter(Boolean).sort()[0];

  const monthPrefix = today.slice(0, 7);
  const journalThisMonth = scope.logs.filter((l) => l.date.slice(0, 7) === monthPrefix).length;
  const emailsThisMonth = scope.inbox.filter((i) => i.receivedAt.slice(0, 7) === monthPrefix).length;

  const sparkline = buildMonthlyActivitySparkline(scope.logs, scope.inbox, 12);
  const relationshipMetrics = buildRelationshipMetrics(intel, org.strategicValue ?? 3);

  const recentProjects = orgProjects.slice(0, 3).map((project) => ({
    id: project.id,
    name: project.name,
    status: projectStatus(project, today),
    year: projectYear(project),
  }));

  return {
    scope,
    timeline,
    intel,
    linkedPeople,
    orgProjects,
    recentProjects,
    sparkline,
    relationshipMetrics,
    stats: {
      journalEntries: scope.logCount,
      journalDelta: journalThisMonth > 0 ? `+${journalThisMonth} this month` : "No change",
      emails: scope.emailCount,
      emailsDelta: emailsThisMonth > 0 ? `+${emailsThisMonth} this month` : "No change",
      people: linkedPeople.length,
      projects: orgProjects.length,
      firstContact: firstContact ? formatDisplayDate(firstContact) : "—",
      lastActivity: relativeActivityLabel(
        scope.logs[0]?.date || scope.inbox[0]?.receivedAt || org.updatedAt,
        today
      ),
      isActiveToday:
        relativeActivityLabel(
          scope.logs[0]?.date || scope.inbox[0]?.receivedAt || org.updatedAt,
          today
        ) === "Today",
    },
  };
}

function projectStatus(project: Entity, today: string): "Completed" | "In Progress" | "Planning" {
  const end = project.endDate?.slice(0, 10);
  const start = project.startDate?.slice(0, 10);
  if (end && end < today) return "Completed";
  if (start && start <= today) return "In Progress";
  return "Planning";
}

function projectYear(project: Entity): string {
  const d = project.endDate || project.startDate || project.createdAt;
  return d ? d.slice(0, 4) : "—";
}

function buildMonthlyActivitySparkline(logs: Log[], inbox: InboxItem[], months: number): number[] {
  const counts: number[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = d.toISOString().slice(0, 7);
    const c =
      logs.filter((l) => l.date.slice(0, 7) === prefix).length +
      inbox.filter((item) => item.receivedAt.slice(0, 7) === prefix).length;
    counts.push(c);
  }
  return counts;
}

function buildRelationshipMetrics(
  intel: ReturnType<typeof buildEntityIntelligence>,
  strategicValue: number
) {
  const high = (n: number) => (n >= 4 ? "High" : n >= 3 ? "Strong" : "Moderate");
  return [
    { label: "Engagement", value: intel.relationshipHealth === "active" ? "High" : "Moderate" },
    { label: "Collaboration", value: intel.outcomeScore >= 20 ? "Strong" : "Moderate" },
    { label: "Trust", value: high(strategicValue) },
    { label: "Future Potential", value: strategicValue >= 4 ? "High" : "Moderate" },
  ];
}

export function loadProjectPageData(
  data: ArgusData,
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate: boolean,
  today: string
) {
  const scope = getProjectEvidenceScope(data, inboxItems, project, includePrivate);
  const allInbox = getAllProjectScopeInbox(inboxItems, project, includePrivate);
  const allLogs = [...scope.directLogs, ...scope.viaContactLogs];
  let timeline = buildTimelineFromLogsAndInbox(allLogs, allInbox);
  timeline = enrichTimelineMeta(timeline, allLogs, allInbox, data.entities);

  const linkedPeople = (project.linkedPersonIds ?? [])
    .map((id) => data.entities.find((e) => e.id === id))
    .filter((e): e is Entity => Boolean(e));

  const peopleWithRoles = linkedPeople.map((person, index) => ({
    id: person.id,
    name: person.name,
    initials: initialsFromName(person.name),
    role: person.alias?.trim() || (index === 0 ? "Lead" : index === 1 ? "Support" : "Member"),
  }));

  const durationDays =
    project.startDate && project.endDate
      ? Math.max(
          1,
          Math.floor(
            (Date.parse(project.endDate.slice(0, 10)) - Date.parse(project.startDate.slice(0, 10))) /
              86400000
          )
        )
      : undefined;

  const org = (project.linkedEntityIds ?? [])
    .map((id) => data.entities.find((e) => e.id === id && e.type === "company"))
    .find(Boolean);

  const topicNames = [
    ...(project.linkedTopicIds ?? [])
      .map((id) => data.entities.find((e) => e.id === id))
      .filter((e): e is Entity => Boolean(e))
      .map((e) => e.name),
    ...(project.linkedTags ?? []),
  ].filter(Boolean);

  const linkedEventsCount = (project.linkedEventIds ?? []).length;
  const attachmentCount = allLogs.reduce((n, l) => n + l.attachmentIds.length, 0);
  const status = projectStatus(project, today);
  const dateRangeLabel = formatProjectDateRange(project);

  const directCount = scope.directLogs.length + scope.directInbox.length;
  const viaCount = scope.viaContactLogs.length + scope.viaContactInbox.length;

  return {
    scope,
    timeline,
    linkedPeople,
    peopleWithRoles,
    durationDays,
    org,
    status,
    dateRangeLabel,
    linkedTopics: [...new Set(topicNames)],
    linkedEventsCount,
    keyMetrics: buildProjectKeyMetrics(scope, attachmentCount, directCount),
    stats: {
      people: linkedPeople.length,
      journalEntries: scope.logCount,
      emails: scope.emailCount,
      files: attachmentCount,
    },
  };
}

function enrichTimelineMeta(
  entries: ReturnType<typeof buildTimelineFromLogsAndInbox>,
  logs: Log[],
  inbox: InboxItem[],
  entities: Entity[]
) {
  const logMap = new Map(logs.map((l) => [l.id, l]));
  const inboxMap = new Map(inbox.map((i) => [i.id, i]));
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return entries.map((entry) => {
    const log = logMap.get(entry.id);
    if (log) {
      const linked = log.entityIds.map((id) => entityMap.get(id)?.name).filter(Boolean);
      return { ...entry, author: linked[0] ?? entry.author };
    }
    const mail = inboxMap.get(entry.id);
    if (mail?.from) {
      return { ...entry, author: mail.from.replace(/<.*>/, "").trim() };
    }
    return entry;
  });
}

function buildProjectKeyMetrics(
  scope: ReturnType<typeof getProjectEvidenceScope>,
  attachments: number,
  directCount: number
) {
  return [
    { label: "Journal entries", value: String(scope.logCount) },
    { label: "Emails", value: String(scope.emailCount) },
    { label: "Direct evidence", value: String(directCount) },
    { label: "Attachments", value: String(attachments), highlight: attachments > 0 },
  ];
}

function formatProjectDateRange(project: Entity): string | undefined {
  if (!project.startDate) return undefined;
  const start = formatDisplayDate(project.startDate);
  const end = project.endDate ? formatDisplayDate(project.endDate) : "open";
  return `${start} – ${end}`;
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDisplayDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
