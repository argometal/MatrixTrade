import type { ArgusData, Entity, InboxItem } from "../types";
import { entityNotesForDisplay } from "../reference-types";
import { getAllProjectScopeInbox, getProjectEvidenceScope } from "../project-evidence";
import { entitiesByKind } from "./hierarchy";
import { relativeActivityLabel } from "./timeline-builders";
import { collectProjectLinkIds, countLinkKinds } from "./entity-link-counts";

export type V2ProjectBrowseStatus = "Planning" | "Active" | "On Hold" | "Completed" | "Archived";

export interface V2ProjectBrowseTeamMember {
  id: string;
  name: string;
  initials: string;
}

export interface V2ProjectBrowseCard {
  id: string;
  name: string;
  href: string;
  status: V2ProjectBrowseStatus;
  statusTone: "green" | "blue" | "amber" | "zinc" | "orange";
  dateRangeLabel: string | undefined;
  description: string;
  metrics: {
    people: number;
    journal: number;
    emails: number;
    files: number;
    topics: number;
  };
  lastActivity: {
    label: string;
    timeLabel: string;
    sortIso: string;
  };
  progressPercent: number | undefined;
  team: V2ProjectBrowseTeamMember[];
  teamOverflow: number;
}

export interface V2ProjectBrowseSummary {
  total: number;
  active: number;
  planning: number;
  onHold: number;
  completed: number;
  archived: number;
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDisplayDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatProjectDateRange(project: Entity): string | undefined {
  if (!project.startDate) return undefined;
  const start = formatDisplayDate(project.startDate);
  const end = project.endDate ? formatDisplayDate(project.endDate) : "open";
  return `${start} – ${end}`;
}

function deriveProjectBrowseStatus(
  project: Entity,
  today: string,
  lastActivityIso: string
): V2ProjectBrowseStatus {
  if (project.deletedAt) return "Archived";

  const notes = project.notes ?? "";
  if (/status:\s*archived/i.test(notes)) return "Archived";
  if (/status:\s*on hold|on hold/i.test(notes)) return "On Hold";

  const end = project.endDate?.slice(0, 10);
  const start = project.startDate?.slice(0, 10);
  if (end && end < today) return "Completed";
  if (start && start > today) return "Planning";
  if (start && start <= today) {
    const staleCutoff = new Date(`${today}T12:00:00`);
    staleCutoff.setDate(staleCutoff.getDate() - 45);
    if (lastActivityIso.slice(0, 10) < staleCutoff.toISOString().slice(0, 10)) {
      return "On Hold";
    }
    return "Active";
  }
  return "Planning";
}

function statusTone(status: V2ProjectBrowseStatus): V2ProjectBrowseCard["statusTone"] {
  if (status === "Active") return "green";
  if (status === "Planning") return "blue";
  if (status === "Completed") return "zinc";
  if (status === "On Hold") return "orange";
  return "amber";
}

function projectDescription(project: Entity): string {
  const notes = entityNotesForDisplay(project.notes ?? "").trim();
  if (notes) return notes.split("\n")[0].slice(0, 160);
  return "No description yet.";
}

function durationProgress(project: Entity, today: string): number | undefined {
  if (!project.startDate || !project.endDate) return undefined;
  const start = Date.parse(project.startDate.slice(0, 10));
  const end = Date.parse(project.endDate.slice(0, 10));
  const now = Date.parse(today);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function resolveLastActivity(
  project: Entity,
  allInbox: InboxItem[],
  allLogs: { date: string; title: string }[],
  today: string
): V2ProjectBrowseCard["lastActivity"] {
  const sortedInbox = [...allInbox].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const sortedLogs = [...allLogs].sort((a, b) => b.date.localeCompare(a.date));
  const latestInbox = sortedInbox[0];
  const latestLog = sortedLogs[0];

  if (latestInbox && (!latestLog || latestInbox.receivedAt >= latestLog.date)) {
    const from = latestInbox.from?.replace(/<.*>/, "").trim() || "Unknown sender";
    return {
      label: `Email from ${from}`,
      timeLabel: relativeActivityLabel(latestInbox.receivedAt, today),
      sortIso: latestInbox.receivedAt,
    };
  }

  if (latestLog) {
    return {
      label: latestLog.title.trim() ? `Journal: ${latestLog.title}` : "Journal updated",
      timeLabel: relativeActivityLabel(latestLog.date, today),
      sortIso: latestLog.date,
    };
  }

  return {
    label: "Created project",
    timeLabel: relativeActivityLabel(project.createdAt, today),
    sortIso: project.createdAt,
  };
}

function countProjectFiles(allInbox: InboxItem[], allLogs: { attachmentIds: string[] }[]): number {
  const ids = new Set<string>();
  for (const item of allInbox) {
    for (const id of item.attachmentIds ?? []) ids.add(id);
  }
  for (const log of allLogs) {
    for (const id of log.attachmentIds ?? []) ids.add(id);
  }
  return ids.size;
}

export function buildV2ProjectBrowseCards(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2ProjectBrowseCard[] {
  const projects = entitiesByKind(data).projects.filter((p) => !p.deletedAt);

  return projects
    .map((project) => {
      const scope = getProjectEvidenceScope(data, inboxItems, project, includePrivate);
      const allInbox = getAllProjectScopeInbox(inboxItems, project, includePrivate);
      const allLogs = [...scope.directLogs, ...scope.viaContactLogs];
      const lastActivity = resolveLastActivity(project, allInbox, allLogs, today);
      const status = deriveProjectBrowseStatus(project, today, lastActivity.sortIso);
      const linkIds = collectProjectLinkIds(project);
      const linkCounts = countLinkKinds(data, linkIds);
      const linkedPeople = linkIds
        .map((id) => data.entities.find((e) => e.id === id && e.type === "person"))
        .filter((e): e is Entity => Boolean(e));
      const teamPreview = linkedPeople.slice(0, 4).map((person) => ({
        id: person.id,
        name: person.name,
        initials: initialsFromName(person.name),
      }));

      return {
        id: project.id,
        name: project.name,
        href: `/argus/v2/projects/${project.id}`,
        status,
        statusTone: statusTone(status),
        dateRangeLabel: formatProjectDateRange(project),
        description: projectDescription(project),
        metrics: {
          people: linkCounts.peopleCount,
          journal: scope.logCount,
          emails: allInbox.length,
          files: countProjectFiles(allInbox, allLogs),
          topics: linkCounts.topicCount + (project.linkedTags ?? []).length,
        },
        lastActivity,
        progressPercent: durationProgress(project, today),
        team: teamPreview,
        teamOverflow: Math.max(0, linkedPeople.length - teamPreview.length),
      };
    })
    .sort((a, b) => b.lastActivity.sortIso.localeCompare(a.lastActivity.sortIso));
}

export function buildV2ProjectBrowseSummary(cards: V2ProjectBrowseCard[]): V2ProjectBrowseSummary {
  return {
    total: cards.length,
    active: cards.filter((c) => c.status === "Active").length,
    planning: cards.filter((c) => c.status === "Planning").length,
    onHold: cards.filter((c) => c.status === "On Hold").length,
    completed: cards.filter((c) => c.status === "Completed").length,
    archived: cards.filter((c) => c.status === "Archived").length,
  };
}
