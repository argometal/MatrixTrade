export type V2TopicTab = "all" | "mine" | "followed";

export interface V2TopicRow {
  id: string;
  name: string;
  category: string;
  orgCount: number;
  projectCount: number;
  peopleCount: number;
  lastActivity: string;
  lastSort: string;
  entryCount: number;
  tagHints: string[];
}

export interface V2TopicEntry {
  id: string;
  title: string;
  kind: "Log" | "Note" | "Follow-up";
  meta: string;
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
  linkedEntityIds: string[];
  recentEntries: V2TopicEntry[];
}

export interface V2TopicTagChip {
  name: string;
  count: number;
}

export function buildV2TopicTabCounts(rows: V2TopicRow[]) {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const cutoff = monthAgo.toISOString().slice(0, 10);
  return {
    all: rows.length,
    mine: rows.filter((r) => r.entryCount > 0).length,
    followed: rows.filter((r) => r.lastSort.slice(0, 10) >= cutoff).length,
  };
}

export function filterV2TopicRows(rows: V2TopicRow[], tab: V2TopicTab): V2TopicRow[] {
  if (tab === "all") return rows;
  if (tab === "mine") return rows.filter((r) => r.entryCount > 0);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const cutoff = monthAgo.toISOString().slice(0, 10);
  return rows.filter((r) => r.lastSort.slice(0, 10) >= cutoff);
}

export function parseV2TopicTab(value: string | undefined): V2TopicTab {
  if (value === "mine" || value === "followed") return value;
  return "all";
}
