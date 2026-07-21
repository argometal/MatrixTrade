import type { EntityLifecycleStatus } from "../types";
import type { TagPattern } from "./tag-patterns";

export type V2EventTab = "all" | "upcoming" | "past";

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
  description: string;
  linkedTags: string[];
  chronicleCount: number;
  attendeeInitials: string[];
  attendeeNames: string[];
  attendeeCount: number;
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  topicCount: number;
  linkedEntityIds: string[];
  linkedEntries: V2EventEntry[];
  relatedEmails: V2EventEmail[];
  evidence: V2EventEvidenceItem[];
  lifecycleStatus?: EntityLifecycleStatus;
  hasPrivateEvidence: boolean;
  deleteRequiresAuthenticator: boolean;
  tagPatterns: TagPattern[];
}

export function buildV2EventTabCounts(rows: V2EventRow[]) {
  return {
    all: rows.length,
    upcoming: rows.filter((r) => r.isUpcoming).length,
    past: rows.filter((r) => !r.isUpcoming).length,
  };
}

export function filterV2EventRows(rows: V2EventRow[], tab: V2EventTab, entityId?: string): V2EventRow[] {
  let result = rows;
  if (entityId) {
    result = result.filter((row) => row.scopeLinkIds.includes(entityId));
  }
  if (tab === "all") return result;
  if (tab === "upcoming") return result.filter((r) => r.isUpcoming);
  return result.filter((r) => !r.isUpcoming);
}

export function parseV2EventTab(value: string | undefined): V2EventTab {
  if (value === "upcoming" || value === "past") return value;
  return "all";
}

export function groupV2EventRows(rows: V2EventRow[]): { label: string; rows: V2EventRow[] }[] {
  const upcoming = rows.filter((r) => r.isUpcoming);
  const past = rows.filter((r) => !r.isUpcoming);
  const groups: { label: string; rows: V2EventRow[] }[] = [];
  if (upcoming.length > 0) groups.push({ label: "Upcoming", rows: upcoming });
  if (past.length > 0) groups.push({ label: "Past", rows: past });
  return groups;
}
