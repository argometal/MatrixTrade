import type { ArgusData, Entity, EntityLifecycleStatus, InboxItem, Log } from "../types";
import { isEntityArchived } from "../entity-lifecycle";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { buildEntityIntelligence, computeRelationshipHealth, contactValueWeight } from "../network-intelligence";
import { browseEntitiesByKind, entitiesByKind, personEvidenceScope } from "./hierarchy";
import { relativeActivityLabel } from "./timeline-builders";
import { countTopicsAndEventsInScope } from "./scope-node-counts";

/**
 * Simplified Network status (auto-derived — do not manually maintain for 1000 contacts).
 * New⊂Active · Lost⊂Dormant. Hot is a priority filter, not a status.
 */
export type V2NetworkBrowseStatus = "Active" | "Dormant" | "Archived";

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
  lifecycleStatus?: EntityLifecycleStatus;
  expertise: string[];
  /** Evidence volume for filters — not a strength KPI. */
  evidenceVolume: number;
  /**
   * Priority signal (Affinity-style): recent + frequent evidence.
   * Filter/sort aid — never a 4th status chip.
   */
  isHot: boolean;
  lastInteraction: {
    label: string;
    timeLabel: string;
    sortIso: string;
  };
  relationshipSince: string;
  relationshipSinceIso: string;
  metrics: {
    emails: number;
    topics: number;
    events: number;
    projects: number;
  };
}

export interface V2NetworkBrowseSummary {
  total: number;
  active: number;
  activePercent: number;
  dormant: number;
  /** @deprecated Always 0 — New merged into Active. */
  new: number;
  /** @deprecated Always 0 — Lost merged into Dormant. */
  lost: number;
  archived: number;
  organizations: number;
  projectsTogether: number;
  emailsExchanged: number;
  interactionsLogged: number;
  /** People in Dormant — retrieval count, not a score. */
  needsTouch: number;
  hot: number;
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
  | "dormant"
  | "hot";

/** Migrate legacy board pins / prefs (New→Active, Lost→Dormant). */
export function normalizeNetworkBrowseStatus(
  value: string | undefined | null
): V2NetworkBrowseStatus | "all" | null {
  if (!value) return null;
  if (value === "all") return "all";
  if (value === "Active" || value === "New") return "Active";
  if (value === "Dormant" || value === "Lost") return "Dormant";
  if (value === "Archived") return "Archived";
  return null;
}

/** Hot ≈ Affinity “strong relationship”: recent contact + denser evidence. */
export function networkCardIsHot(
  input: {
    status: V2NetworkBrowseStatus;
    evidenceVolume: number;
    lastInteractionIso: string;
  },
  today: string
): boolean {
  if (input.status === "Archived") return false;
  const days = daysSince(input.lastInteractionIso, today);
  if (Number.isNaN(days)) return false;
  if (days <= 30 && input.evidenceVolume >= 2) return true;
  if (days <= 60 && input.evidenceVolume >= 8) return true;
  return false;
}

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

function evidenceVolume(
  emailCount: number,
  logCount: number,
  projectsCount: number,
  eventCount: number
): number {
  return emailCount + logCount + projectsCount * 2 + eventCount;
}

/**
 * Auto Network status — evidence-driven; never manually filed for 1000 contacts.
 * Active = warm (includes former New). Dormant = quiet / neglected (includes former Lost).
 */
export function deriveNetworkStatus(input: {
  person: Entity;
  totalEvidence: number;
  daysSinceLast: number | null;
  openFollowUps: number;
  today: string;
}): V2NetworkBrowseStatus {
  const { person, daysSinceLast, openFollowUps, today } = input;
  if (person.lifecycleStatus === "archived" || isEntityArchived(person, today)) return "Archived";

  const valueWeight = contactValueWeight(person);
  const health = computeRelationshipHealth(valueWeight, daysSinceLast, openFollowUps);

  // Warm: recent evidence, cooling health, or open follow-ups (health active).
  if (daysSinceLast !== null && daysSinceLast <= 90) return "Active";
  if (health === "active" || health === "cooling") return "Active";

  // Thin / brand-new contacts stay Active (not a separate New bucket) until they go quiet.
  const ageDays = daysSince(person.createdAt, today);
  if (input.totalEvidence <= 1 && ageDays <= 60) return "Active";
  if (input.totalEvidence === 0 && ageDays <= 30) return "Active";

  return "Dormant";
}

function statusTone(status: V2NetworkBrowseStatus): V2NetworkBrowseCard["statusTone"] {
  if (status === "Active") return "green";
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
    if (latestLog.title.trim() === "Last contact") {
      return {
        label: "Last contact logged",
        timeLabel: relativeActivityLabel(latestLog.date, today),
        sortIso: latestLog.date,
      };
    }
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
  const people = browseEntitiesByKind(data).people;

  return people
    .map((person) => {
      const scope = personEvidenceScope(data, inboxItems, person, includePrivate);
      const intel = buildEntityIntelligence(data, person, includePrivate, today);
      const sharedProjects = projectsWithPerson(data, person.id);
      const journalEvents = eventCountForPerson(scope.logs);
      const nodeCounts = countTopicsAndEventsInScope(data, person, scope.logs);
      const org = personOrganization(data, person);
      const daysSinceLast = intel.daysSinceLastInteraction;
      const status = deriveNetworkStatus({
        person,
        totalEvidence: scope.totalCount,
        daysSinceLast,
        openFollowUps: intel.openFollowUps,
        today,
      });
      const sinceIso = relationshipStartIso(person, scope.logs, scope.inbox);
      const lastInteraction = resolveLastInteraction(person, scope.logs, scope.inbox, today);
      const volume = evidenceVolume(
        scope.emailCount,
        scope.logCount,
        sharedProjects.length,
        journalEvents
      );

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
        lifecycleStatus: person.lifecycleStatus,
        expertise: expertiseTags(person, scope.logs, data),
        evidenceVolume: volume,
        isHot: networkCardIsHot(
          {
            status,
            evidenceVolume: volume,
            lastInteractionIso: lastInteraction.sortIso,
          },
          today
        ),
        lastInteraction,
        relationshipSince: formatRelationshipSince(sinceIso),
        relationshipSinceIso: sinceIso,
        metrics: {
          emails: scope.emailCount,
          topics: nodeCounts.topicCount,
          events: nodeCounts.eventCount,
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
    new: 0,
    lost: 0,
    archived: cards.filter((c) => c.status === "Archived").length,
    organizations: orgIds.size,
    projectsTogether: projectTotal,
    emailsExchanged: cards.reduce((n, c) => n + c.metrics.emails, 0),
    interactionsLogged: cards.reduce((n, c) => n + c.metrics.topics + c.metrics.events, 0),
    needsTouch: cards.filter((c) => c.status === "Dormant").length,
    hot: cards.filter((c) => c.isHot).length,
  };
}

export function buildV2NetworkBrowseInsights(cards: V2NetworkBrowseCard[]): V2NetworkBrowseInsight {
  const statusCounts: Record<V2NetworkBrowseStatus, number> = {
    Active: 0,
    Dormant: 0,
    Archived: 0,
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
  if (view === "hot") return cards.filter((c) => c.isHot);
  if (view === "dormant") return cards.filter((c) => c.status === "Dormant");
  if (view === "recent-activity") return cards.filter((c) => c.status === "Active");
  if (view === "high-value-network") {
    return cards.filter(
      (c) => c.evidenceVolume >= 8 || (c.metrics.projects >= 1 && c.metrics.emails + c.metrics.events >= 3)
    );
  }
  if (view === "key-influencers") {
    return cards.filter((c) => c.metrics.projects >= 1 && c.evidenceVolume >= 6);
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
