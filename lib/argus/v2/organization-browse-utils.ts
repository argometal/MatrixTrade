import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import {
  entitiesByKind,
  organizationEvidenceScope,
  organizationLinkedPersonIds,
  projectsForOrganization,
} from "./hierarchy";
import { relativeActivityLabel } from "./timeline-builders";

export type V2OrganizationBrowseStatus = "Prospect" | "Active" | "Inactive" | "Archived";

export interface V2OrganizationBrowseCard {
  id: string;
  name: string;
  href: string;
  status: V2OrganizationBrowseStatus;
  statusTone: "green" | "blue" | "amber" | "default";
  description: string;
  metrics: {
    projects: number;
    people: number;
    journal: number;
    emails: number;
    files: number;
    topics: number;
  };
  lastContact: {
    label: string;
    timeLabel: string;
    sortIso: string;
  };
  relationshipAge: string;
  relationshipSinceIso: string;
  trend: number[];
  trendStartYear: number;
  trendEndYear: number;
}

export interface V2OrganizationBrowseSummary {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  totalProjects: number;
}

function buildMonthlyActivitySparkline(logs: Log[], inbox: InboxItem[], months: number): number[] {
  const counts: number[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = d.toISOString().slice(0, 7);
    counts.push(
      logs.filter((l) => l.date.slice(0, 7) === prefix).length +
        inbox.filter((item) => item.receivedAt.slice(0, 7) === prefix).length
    );
  }
  return counts;
}

function orgDescription(org: Entity): string {
  const notes = entityNotesForDisplay(org.notes ?? "").trim();
  if (notes) return notes.split("\n")[0].slice(0, 180);
  if (org.alias?.trim()) return org.alias.trim();
  return "No description yet.";
}

function relationshipAgeLabel(fromIso: string, today: string): string {
  const start = new Date(`${fromIso.slice(0, 10)}T12:00:00`);
  const end = new Date(`${today.slice(0, 10)}T12:00:00`);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}m`;
  if (rem === 0) return `${years}y`;
  return `${years}y ${rem}m`;
}

function daysSince(iso: string, today: string): number {
  const a = Date.parse(iso.slice(0, 10));
  const b = Date.parse(today);
  return Math.floor((b - a) / 86400000);
}

function deriveOrganizationStatus(
  org: Entity,
  lastActivityIso: string,
  today: string,
  totalEvidence: number
): V2OrganizationBrowseStatus {
  if (org.deletedAt || /status:\s*archived/i.test(org.notes ?? "")) return "Archived";
  if (/status:\s*prospect/i.test(org.notes ?? "")) return "Prospect";

  if (totalEvidence === 0) return "Prospect";

  const staleDays = daysSince(lastActivityIso, today);
  if (staleDays <= 90) return "Active";
  return "Inactive";
}

function statusTone(status: V2OrganizationBrowseStatus): V2OrganizationBrowseCard["statusTone"] {
  if (status === "Active") return "green";
  if (status === "Prospect") return "blue";
  if (status === "Inactive") return "amber";
  return "default";
}

function resolveLastContact(
  org: Entity,
  logs: Log[],
  inbox: InboxItem[],
  today: string
): V2OrganizationBrowseCard["lastContact"] {
  const latestInbox = [...inbox].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  const latestLog = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];

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
    label: "Organization added",
    timeLabel: relativeActivityLabel(org.createdAt, today),
    sortIso: org.createdAt,
  };
}

function countOrgFiles(logs: Log[], inbox: InboxItem[]): number {
  const ids = new Set<string>();
  for (const log of logs) {
    for (const id of log.attachmentIds ?? []) ids.add(id);
  }
  for (const item of inbox) {
    for (const id of item.attachmentIds ?? []) ids.add(id);
  }
  return ids.size;
}

function countOrgTopics(org: Entity, logs: Log[], data: ArgusData): number {
  const topicIds = new Set<string>();
  for (const id of org.linkedEntityIds ?? []) {
    const entity = data.entities.find((e) => e.id === id);
    if (entity?.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "topic") {
      topicIds.add(id);
    }
  }
  const tagKeys = new Set<string>();
  for (const log of logs) {
    for (const topic of log.topics) {
      const key = topic.trim().toLowerCase();
      if (key) tagKeys.add(key);
    }
  }
  return topicIds.size + tagKeys.size;
}

function relationshipStartIso(org: Entity, logs: Log[], inbox: InboxItem[]): string {
  const candidates = [org.createdAt, ...logs.map((l) => l.date), ...inbox.map((i) => i.receivedAt)].filter(
    Boolean
  );
  return candidates.sort()[0] ?? org.createdAt;
}

export function buildV2OrganizationBrowseCards(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2OrganizationBrowseCard[] {
  const organizations = entitiesByKind(data).organizations;
  const chartEndYear = Number(today.slice(0, 4));
  const chartStartYear = chartEndYear - 1;

  return organizations
    .map((org) => {
      const scope = organizationEvidenceScope(data, inboxItems, org, includePrivate);
      const orgProjects = projectsForOrganization(data, org);
      const peopleIds = organizationLinkedPersonIds(org).filter((id) => {
        const entity = data.entities.find((e) => e.id === id);
        return entity?.type === "person";
      });
      const lastContact = resolveLastContact(org, scope.logs, scope.inbox, today);
      const totalEvidence = scope.totalCount;
      const status = deriveOrganizationStatus(org, lastContact.sortIso, today, totalEvidence);
      const sinceIso = relationshipStartIso(org, scope.logs, scope.inbox);

      return {
        id: org.id,
        name: org.name,
        href: `/argus/v2/organizations/${org.id}`,
        status,
        statusTone: statusTone(status),
        description: orgDescription(org),
        metrics: {
          projects: orgProjects.length,
          people: peopleIds.length,
          journal: scope.logCount,
          emails: scope.emailCount,
          files: countOrgFiles(scope.logs, scope.inbox),
          topics: countOrgTopics(org, scope.logs, data),
        },
        lastContact,
        relationshipAge: relationshipAgeLabel(sinceIso, today),
        relationshipSinceIso: sinceIso,
        trend: buildMonthlyActivitySparkline(scope.logs, scope.inbox, 12),
        trendStartYear: chartStartYear,
        trendEndYear: chartEndYear,
      };
    })
    .sort((a, b) => b.lastContact.sortIso.localeCompare(a.lastContact.sortIso));
}

export function buildV2OrganizationBrowseSummary(
  cards: V2OrganizationBrowseCard[],
  data: ArgusData
): V2OrganizationBrowseSummary {
  const totalProjects = entitiesByKind(data).projects.length;
  return {
    total: cards.length,
    active: cards.filter((c) => c.status === "Active").length,
    inactive: cards.filter((c) => c.status === "Inactive").length,
    archived: cards.filter((c) => c.status === "Archived").length,
    totalProjects,
  };
}
