import type { EntityLifecycleStatus } from "../types";
import type { TagPattern } from "./tag-patterns";

/** Triage spine — homologated with Topics Active/Quiet/Orphans and Inbox Orphans/Linked. */
export type V2EventTriageTab = "all" | "orphans" | "linked" | "archived";

/** Calendar cut — secondary to triage. */
export type V2EventWhenTab = "all" | "upcoming" | "past";

/** @deprecated Prefer `V2EventWhenTab` — old `?tab=upcoming|past` maps into `when`. */
export type V2EventTab = V2EventWhenTab;

export const V2_EVENT_PAGE_SIZE = 25;

export interface V2EventRow {
  id: string;
  name: string;
  dateLabel: string;
  timeLabel: string;
  meetingUrl?: string;
  projectName?: string;
  projectHref?: string;
  typeLabel: string;
  attendeeInitials: string[];
  isUpcoming: boolean;
  sortDate: string;
  /** Org/project/people/topic ids linked to this event — for scoped browse filters. */
  scopeLinkIds: string[];
  lifecycleStatus?: EntityLifecycleStatus;
  /** No structural neighbors and not archived — needs attention. */
  isOrphan: boolean;
}

export interface V2EventEntry {
  id: string;
  title: string;
  kind: string;
  href: string;
}

export interface V2EventEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  href: string;
}

export interface V2EventEvidenceItem {
  id: string;
  kind: "email" | "journal" | "photo" | "file";
  title: string;
  meta: string;
  sortIso: string;
  href: string;
}

export interface V2EventInboxOption {
  id: string;
  subject: string;
  from: string;
  date: string;
  alreadyLinked: boolean;
}

export interface V2EventDetail {
  id: string;
  name: string;
  dateTimeLabel: string;
  eventDate: string;
  meetingUrl?: string;
  projectName?: string;
  projectHref?: string;
  topicTags: string[];
  linkedTopicNames: string[];
  /** Linked topic entities (structural — not evidence tag strings). */
  linkedTopics: Array<{ id: string; name: string; href: string }>;
  /**
   * Derived Tags from Notes on linked Topics (topic ∪ their Events) — picker reuse only.
   * Not a Topic-owned Tag store.
   */
  topicContextTags: string[];
  description: string;
  /**
   * @deprecated Legacy Signals leftover — do not treat as Event Tags.
   * Prefer `eventTags` (`TagRole: event`).
   */
  linkedTags: string[];
  /** Event binder classification Tags (`TagRole: event`). */
  eventTags: string[];
  /**
   * Structural neighborhood Tag pools for Tags tab Branch section.
   * Evidence/binder tags from this Event + linked Topics + linked Projects — not attached.
   */
  branchTagGroups: Array<{
    id: string;
    label: string;
    contextName?: string;
    href?: string;
    tags: Array<{ tag: string; count: number }>;
  }>;
  chronicleCount: number;
  attendeeInitials: string[];
  attendeeNames: string[];
  attendeeCount: number;
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  topicCount: number;
  /** Structural Links tab lists (neighbor set). */
  linkedOrgs: Array<{ id: string; name: string; href: string; icon: string }>;
  linkedProjects: Array<{ id: string; name: string; href: string; icon: string }>;
  linkedPeople: Array<{ id: string; name: string; href: string; icon: string }>;
  linkedEntityIds: string[];
  linkedEntries: V2EventEntry[];
  relatedEmails: V2EventEmail[];
  evidence: V2EventEvidenceItem[];
  lifecycleStatus?: EntityLifecycleStatus;
  hasPrivateEvidence: boolean;
  deleteRequiresAuthenticator: boolean;
  tagPatterns: TagPattern[];
}

/** Orphan event = no structural neighbors (Topics Empty / Inbox Orphans homolog). */
export function eventRowIsOrphan(
  row: Pick<V2EventRow, "scopeLinkIds" | "lifecycleStatus" | "isOrphan">
): boolean {
  if (typeof row.isOrphan === "boolean") return row.isOrphan;
  if (row.lifecycleStatus === "archived") return false;
  return row.scopeLinkIds.length === 0;
}

export function buildV2EventTriageCounts(rows: V2EventRow[]) {
  return {
    all: rows.length,
    orphans: rows.filter((r) => eventRowIsOrphan(r)).length,
    linked: rows.filter((r) => !eventRowIsOrphan(r) && r.lifecycleStatus !== "archived").length,
    archived: rows.filter((r) => r.lifecycleStatus === "archived").length,
  };
}

export function buildV2EventWhenCounts(rows: V2EventRow[]) {
  return {
    all: rows.length,
    upcoming: rows.filter((r) => r.isUpcoming).length,
    past: rows.filter((r) => !r.isUpcoming).length,
  };
}

/** @deprecated Use `buildV2EventWhenCounts` — kept for older callers. */
export function buildV2EventTabCounts(rows: V2EventRow[]) {
  return buildV2EventWhenCounts(rows);
}

export function sortV2EventRows(
  rows: V2EventRow[],
  when: V2EventWhenTab = "all"
): V2EventRow[] {
  const copy = [...rows];
  if (when === "upcoming") {
    return copy.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.name.localeCompare(b.name));
  }
  // Latest first (default + past).
  return copy.sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.name.localeCompare(b.name));
}

export function filterV2EventRows(
  rows: V2EventRow[],
  triageOrTab: V2EventTriageTab | V2EventTab = "all",
  whenOrEntity?: V2EventWhenTab | string,
  entityId?: string
): V2EventRow[] {
  // Back-compat: filterV2EventRows(rows, whenTab, entityId?)
  let triage: V2EventTriageTab = "all";
  let when: V2EventWhenTab = "all";
  let scope: string | undefined = entityId;

  if (triageOrTab === "upcoming" || triageOrTab === "past") {
    when = triageOrTab;
    if (typeof whenOrEntity === "string" && whenOrEntity !== "all" && whenOrEntity !== "upcoming" && whenOrEntity !== "past") {
      scope = whenOrEntity;
    }
  } else {
    triage = triageOrTab;
    if (whenOrEntity === "upcoming" || whenOrEntity === "past" || whenOrEntity === "all") {
      when = whenOrEntity;
    } else if (typeof whenOrEntity === "string" && whenOrEntity) {
      scope = whenOrEntity;
    }
  }

  let result = rows;
  if (scope) {
    result = result.filter((row) => row.scopeLinkIds.includes(scope!));
  }
  if (triage === "orphans") {
    result = result.filter((r) => eventRowIsOrphan(r));
  } else if (triage === "linked") {
    result = result.filter((r) => !eventRowIsOrphan(r) && r.lifecycleStatus !== "archived");
  } else if (triage === "archived") {
    result = result.filter((r) => r.lifecycleStatus === "archived");
  }
  if (when === "upcoming") result = result.filter((r) => r.isUpcoming);
  else if (when === "past") result = result.filter((r) => !r.isUpcoming);

  return sortV2EventRows(result, when);
}

export function parseV2EventTriageTab(value: string | undefined): V2EventTriageTab {
  if (value === "orphans" || value === "orphan" || value === "empty") return "orphans";
  if (value === "linked") return "linked";
  if (value === "archived") return "archived";
  return "all";
}

export function parseV2EventWhenTab(value: string | undefined): V2EventWhenTab {
  if (value === "upcoming" || value === "past") return value;
  return "all";
}

/**
 * Resolve browse params. Legacy `?tab=upcoming|past` becomes `when`;
 * new `?tab=orphans|linked|archived` is triage.
 */
export function resolveV2EventBrowseParams(tab: string | undefined, when: string | undefined): {
  triage: V2EventTriageTab;
  when: V2EventWhenTab;
} {
  if (tab === "upcoming" || tab === "past") {
    return { triage: "all", when: tab };
  }
  return {
    triage: parseV2EventTriageTab(tab),
    when: parseV2EventWhenTab(when),
  };
}

/** @deprecated Prefer `parseV2EventWhenTab` / `resolveV2EventBrowseParams`. */
export function parseV2EventTab(value: string | undefined): V2EventTab {
  return parseV2EventWhenTab(value);
}

export function groupV2EventRows(rows: V2EventRow[]): { label: string; rows: V2EventRow[] }[] {
  const upcoming = rows.filter((r) => r.isUpcoming);
  const past = rows.filter((r) => !r.isUpcoming);
  const groups: { label: string; rows: V2EventRow[] }[] = [];
  if (upcoming.length > 0) groups.push({ label: "Upcoming", rows: upcoming });
  if (past.length > 0) groups.push({ label: "Past", rows: past });
  return groups;
}
