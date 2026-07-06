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

export interface V2EventDetail {
  id: string;
  name: string;
  dateTimeLabel: string;
  meetingUrl?: string;
  projectName?: string;
  projectHref?: string;
  topicTags: string[];
  linkedTopicNames: string[];
  description: string;
  attendeeInitials: string[];
  attendeeCount: number;
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  topicCount: number;
  linkedEntityIds: string[];
  linkedEntries: V2EventEntry[];
  relatedEmails: V2EventEmail[];
}

export function buildV2EventTabCounts(rows: V2EventRow[]) {
  return {
    all: rows.length,
    upcoming: rows.filter((r) => r.isUpcoming).length,
    past: rows.filter((r) => !r.isUpcoming).length,
  };
}

export function filterV2EventRows(rows: V2EventRow[], tab: V2EventTab): V2EventRow[] {
  if (tab === "all") return rows;
  if (tab === "upcoming") return rows.filter((r) => r.isUpcoming);
  return rows.filter((r) => !r.isUpcoming);
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
