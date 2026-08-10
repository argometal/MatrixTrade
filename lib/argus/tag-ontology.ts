/**
 * ARGUS Tag ontology (ORDER 001) — typed roles over one reusable infra.
 * Trackers are flags (`ArgusData.signalTags`), not a TagRole.
 */

import { referenceKindFromNotes } from "./reference-types";
import type { ArgusData, Entity, Log } from "./types";

export type TagRole = "project" | "topic" | "event" | "global" | "evidence";

export type TagKey = string;

export type ScopedTag = {
  key: TagKey;
  display: string;
  role: TagRole;
};

export const TAG_ROLES: TagRole[] = ["project", "topic", "event", "global", "evidence"];

export function normalizeTagDisplay(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function tagKey(raw: string): TagKey {
  return normalizeTagDisplay(raw).toLowerCase();
}

export function normalizeTagList(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const display = normalizeTagDisplay(raw);
    if (!display) continue;
    const key = tagKey(display);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function isTopicBinder(entity: Entity): boolean {
  return !entity.deletedAt && referenceKindFromNotes(entity.notes ?? "") === "topic";
}

export function isEventBinder(entity: Entity): boolean {
  return !entity.deletedAt && referenceKindFromNotes(entity.notes ?? "") === "event";
}

/**
 * Read tags for a role with legacy fallback.
 * Event `linkedTags` are NOT Event Tags (legacy Signals → signalTags).
 */
export function readTagsForRole(
  data: ArgusData,
  role: TagRole,
  scope?: { entityId?: string; logIds?: string[] }
): string[] {
  if (role === "global") {
    return normalizeTagList(data.globalTags);
  }

  if (role === "evidence") {
    return readEvidenceTags(data, scope);
  }

  const entityId = scope?.entityId;
  if (!entityId) return [];
  const entity = data.entities.find((e) => e.id === entityId && !e.deletedAt);
  if (!entity) return [];

  if (role === "topic") {
    if (!isTopicBinder(entity)) return [];
    return normalizeTagList(entity.topicTags?.length ? entity.topicTags : entity.linkedTags);
  }

  if (role === "project") {
    if (entity.type !== "project") return [];
    return normalizeTagList(entity.projectTags?.length ? entity.projectTags : entity.linkedTags);
  }

  if (role === "event") {
    if (!isEventBinder(entity)) return [];
    // Never fall back to linkedTags (legacy Signals).
    return normalizeTagList(entity.eventTags);
  }

  return [];
}

function readEvidenceTags(
  data: ArgusData,
  scope?: { entityId?: string; logIds?: string[] }
): string[] {
  const logs = visibleLogs(data);
  const scoped = scope?.entityId
    ? logs.filter((log) => log.entityIds.includes(scope.entityId!))
    : scope?.logIds
      ? logs.filter((log) => scope.logIds!.includes(log.id))
      : logs;

  const seen = new Set<string>();
  const out: string[] = [];
  for (const log of scoped) {
    for (const raw of log.topics ?? []) {
      const display = normalizeTagDisplay(raw);
      if (!display) continue;
      const key = tagKey(display);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(display);
    }
  }
  for (const item of data.inboxItems ?? []) {
    if (item.deletedAt) continue;
    if (scope?.entityId && !(item.linkedEntityIds ?? []).includes(scope.entityId)) continue;
    for (const raw of item.topics ?? []) {
      const display = normalizeTagDisplay(raw);
      if (!display) continue;
      const key = tagKey(display);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(display);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function visibleLogs(data: ArgusData): Log[] {
  return (data.logs ?? []).filter((l) => !l.deletedAt);
}

/** Patch fields for writing binder tags (dual-write Topic/Project legacy). */
export function binderTagWritePatch(
  entity: Entity,
  role: "project" | "topic" | "event",
  tags: string[]
): Partial<Entity> {
  const normalized = normalizeTagList(tags);
  if (role === "topic") {
    return { topicTags: normalized, linkedTags: normalized };
  }
  if (role === "project") {
    return { projectTags: normalized, linkedTags: normalized };
  }
  return { eventTags: normalized };
}

export type TagBucketOptions = {
  role: TagRole;
  /** Binder or evidence scope (entity id). */
  scopeId?: string;
  includePrivate?: boolean;
};

/**
 * Role-aware tag buckets for pickers.
 * Evidence + scopeId → tags used on that binder's Notes first, then vocabulary in-scope.
 */
export function collectTagsForBuckets(
  data: ArgusData,
  options: TagBucketOptions
): { recent: string[]; all: string[] } {
  const { role, scopeId } = options;
  if (role === "evidence" && scopeId) {
    const scoped = readTagsForRole(data, "evidence", { entityId: scopeId });
    const universe = readTagsForRole(data, "evidence");
    return {
      recent: scoped.slice(0, 12),
      all: uniqueMerge(scoped, universe),
    };
  }
  if (role === "global") {
    const all = readTagsForRole(data, "global");
    return { recent: all.slice(0, 12), all };
  }
  if ((role === "topic" || role === "project" || role === "event") && scopeId) {
    const scoped = readTagsForRole(data, role, { entityId: scopeId });
    return { recent: scoped.slice(0, 12), all: scoped };
  }
  // Unscoped role list across all binders of that kind
  const all = collectAllBinderTags(data, role);
  return { recent: all.slice(0, 12), all };
}

function collectAllBinderTags(data: ArgusData, role: TagRole): string[] {
  if (role === "global") return readTagsForRole(data, "global");
  if (role === "evidence") return readTagsForRole(data, "evidence");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entity of data.entities) {
    if (entity.deletedAt) continue;
    const tags = readTagsForRole(data, role, { entityId: entity.id });
    for (const t of tags) {
      const key = tagKey(t);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function uniqueMerge(primary: string[], secondary: string[]): string[] {
  const seen = new Set(primary.map(tagKey));
  const out = [...primary];
  for (const t of secondary) {
    const key = tagKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function countTagsByRole(data: ArgusData): Record<TagRole, number> {
  return {
    project: collectAllBinderTags(data, "project").length,
    topic: collectAllBinderTags(data, "topic").length,
    event: collectAllBinderTags(data, "event").length,
    global: readTagsForRole(data, "global").length,
    evidence: readTagsForRole(data, "evidence").length,
  };
}
