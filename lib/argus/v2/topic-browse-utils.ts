import type { V2EvidenceStreamItem } from "./evidence-stream";
import type { V2TimelineEntry } from "./mock-data";

export type V2TopicTab = "all" | "mine" | "followed";

export interface V2TopicRow {
  id: string;
  name: string;
  lastActivity: string;
  lastSort: string;
  journalCount: number;
  emailCount: number;
  fileCount: number;
  evidenceCount: number;
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
  journalCount: number;
  emailCount: number;
  fileCount: number;
  photoCount: number;
  evidenceCount: number;
  linkedEntityIds: string[];
  linkedEntities: V2TopicLinkedEntity[];
  aliases: string[];
  evidence: V2EvidenceStreamItem[];
  timeline: V2TimelineEntry[];
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
    mine: rows.filter((r) => r.evidenceCount > 0).length,
    followed: rows.filter((r) => r.lastSort.slice(0, 10) >= cutoff).length,
  };
}

export function filterV2TopicRows(rows: V2TopicRow[], tab: V2TopicTab): V2TopicRow[] {
  if (tab === "all") return rows;
  if (tab === "mine") return rows.filter((r) => r.evidenceCount > 0);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const cutoff = monthAgo.toISOString().slice(0, 10);
  return rows.filter((r) => r.lastSort.slice(0, 10) >= cutoff);
}

export function parseV2TopicTab(value: string | undefined): V2TopicTab {
  if (value === "mine" || value === "followed") return value;
  return "all";
}
