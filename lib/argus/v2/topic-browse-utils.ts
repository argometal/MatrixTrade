import { TAG_PATTERN_FRESHNESS_DAYS } from "../tag-limits";
import { textMatchesBrowseQuery, topicBrowseTagMatch } from "./browse-filter-utils";
import type { V2EvidenceStreamItem } from "./evidence-stream";
import type { EntityLifecycleStatus } from "../types";
import type { TagPattern } from "./tag-patterns";

export type V2TopicTab = "all" | "active" | "empty" | "orphans" | "patterns";

export type V2TopicEvidenceKind = "email" | "journal" | "file";

export type V2TopicActivityFilter = "7d" | "30d" | "90d" | "older";

export interface V2TopicFilters {
  q?: string;
  tag?: string;
  org?: string;
  project?: string;
  entity?: string;
  kind?: V2TopicEvidenceKind;
  /** Last activity window (calendar days from today). */
  activity?: V2TopicActivityFilter;
}

export interface V2TopicRow {
  id: string;
  name: string;
  lastActivity: string;
  lastSort: string;
  journalCount: number;
  emailCount: number;
  fileCount: number;
  evidenceCount: number;
  /** Structural linked events (outbound + reverse + bridge + co-mention). */
  eventCount: number;
  /** Topic Tags on the binder (`entity.linkedTags`) — part of the Tag system. */
  aliases: string[];
  /** Evidence Tags from notes/emails (topic ∪ linked events). */
  evidenceTags: string[];
  patternCount: number;
  linkedOrgIds: string[];
  linkedProjectIds: string[];
  linkedEntityIds: string[];
  searchText: string;
}

/**
 * Orphans (legacy helper name `topicRowIsEmpty`) = no evidence and no structural neighbors.
 * Linked-only topics are Quiet — homologated with Events/Inbox Orphans.
 */
export function topicRowIsEmpty(row: Pick<V2TopicRow, "evidenceCount" | "eventCount" | "linkedEntityIds">): boolean {
  return row.evidenceCount === 0 && row.eventCount === 0 && row.linkedEntityIds.length === 0;
}

export interface V2TopicLinkedEntity {
  id: string;
  name: string;
  icon: string;
  href: string;
}

export interface V2TopicDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  eventCount: number;
  journalCount: number;
  emailCount: number;
  fileCount: number;
  photoCount: number;
  evidenceCount: number;
  /**
   * Link modal seed: outbound structural ids ∪ reverse Topic↔Event binders.
   * Broader neighbor sets stay on neighborEntityIds / Connections.
   */
  linkedEntityIds: string[];
  /** Neighbor set for filters / Connections (outbound + reverse + bridge + co-mention). */
  neighborEntityIds: string[];
  linkedEntities: V2TopicLinkedEntity[];
  linkedEvents: Array<{ id: string; name: string; href: string; dateLabel?: string }>;
  /** Topic Tags on the binder (`entity.linkedTags`). */
  aliases: string[];
  lifecycleStatus?: EntityLifecycleStatus;
  hasPrivateEvidence: boolean;
  deleteRequiresAuthenticator: boolean;
  evidence: V2EvidenceStreamItem[];
  /** Patterns from topic evidence ∪ linked-event evidence. */
  tagPatterns: TagPattern[];
  /**
   * Legacy aggregate Tag inventory (Topic-direct ∪ Event evidence ∪ binder-only Event tags).
   * Retained for suggestions / Patterns helpers — not the primary Topic Tags inventory.
   */
  evidenceTagCounts: Array<{ tag: string; count: number }>;
  /**
   * Tags from Notes/emails directly linked to this Topic only
   * (excludes evidence that arrives solely through linked Events).
   */
  topicDirectEvidenceTagCounts: Array<{ tag: string; count: number }>;
  /**
   * Per linked Event: binder Event Tags vs Note/email evidence Tags (split for provenance UI).
   * `tags` remains the merged union for backward compatibility.
   */
  eventEvidenceTags: Array<{
    id: string;
    name: string;
    href: string;
    dateLabel?: string;
    /** Notes (logs) linked to this Event. */
    noteCount: number;
    /** Emails linked to this Event. */
    emailCount: number;
    /** @deprecated Prefer eventTags + noteTags — merged binder ∪ evidence. */
    tags: string[];
    /** Event binder `eventTags`. */
    eventTags: string[];
    /** Log.topics / inbox topics on this Event. */
    noteTags: string[];
  }>;
}

export interface V2TopicTagChip {
  name: string;
  count: number;
}

export interface V2TopicFilterOptions {
  organizations: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
}

export const V2_TOPIC_PAGE_SIZE = 25;

function activeCutoffIso(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TAG_PATTERN_FRESHNESS_DAYS);
  return cutoff.toISOString().slice(0, 10);
}

function topicRowIsActive(row: Pick<V2TopicRow, "evidenceCount" | "lastSort">, cutoff: string): boolean {
  if (row.evidenceCount <= 0) return false;
  const lastDay = row.lastSort.slice(0, 10);
  // Evidence without a usable date still counts as Active (same as browse cards).
  return !lastDay || lastDay >= cutoff;
}

export function buildV2TopicTabCounts(rows: V2TopicRow[]) {
  const cutoff = activeCutoffIso();
  return {
    all: rows.length,
    active: rows.filter((r) => topicRowIsActive(r, cutoff)).length,
    empty: rows.filter((r) => topicRowIsEmpty(r)).length,
    patterns: rows.filter((r) => r.patternCount > 0).length,
  };
}

export function filterV2TopicRows(
  rows: V2TopicRow[],
  tab: V2TopicTab,
  filters: V2TopicFilters = {}
): V2TopicRow[] {
  const cutoff = activeCutoffIso();
  let result = rows;

  if (tab === "active") {
    result = result.filter((r) => topicRowIsActive(r, cutoff));
  } else if (tab === "empty" || tab === "orphans") {
    result = result.filter((r) => topicRowIsEmpty(r));
  } else if (tab === "patterns") {
    result = result.filter((r) => r.patternCount > 0);
  }

  if (filters.q) {
    result = result.filter((row) =>
      textMatchesBrowseQuery(filters.q!, [
        row.name,
        row.searchText,
        ...row.aliases,
        ...row.evidenceTags,
      ])
    );
  }
  if (filters.tag) {
    result = result.filter((row) =>
      topicBrowseTagMatch([...row.aliases, ...row.evidenceTags], row.name, filters.tag!)
    );
  }
  if (filters.org) {
    result = result.filter((row) => row.linkedOrgIds.includes(filters.org!));
  }
  if (filters.project) {
    result = result.filter((row) => row.linkedProjectIds.includes(filters.project!));
  }
  if (filters.entity) {
    result = result.filter((row) => row.linkedEntityIds.includes(filters.entity!));
  }
  if (filters.kind === "email") {
    result = result.filter((row) => row.emailCount > 0);
  } else if (filters.kind === "journal") {
    result = result.filter((row) => row.journalCount > 0);
  } else if (filters.kind === "file") {
    result = result.filter((row) => row.fileCount > 0);
  }

  if (filters.activity) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const dayIso = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      return d.toISOString().slice(0, 10);
    };
    if (filters.activity === "7d") {
      const from = dayIso(7);
      result = result.filter((row) => row.lastSort.slice(0, 10) >= from);
    } else if (filters.activity === "30d") {
      const from = dayIso(30);
      result = result.filter((row) => row.lastSort.slice(0, 10) >= from);
    } else if (filters.activity === "90d") {
      const from = dayIso(90);
      result = result.filter((row) => row.lastSort.slice(0, 10) >= from);
    } else if (filters.activity === "older") {
      const before = dayIso(90);
      result = result.filter((row) => {
        const day = row.lastSort.slice(0, 10);
        return day && day < before;
      });
    }
  }

  return result;
}

export function parseV2TopicTab(value: string | undefined): V2TopicTab {
  if (value === "active" || value === "empty" || value === "orphans" || value === "patterns") {
    return value;
  }
  if (value === "mine" || value === "followed") return "active";
  return "all";
}

export function parseV2TopicFilters(params: {
  q?: string | null;
  tag?: string | null;
  org?: string | null;
  project?: string | null;
  entity?: string | null;
  kind?: string | null;
  activity?: string | null;
}): V2TopicFilters {
  const filters: V2TopicFilters = {};
  const q = params.q?.trim();
  if (q) filters.q = q;

  const tag = params.tag?.trim();
  if (tag) filters.tag = tag;

  const org = params.org?.trim();
  if (org) filters.org = org;

  const project = params.project?.trim();
  if (project) filters.project = project;

  const entity = params.entity?.trim();
  if (entity) filters.entity = entity;

  const kind = params.kind?.trim();
  if (kind === "email" || kind === "journal" || kind === "file") {
    filters.kind = kind;
  }

  const activity = params.activity?.trim();
  if (activity === "7d" || activity === "30d" || activity === "90d" || activity === "older") {
    filters.activity = activity;
  }

  return filters;
}

export function hasActiveV2TopicFilters(filters: V2TopicFilters): boolean {
  return Boolean(
    filters.q || filters.tag || filters.org || filters.project || filters.entity || filters.kind || filters.activity
  );
}

export function buildV2TopicFilterOptions(details: V2TopicDetail[]): V2TopicFilterOptions {
  const orgMap = new Map<string, string>();
  const projectMap = new Map<string, string>();

  for (const detail of details) {
    for (const linked of detail.linkedEntities) {
      if (linked.icon === "🏢") orgMap.set(linked.id, linked.name);
      else if (linked.icon === "📁") projectMap.set(linked.id, linked.name);
    }
  }

  const organizations = [...orgMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const projects = [...projectMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { organizations, projects };
}

export function paginateV2TopicRows<T>(rows: T[], page: number, pageSize = V2_TOPIC_PAGE_SIZE): T[] {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function v2TopicPageCount(rowCount: number, pageSize = V2_TOPIC_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(rowCount / pageSize));
}

/** Portfolio board / filter status for topics (exclusive buckets). */
export type V2TopicBrowseStatus = "Active" | "Quiet" | "Orphans" | "Archived";

export interface V2TopicBrowseCard {
  id: string;
  name: string;
  category: string;
  description: string;
  status: V2TopicBrowseStatus;
  statusTone: "green" | "amber" | "blue" | "default";
  lastActivity: string;
  lastSort: string;
  patternCount: number;
  aliases: string[];
  metrics: {
    journals: number;
    emails: number;
    files: number;
    events: number;
    orgs: number;
    projects: number;
    people: number;
  };
  hasPrivateEvidence: boolean;
  deleteRequiresAuthenticator: boolean;
  lifecycleStatus?: EntityLifecycleStatus;
  searchText: string;
}

export interface V2TopicBrowseSummary {
  total: number;
  active: number;
  quiet: number;
  empty: number;
  archived: number;
}

function deriveTopicBrowseStatus(
  row: V2TopicRow,
  detail: V2TopicDetail | undefined
): V2TopicBrowseStatus {
  if (detail?.lifecycleStatus === "archived") return "Archived";
  const evidenceCount = Math.max(row.evidenceCount, detail?.evidenceCount ?? 0);
  const eventCount = Math.max(
    detail?.eventCount ?? 0,
    detail?.linkedEvents?.length ?? 0,
    row.eventCount
  );
  const linkedCount = Math.max(
    detail?.neighborEntityIds?.length ?? 0,
    detail?.linkedEntities?.length ?? 0,
    row.linkedEntityIds.length
  );
  // Linked to events/orgs/projects/people is not Orphans — Quiet until evidence arrives.
  if (evidenceCount === 0 && eventCount === 0 && linkedCount === 0) return "Orphans";
  if (evidenceCount === 0) return "Quiet";
  const cutoff = activeCutoffIso();
  const lastDay = row.lastSort.slice(0, 10);
  // Evidence without a usable date still counts as Active (wired recall).
  if (!lastDay || lastDay >= cutoff) return "Active";
  return "Quiet";
}

function topicStatusTone(status: V2TopicBrowseStatus): V2TopicBrowseCard["statusTone"] {
  if (status === "Active") return "green";
  if (status === "Quiet") return "amber";
  if (status === "Orphans") return "blue";
  return "default";
}

/**
 * Board / pill column status.
 * Active↔Quiet (and Archive) pins may override derived activity.
 * Orphans stays orphan-only — never park a linked/evidence topic there.
 * Legacy pin "Empty" migrates to Orphans.
 */
export function resolveTopicColumnStatus(
  derived: V2TopicBrowseStatus,
  override?: V2TopicBrowseStatus | "Empty" | null
): V2TopicBrowseStatus {
  const pin = override === "Empty" ? "Orphans" : override;
  if (!pin || pin === derived) return derived;
  if (pin === "Orphans" && derived !== "Orphans") return derived;
  return pin;
}

/** Apply a board pin so badges, pills, and filters share one status. */
export function applyTopicColumnStatus(
  card: V2TopicBrowseCard,
  override?: V2TopicBrowseStatus | "Empty" | null
): V2TopicBrowseCard {
  const status = resolveTopicColumnStatus(card.status, override);
  if (status === card.status) return card;
  return { ...card, status, statusTone: topicStatusTone(status) };
}

export function buildV2TopicBrowseCards(
  rows: V2TopicRow[],
  details: V2TopicDetail[]
): V2TopicBrowseCard[] {
  const byId = new Map(details.map((d) => [d.id, d]));
  return rows.map((row) => {
    const detail = byId.get(row.id);
    const status = deriveTopicBrowseStatus(row, detail);
    return {
      id: row.id,
      name: row.name,
      category: detail?.category ?? "Topic",
      description: detail?.description ?? "No description yet.",
      status,
      statusTone: topicStatusTone(status),
      lastActivity: row.lastActivity,
      lastSort: row.lastSort,
      patternCount: row.patternCount,
      // Card chips: Topic Tags ∪ evidence Tags (one Tag system).
      aliases: [...new Set([...row.aliases, ...row.evidenceTags])].slice(0, 6),
      metrics: {
        journals: row.journalCount,
        emails: row.emailCount,
        files: row.fileCount,
        events: Math.max(
          detail?.eventCount ?? 0,
          detail?.linkedEvents?.length ?? 0,
          row.eventCount
        ),
        orgs: detail?.orgCount ?? row.linkedOrgIds.length,
        projects: detail?.projectCount ?? row.linkedProjectIds.length,
        people: detail?.peopleCount ?? 0,
      },
      hasPrivateEvidence: detail?.hasPrivateEvidence ?? false,
      deleteRequiresAuthenticator: detail?.deleteRequiresAuthenticator ?? false,
      lifecycleStatus: detail?.lifecycleStatus,
      searchText: row.searchText,
    };
  });
}

export function buildV2TopicBrowseSummary(cards: V2TopicBrowseCard[]): V2TopicBrowseSummary {
  return {
    total: cards.length,
    active: cards.filter((c) => c.status === "Active").length,
    quiet: cards.filter((c) => c.status === "Quiet").length,
    empty: cards.filter((c) => c.status === "Orphans").length,
    archived: cards.filter((c) => c.status === "Archived").length,
  };
}
