import type { ArgusData } from "../types";
import { entitiesByKind } from "../v2/hierarchy";
import type { ExportScopeType } from "./types";

export type ExportScopeEntityOption = {
  id: string;
  name: string;
  subtitle?: string;
};

export function buildExportScopeEntityOptions(data: ArgusData): Record<ExportScopeType, ExportScopeEntityOption[]> {
  const kinds = entitiesByKind(data);
  const mapOption = (entity: { id: string; name: string; alias?: string }) => ({
    id: entity.id,
    name: entity.name,
    subtitle: entity.alias?.trim() || undefined,
  });

  return {
    person: kinds.people.map(mapOption).sort((a, b) => a.name.localeCompare(b.name)),
    organization: kinds.organizations.map(mapOption).sort((a, b) => a.name.localeCompare(b.name)),
    project: kinds.projects.map(mapOption).sort((a, b) => a.name.localeCompare(b.name)),
    topic: kinds.topics.map(mapOption).sort((a, b) => a.name.localeCompare(b.name)),
    event: kinds.events.map(mapOption).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
