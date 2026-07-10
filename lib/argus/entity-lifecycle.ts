import type { Entity } from "./types";

export type EntityLifecycleStatus = "active" | "completed" | "archived";

const LEGACY_ARCHIVED_RE = /\bstatus:\s*archived\b/i;

/** Legacy notes hack — migrated into lifecycleStatus on read. */
export function legacyArchivedFromNotes(notes: string): boolean {
  return LEGACY_ARCHIVED_RE.test(notes);
}

export function resolveEntityLifecycleStatus(entity: Entity, today?: string): EntityLifecycleStatus {
  if (entity.deletedAt) return "archived";
  if (entity.lifecycleStatus) return entity.lifecycleStatus;
  if (legacyArchivedFromNotes(entity.notes ?? "")) return "archived";

  if (entity.type === "project" && today) {
    const end = entity.endDate?.slice(0, 10);
    if (end && end < today) return "completed";
  }

  return "active";
}

export function isEntityArchived(entity: Entity, today?: string): boolean {
  return resolveEntityLifecycleStatus(entity, today) === "archived";
}

/** Active + completed count toward metrics; archived and soft-deleted do not. */
export function isEntityActiveForMetrics(entity: Entity, today?: string): boolean {
  if (entity.deletedAt) return false;
  const status = resolveEntityLifecycleStatus(entity, today);
  return status === "active" || status === "completed";
}

export function activeEntitiesForMetrics(data: { entities: Entity[] }, today?: string): Entity[] {
  const day = today ?? new Date().toISOString().slice(0, 10);
  return data.entities.filter((e) => isEntityActiveForMetrics(e, day));
}
