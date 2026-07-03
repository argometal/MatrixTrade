import type { ArgusData, Entity, InboxItem, Log } from "./types";
import { buildEntityIntelligence, type EntityIntelligence } from "./network-intelligence";

export interface HomeProjectSummary {
  entity: Entity;
  logCount: number;
  inboxCount: number;
  linkedCount: number;
}

export interface HomeNetworkSummary {
  intelligence: EntityIntelligence;
  linkedCount: number;
}

export function buildHomeProjectSummaries(
  entities: Entity[],
  logs: Log[],
  inboxItems: InboxItem[]
): HomeProjectSummary[] {
  return entities
    .filter((e) => e.type === "project")
    .map((entity) => {
      const logCount = logs.filter((l) => l.entityIds.includes(entity.id)).length;
      const inboxCount = inboxItems.filter((i) => (i.linkedEntityIds ?? []).includes(entity.id)).length;
      return { entity, logCount, inboxCount, linkedCount: logCount + inboxCount };
    })
    .sort((a, b) => b.linkedCount - a.linkedCount || a.entity.name.localeCompare(b.entity.name));
}

export function buildHomeNetworkSummaries(
  data: ArgusData,
  entities: Entity[],
  includePrivate: boolean,
  today: string,
  limit: number
): HomeNetworkSummary[] {
  return entities
    .filter((e) => e.type === "person" || e.type === "company")
    .map((entity) => {
      const intelligence = buildEntityIntelligence(data, entity, includePrivate, today);
      return {
        intelligence,
        linkedCount: intelligence.logCount + intelligence.evidenceCount,
      };
    })
    .sort(
      (a, b) =>
        b.intelligence.attentionScore - a.intelligence.attentionScore ||
        (b.intelligence.lastMeaningfulInteraction ?? "").localeCompare(
          a.intelligence.lastMeaningfulInteraction ?? ""
        )
    )
    .slice(0, limit);
}

export function countActiveProjects(projects: HomeProjectSummary[]): number {
  return projects.filter((p) => p.linkedCount > 0).length;
}
