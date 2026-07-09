import type { ArgusData, Entity, InboxItem, Log } from "../types";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { buildEntityIntelligence } from "../network-intelligence";
import { entitiesByKind, personEvidenceScope } from "./hierarchy";
import { relativeActivityLabel } from "./timeline-builders";

export type V2NetworkBrowseStatus = "New" | "Active" | "Dormant" | "Lost";

export interface V2NetworkBrowseCard {
  id: string;
  name: string;
  href: string;
  initials: string;
  role: string;
  organization: string | null;
  organizationId: string | null;
  status: V2NetworkBrowseStatus;
  statusTone: "green" | "blue" | "amber" | "default";
  expertise: string[];
  strength: number;
  lastInteraction: {
    label: string;
    timeLabel: string;
    sortIso: string;
  };
  relationshipSince: string;
  relationshipSinceIso: string;
  metrics: {
    emails: number;
    journal: number;
    events: number;
    projects: number;
  };
}

export interface V2NetworkBrowseSummary {
  total: number;
  active: number;
  activePercent: number;
  dormant: number;
  new: number;
  lost: number;
  organizations: number;
  projectsTogether: number;
  emailsExchanged: number;
  interactionsLogged: number;
  averageStrength: number;
}

export interface V2NetworkBrowseInsight {
  statusCounts: Record<V2NetworkBrowseStatus, number>;
  topOrganizations: { name: string; count: number }[];
  recentInteractions: { personName: string; label: string; timeLabel: string; sortIso: string }[];
}

export type V2NetworkSmartView =
  | "all"
  | "key-influencers"
  | "decision-makers"
  | "technical-experts"
  | "recent-activity"
  | "high-value-network"
  | "dormant";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function personRole(person: Entity): string {
  if (person.alias?.trim()) return person.alias.trim();
  const notes = entityNotesForDisplay(person.notes ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (notes[0]) return notes[0].slice(0, 80);
  return "Professional contact";
}

function personOrganization(
  data: ArgusData,
  person: Entity
): { id: string; name: string } | null {
  for (const id of person.linkedEntityIds ?? []) {
    const entity = data.entities.find((e) => e.id === id && e.type === "company" && !e.deletedAt);
    if (entity) return { id: entity.id, name: entity.name };
  }
  for (const org of entitiesByKind(data).organizations) {
    const linked = [...(org.linkedPersonIds ?? []), ...(org.linkedEntityIds ?? [])];
    if (linked.includes(person.id)) return { id: org.id, name: org.name };
  }
  return null;
}

function projectsWithPerson(data: ArgusData, personId: string): Entity[] {
  return data.entities.filter(
    (e) =>
      e.type === "project" &&
      !e.deletedAt &&
      ((e.linkedPersonIds ?? []).includes(personId) || (e.linkedEntityIds ?? []).includes(personId))
  );
}

function eventCountForPerson(logs: Log[]): number {
  return logs.filter((l) => l.kind === "event" || l.kind === "follow_up").length;
}

function expertiseTags(person: Entity, logs: Log[], data: ArgusData): string[] {
  const tags = new Set<string>();
  for (const log of logs) {
    for (const topic of log.topics) {
      const key = topic.trim();
      if (key) tags.add(key);
    }
  }
  for (const id of person.linkedEntityIds ?? []) {
    const entity = data.entities.find((e) => e.id === id);
    if (entity?.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "topic") {
      tags.add(entity.name);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b)).slice(0, 4);
}

function daysSince(iso: string, today: string): number {
  const a = Date.parse(iso.slice(0, 10));
  const b = Date.parse(today);
  return Math.floor((b - a) / 86400000);
}

function computeRelationshipStrength(
  emailCount: number,
  logCount: number,
  projectsCount: number,
  eventCount: number,
  daysSinceLast: number | null
): number {
  const emailPts = Math.min(emailCount * 4, 24);
  const journalPts = Math.min(logCount * 5, 30);
  const projectPts = Math.min(projectsCount * 12, 24);
  const eventPts = Math.min(eventCount * 6, 18);
  let recency = 0;
  if (daysSinceLast !== null) {
    if (daysSinceLast <= 7) recency = 24;
    else if (daysSinceLast <= 30) recency = 16;
    else if (daysSinceLast <= 90) recency = 8;
  }
  return Math.min(100, emailPts + journalPts + projectPts + eventPts + recency);
}

function deriveNetworkStatus(
  person: Entity,
  totalEvidence: number,
  daysSinceLast: number | null,
  today: string,
  health: ReturnType<typeof buildEntityIntelligence>["relationshipHealth"]
): V2NetworkBrowseStatus {
  if (person.deletedAt || /status:\s*lost/i.test(person.notes ?? "")) return "Lost";
  if (health === "neglected" && daysSinceLast !== null && daysSinceLast > 180) return "Lost";

  const ageDays = daysSince(person.createdAt, today);
  if (totalEvidence <= 1 && ageDays <= 60) return "New";

  if (daysSinceLast !== null && daysSinceLast <= 90) return "Active";
  if (health === "active" || health === "cooling") return "Active";
  if (totalEvidence === 0 && ageDays <= 30) return "New";

  return "Dormant";
}

function statusTone(status: V2NetworkBrowseStatus): V2NetworkBrowseCard["statusTone"] {
  if (status === "Active") return "green";
  if (status === "New") return "blue";
  if (status === "Dormant") return "amber";
  return "default";
}

function formatRelationshipSince(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveLastInteraction(
  person: Entity,
  logs: Log[],
  inbox: InboxItem[],
  today: string
): V2NetworkBrowseCard["lastInteraction"] {
  const latestInbox = [...inbox].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  const latestLog = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];

  if (latestInbox && (!latestLog || latestInbox.receivedAt >= latestLog.date)) {
    return {
      label: `Email with ${person.name}`,
      timeLabel: relativeActivityLabel(latestInbox.receivedAt, today),
      sortIso: latestInbox.receivedAt,
    };
  }

  if (latestLog) {
    const kind =
      latestLog.kind === "follow_up" ? "Follow-up" : latestLog.kind === "event" ? "Meeting" : "Journal";
    return {
      label: `${kind}: ${latestLog.title.trim() || person.name}`,
      timeLabel: relativeActivityLabel(latestLog.date, today),
      sortIso: latestLog.date,
    };
  }

  return {
    label: "Contact added",
    timeLabel: relativeActivityLabel(person.createdAt, today),
    sortIso: person.createdAt,
  };
}

function relationshipStartIso(person: Entity, logs: Log[], inbox: InboxItem[]): string {
  const candidates = [person.createdAt, ...logs.map((l) => l.date), ...inbox.map((i) => i.receivedAt)].filter(
    Boolean
  );
  return candidates.sort()[0] ?? person.createdAt;
}

export function buildV2NetworkBrowseCards(
  data: ArgusData,
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string
): V2NetworkBrowseCard[] {
  const people = entitiesByKind(data).people;

  return people
    .map((person) => {
      const scope = personEvidenceScope(data, inboxItems, person, includePrivate);
      const intel = buildEntityIntelligence(data, person, includePrivate, today);
      const sharedProjects = projectsWithPerson(data, person.id);
      const events = eventCountForPerson(scope.logs);
      const org = personOrganization(data, person);
      const daysSinceLast = intel.daysSinceLastInteraction;
      const status = deriveNetworkStatus(
        person,
        scope.totalCount,
        daysSinceLast,
        today,
        intel.relationshipHealth
      );
      const sinceIso = relationshipStartIso(person, scope.logs, scope.inbox);
      const lastInteraction = resolveLastInteraction(person, scope.logs, scope.inbox, today);

      return {
        id: person.id,
        name: person.name,
        href: `/argus/v2/network/${person.id}`,
        initials: initialsFromName(person.name),
        role: personRole(person),
        organization: org?.name ?? null,
        organizationId: org?.id ?? null,
        status,
        statusTone: statusTone(status),
        expertise: expertiseTags(person, scope.logs, data),
        strength: computeRelationshipStrength(
          scope.emailCount,
          scope.logCount,
          sharedProjects.length,
          events,
          daysSinceLast
        ),
        lastInteraction,
        relationshipSince: formatRelationshipSince(sinceIso),
        relationshipSinceIso: sinceIso,
        metrics: {
          emails: scope.emailCount,
          journal: scope.logCount,
          events,
          projects: sharedProjects.length,
        },
      };
    })
    .sort((a, b) => b.lastInteraction.sortIso.localeCompare(a.lastInteraction.sortIso));
}

export function buildV2NetworkBrowseSummary(cards: V2NetworkBrowseCard[]): V2NetworkBrowseSummary {
  const active = cards.filter((c) => c.status === "Active").length;
  const orgIds = new Set(cards.map((c) => c.organizationId).filter(Boolean));
  const projectTotal = cards.reduce((n, c) => n + c.metrics.projects, 0);

  return {
    total: cards.length,
    active,
    activePercent: cards.length ? Math.round((active / cards.length) * 100) : 0,
    dormant: cards.filter((c) => c.status === "Dormant").length,
    new: cards.filter((c) => c.status === "New").length,
    lost: cards.filter((c) => c.status === "Lost").length,
    organizations: orgIds.size,
    projectsTogether: projectTotal,
    emailsExchanged: cards.reduce((n, c) => n + c.metrics.emails, 0),
    interactionsLogged: cards.reduce((n, c) => n + c.metrics.journal + c.metrics.events, 0),
    averageStrength: cards.length
      ? Math.round(cards.reduce((n, c) => n + c.strength, 0) / cards.length)
      : 0,
  };
}

export function buildV2NetworkBrowseInsights(cards: V2NetworkBrowseCard[]): V2NetworkBrowseInsight {
  const statusCounts: Record<V2NetworkBrowseStatus, number> = {
    New: 0,
    Active: 0,
    Dormant: 0,
    Lost: 0,
  };
  for (const card of cards) statusCounts[card.status] += 1;

  const orgMap = new Map<string, number>();
  for (const card of cards) {
    if (!card.organization) continue;
    orgMap.set(card.organization, (orgMap.get(card.organization) ?? 0) + 1);
  }

  const topOrganizations = [...orgMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentInteractions = cards
    .map((card) => ({
      personName: card.name,
      label: card.lastInteraction.label,
      timeLabel: card.lastInteraction.timeLabel,
      sortIso: card.lastInteraction.sortIso,
    }))
    .sort((a, b) => b.sortIso.localeCompare(a.sortIso))
    .slice(0, 6);

  return { statusCounts, topOrganizations, recentInteractions };
}

const DECISION_KEYWORDS = /\b(manager|director|head|lead|procurement|contracts|vp|president|chief|decision)\b/i;
const TECHNICAL_KEYWORDS =
  /\b(drilling|engineer|technical|hse|operations|deepwater|directional|geolog|petrophys|sql|data)\b/i;

export function applyNetworkSmartView(cards: V2NetworkBrowseCard[], view: V2NetworkSmartView): V2NetworkBrowseCard[] {
  if (view === "all") return cards;
  if (view === "dormant") return cards.filter((c) => c.status === "Dormant" || c.status === "Lost");
  if (view === "recent-activity") return cards.filter((c) => c.status === "Active");
  if (view === "high-value-network") return cards.filter((c) => c.strength >= 70);
  if (view === "key-influencers") {
    return cards.filter((c) => c.strength >= 60 && c.metrics.projects >= 1);
  }
  if (view === "decision-makers") {
    return cards.filter(
      (c) =>
        DECISION_KEYWORDS.test(c.role) ||
        c.expertise.some((tag) => DECISION_KEYWORDS.test(tag))
    );
  }
  if (view === "technical-experts") {
    return cards.filter(
      (c) =>
        TECHNICAL_KEYWORDS.test(c.role) ||
        c.expertise.some((tag) => TECHNICAL_KEYWORDS.test(tag))
    );
  }
  return cards;
}

export function smartViewCount(cards: V2NetworkBrowseCard[], view: V2NetworkSmartView): number {
  return applyNetworkSmartView(cards, view).length;
}
