import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { TAG_CLOUD_DISPLAY_LIMIT } from "../tag-limits";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { buildEntityIntelligence } from "../network-intelligence";
import { getNeedsClassificationLogs } from "../journal-helpers";
import { buildTagPatternsForScope } from "./tag-patterns";
import { effectiveInboxStatus } from "./inbox-loaders";
import { getLinkedInboxForEntity } from "../inbox-entity-links";
import {
  entitiesByKind,
  getAllProjectScopeInbox,
  getProjectEvidenceScope,
  getProjectHomeCounts,
  organizationEvidenceScope,
  projectsForOrganization,
} from "./hierarchy";
import type { ProjectScopeOptions } from "../project-evidence-scope";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { filterPrivateInbox } from "../private-access";
import { collectProjectLinkIds, collectRelatedEntityIds, countLinkKinds, linkedTopicNames } from "./entity-link-counts";
import { findTopicEntityIdForTag, intelligenceTagHref } from "./intelligence-nav";

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

export type V2HomeStatIcon = "journal" | "email" | "people" | "org" | "project";

export interface V2HomeStat {
  label: string;
  value: string;
  delta: string;
  icon: V2HomeStatIcon;
  href: string;
}

export function buildV2HomeStats(data: ArgusData, inboxItems: InboxItem[], today: string): V2HomeStat[] {
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
      icon: "journal",
      href: "/argus/v2#stats",
    },
    {
      label: "Emails",
      value: String(inbox.length),
      delta: `+${countThisWeek(inboxDates, today)} this week`,
      icon: "email",
      href: "/argus/v2/inbox",
    },
    {
      label: "People",
      value: String(kinds.people.length),
      delta: kinds.people.length ? "Active roster" : "None yet",
      icon: "people",
      href: "/argus/v2/browse/network",
    },
    {
      label: "Organizations",
      value: String(kinds.organizations.length),
      delta: kinds.organizations.length ? "Browse" : "None yet",
      icon: "org",
      href: "/argus/v2/browse/organizations",
    },
    {
      label: "Projects",
      value: String(kinds.projects.length),
      delta: kinds.projects.length ? "Browse" : "None yet",
      icon: "project",
      href: "/argus/v2/browse/projects",
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
  const logs = visibleLogs(data, includePrivate);
  const inbox = visibleInbox(inboxItems, includePrivate);
  const entityMap = new Map(data.entities.filter((e) => !e.deletedAt).map((e) => [e.id, e]));

  const enriched = mergeTimelineEntries([
    ...logs.map((log) => {
      const entry = logToTimelineEntry(log);
      const linked = log.entityIds.map((id) => entityMap.get(id)).filter((e): e is Entity => Boolean(e));
      const topic = linked.find(
        (entity) => entity.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "topic"
      );
      const href =
        topic && linked.length === 1
          ? `/argus/v2/browse/topics?selected=${topic.id}`
          : `/argus/logs/${log.id}`;

      const kindLabel =
        entry.kind === "email"
          ? "Email"
          : entry.journalSubtype === "note"
            ? "Note"
            : entry.journalSubtype === "log"
              ? "Log"
              : entry.kind === "meeting"
                ? "Meeting"
                : "Journal";

      const metaParts = [
        kindLabel,
        ...linked.slice(0, 2).map((entity) => entity.name),
        ...(log.topics.slice(0, 2).map((tag) => `#${tag}`) ?? []),
      ].filter(Boolean);

      return {
        ...entry,
        href,
        meta: metaParts.join(" · "),
        author: linked[0]?.name ?? entry.author,
      };
    }),
    ...inbox.map((item) => {
      const entry = inboxToTimelineEntry(item);
      const from = item.from?.replace(/<.*>/, "").trim();
      const metaParts = [item.subject?.trim(), from].filter(Boolean);
      return {
        ...entry,
        href: `/argus/v2/inbox?selected=${item.id}`,
        meta: metaParts.join(" · ") || "Email",
        author: from ?? entry.author,
      };
    }),
  ]).slice(0, limit);

  return enriched;
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

export type V2EntityTab = "organizations" | "projects" | "people" | "topics" | "events";

export const V2_ENTITY_TABS: V2EntityTab[] = [
  "organizations",
  "projects",
  "people",
  "topics",
  "events",
];

export function parseV2EntityTab(value: string | undefined): V2EntityTab {
  if (value && V2_ENTITY_TABS.includes(value as V2EntityTab)) {
    return value as V2EntityTab;
  }
  return "organizations";
}

export function buildV2EntityRows(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string,
  tab: V2EntityTab,
  limit = 8
): V2EntityRow[] {
  const kinds = entitiesByKind(data);
  const list =
    tab === "organizations"
      ? kinds.organizations
      : tab === "projects"
        ? kinds.projects
        : tab === "people"
          ? kinds.people
          : tab === "topics"
            ? kinds.topics
            : kinds.events;

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
        if (tab === "events") {
          peopleCount = (entity.linkedEntityIds ?? []).length;
        }
      }

      const href =
        tab === "organizations"
          ? `/argus/v2/organizations/${entity.id}`
          : tab === "projects"
            ? `/argus/v2/projects/${entity.id}`
            : tab === "topics"
              ? `/argus/v2/browse/topics?selected=${entity.id}`
              : tab === "events"
                ? `/argus/v2/browse/events?selected=${entity.id}`
                : `/argus/v2/network/${entity.id}`;

      const typeLabel =
        tab === "organizations"
          ? entityNotesForDisplay(entity.notes) || "Organization"
          : tab === "projects"
            ? "Project"
            : tab === "people"
              ? entity.alias || "Person"
              : tab === "topics"
                ? "Topic"
                : "Event";

      return {
        id: entity.id,
        name: entity.name,
        type: typeLabel,
        people: peopleCount,
        last: relativeActivityLabel(lastIso, today),
        lastSort: lastIso ?? "",
        active: lastIso ? relativeActivityLabel(lastIso, today) === "Today" : false,
        href,
      };
    })
    .sort((a, b) => b.lastSort.localeCompare(a.lastSort))
    .slice(0, limit);
}

export function buildV2TagCloud(data: ArgusData, inboxItems: InboxItem[], includePrivate: boolean, limit = TAG_CLOUD_DISPLAY_LIMIT) {
  const counts = new Map<string, number>();
  for (const log of visibleLogs(data, includePrivate)) {
    for (const t of log.topics) {
      const key = t.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  for (const item of visibleInbox(inboxItems, includePrivate)) {
    for (const t of item.topics ?? []) {
      const key = t.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (sorted.length === 0) return [];

  const max = sorted[0][1];
  const min = sorted[sorted.length - 1][1];
  const colors = ["violet", "emerald", "amber", "sky", "orange"] as const;

  const topics = entitiesByKind(data).topics;

  return sorted.map(([name, count], i) => {
    const topicId = findTopicEntityIdForTag(topics, name);
    return {
      name,
      count,
      color: colors[i % colors.length],
      weight: max === min ? 1 : (count - min) / (max - min),
      href: intelligenceTagHref(name, topicId),
    };
  });
}

/** Action-only nav signals — never entity totals. */
export type V2NavCounts = {
  /** Unprocessed inbox evidence (pending + linked awaiting triage). */
  inbox: number;
  /** Follow-ups due today or overdue — relationship attention. */
  network: number;
  /** Evidence rows still needing classification. */
  topics: number;
};

function inboxNeedsAttention(item: InboxItem): boolean {
  if (item.convertedLogId) return false;
  const status = effectiveInboxStatus(item);
  return status === "pending" || status === "linked";
}

export function buildV2NavCounts(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean
): V2NavCounts {
  const today = new Date().toISOString().slice(0, 10);
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  const inbox = visibleInbox(inboxItems, includePrivate).filter(inboxNeedsAttention);

  const network = visibleLogs.filter((log) => {
    if (!log.followUpDate && log.kind !== "follow_up") return false;
    const dueIso = (log.followUpDate ?? log.date).slice(0, 10);
    if (dueIso > addDays(today, 3)) return false;
    if (dueIso < addDays(today, -30)) return false;
    return true;
  }).length;

  const topics = getNeedsClassificationLogs(visibleLogs).length;

  return { inbox: inbox.length, network, topics };
}

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
  const emailsThisMonth = scope.inbox.filter((i) => i.receivedAt.slice(0, 7) === monthPrefix).length;

  const sparkline = buildMonthlyActivitySparkline(scope.logs, scope.inbox, 12);
  const relationshipMetrics = buildRelationshipMetrics(intel, org.strategicValue ?? 3);
  const sv = org.strategicValue ?? 3;
  const relationshipScore = Math.max(1, Math.min(5, sv + 0.3)).toFixed(1);
  const relationshipLabel = relationshipDisplayLabel(sv, intel.relationshipHealth);
  const chartEndYear = Number(today.slice(0, 4));
  const chartStartYear = chartEndYear - 1;

  const recentProjects = orgProjects.slice(0, 3).map((project) => ({
    id: project.id,
    name: project.name,
    status: projectStatus(project, today),
    year: projectYear(project),
  }));

  const tagPatterns = buildTagPatternsForScope(scope.logs, scope.inbox, today);
  const relatedIds = collectRelatedEntityIds(org, scope.logs);
  const linkCounts = countLinkKinds(data, relatedIds);

  return {
    scope,
    timeline,
    intel,
    linkedPeople,
    orgProjects,
    recentProjects,
    sparkline,
    relationshipMetrics,
    relationshipScore,
    relationshipLabel,
    chartStartYear,
    chartEndYear,
    tagPatterns,
    stats: {
      emails: scope.emailCount,
      emailsDelta: emailsThisMonth > 0 ? `+${emailsThisMonth} this month` : "No change",
      people: linkedPeople.length,
      projects: orgProjects.length,
      topics: linkCounts.topicCount,
      events: linkCounts.eventCount,
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

function relationshipDisplayLabel(
  strategicValue: number,
  health: ReturnType<typeof buildEntityIntelligence>["relationshipHealth"]
): string {
  if (strategicValue >= 4 && health === "active") return "Strong Relationship";
  if (strategicValue >= 4) return "High Priority Relationship";
  if (health === "active") return "Active Relationship";
  if (health === "cooling") return "Cooling Relationship";
  if (health === "dormant") return "Dormant Relationship";
  return "Needs Attention";
}

export function loadProjectPageData(
  data: ArgusData,
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate: boolean,
  today: string,
  scopeOptions?: ProjectScopeOptions
) {
  const scope = getProjectEvidenceScope(data, inboxItems, project, includePrivate, scopeOptions);
  const allInbox = getAllProjectScopeInbox(inboxItems, project, includePrivate, scopeOptions);
  const allLogs = [...scope.directLogs, ...scope.viaContactLogs];
  let timeline = buildTimelineFromLogsAndInbox(allLogs, allInbox);
  timeline = enrichTimelineMeta(timeline, allLogs, allInbox, data.entities);

  const linkIds = collectProjectLinkIds(project);
  const linkCounts = countLinkKinds(data, linkIds);

  const linkedPeople = linkIds
    .map((id) => data.entities.find((e) => e.id === id && e.type === "person"))
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

  const org = linkIds
    .map((id) => data.entities.find((e) => e.id === id && e.type === "company"))
    .find(Boolean);

  const topicNames = linkedTopicNames(data, linkIds, project.linkedTags ?? []);

  const linkedEventsCount = linkCounts.eventCount;
  const status = projectStatus(project, today);
  const dateRangeLabel = formatProjectDateRange(project);

  const tagPatterns = buildTagPatternsForScope(allLogs, allInbox, today);

  const topicCount = linkCounts.topicCount + (project.linkedTags ?? []).filter(Boolean).length;

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
    keyMetrics: buildProjectKeyMetrics(scope, topicCount, linkedEventsCount),
    tagPatterns,
    stats: {
      people: linkCounts.peopleCount,
      topics: topicCount,
      events: linkedEventsCount,
      organizations: linkCounts.orgCount,
      emails: scope.emailCount,
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
  topicCount: number,
  eventCount: number
) {
  return [
    { label: "Topics", value: String(topicCount) },
    { label: "Events", value: String(eventCount) },
    { label: "Emails", value: String(scope.emailCount) },
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
