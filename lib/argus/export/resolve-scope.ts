import type { ArgusData, Entity } from "../types";
import { referenceKindFromNotes } from "../reference-types";
import type { ExportScope, ExportScopeType } from "./types";

export function scopeTypeForEntity(entity: Entity): ExportScopeType | null {
  if (entity.type === "person") return "person";
  if (entity.type === "company") return "organization";
  if (entity.type === "project") return "project";
  const kind = referenceKindFromNotes(entity.notes ?? "");
  if (kind === "topic") return "topic";
  if (kind === "event") return "event";
  return null;
}

export function resolveExportScope(
  data: ArgusData,
  scopeType: ExportScopeType,
  scopeId: string
): { entity: Entity; scope: ExportScope } | null {
  const entity = data.entities.find((e) => e.id === scopeId && !e.deletedAt);
  if (!entity) return null;

  const resolvedType = scopeTypeForEntity(entity);
  if (resolvedType !== scopeType) return null;

  return {
    entity,
    scope: { type: scopeType, id: entity.id, name: entity.name },
  };
}
