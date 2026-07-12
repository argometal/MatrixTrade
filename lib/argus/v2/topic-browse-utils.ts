import { TAG_PATTERN_FRESHNESS_DAYS } from "../tag-limits";
import { evidenceTagsMatchFilter, textMatchesBrowseQuery } from "./browse-filter-utils";
import type { V2EvidenceStreamItem } from "./evidence-stream";
import type { EntityLifecycleStatus } from "../types";
import type { V2TimelineEntry } from "./mock-data";
import type { TagPattern } from "./tag-patterns";

export type V2TopicTab = "all" | "active" | "empty" | "patterns";

export type V2TopicEvidenceKind = "email" | "journal" | "file";

export interface V2TopicFilters {
  q?: string;
  tag?: string;
  org?: string;
  project?: string;
  entity?: string;
  kind?: V2TopicEvidenceKind;
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
  aliases: string[];
  evidenceTags: string[];
  patternCount: number;
  linkedOrgIds: string[];
  linkedProjectIds: string[];
  linkedEntityIds: string[];
  searchText: string;
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
  lifecycleStatus?: EntityLifecycleStatus;
  hasPrivateEvidence: boolean;
  deleteRequiresAuthenticator: boolean;
  evidence: V2EvidenceStreamItem[];
  timeline: V2TimelineEntry[];
  tagPatterns: TagPattern[];
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

export function buildV2TopicTabCounts(rows: V2TopicRow[]) {
  const cutoff = activeCutoffIso();
  return {
    all: rows.length,
    active: rows.filter((r) => r.evidenceCount > 0 && r.lastSort.slice(0, 10) >= cutoff).length,
    empty: rows.filter((r) => r.evidenceCount === 0).length,
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
    result = result.filter((r) => r.evidenceCount > 0 && r.lastSort.slice(0, 10) >= cutoff);
  } else if (tab === "empty") {
    result = result.filter((r) => r.evidenceCount === 0);
  } else if (tab === "patterns") {
    result = result.filter((r) => r.patternCount > 0);
  }

  if (filters.q) {
    result = result.filter((row) =>
      textMatchesBrowseQuery(filters.q!, [row.name, row.searchText, ...row.aliases])
    );
  }
  if (filters.tag) {
    result = result.filter((row) =>
      evidenceTagsMatchFilter(row.evidenceTags, row.aliases, row.name, filters.tag!)
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

  return result;
}

export function parseV2TopicTab(value: string | undefined): V2TopicTab {
  if (value === "active" || value === "empty" || value === "patterns") return value;
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

  return filters;
}

export function hasActiveV2TopicFilters(filters: V2TopicFilters): boolean {
  return Boolean(filters.q || filters.tag || filters.org || filters.project || filters.entity || filters.kind);
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
