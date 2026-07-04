import type { ArgusData, Entity, InboxItem, Log } from "./types";
import { referenceKindFromNotes } from "./reference-types";
import { getLinkedInboxForEntity } from "./entity-evidence";
import { getProjectHomeCounts } from "./project-evidence";
import { buildEntityIntelligence, type EntityIntelligence } from "./network-intelligence";

export type HomeActivityItem =
  | { type: "entity"; entity: Entity; at: string }
  | { type: "log"; log: Log; at: string };

export function buildHomeActivityFeed(
  entities: Entity[],
  logs: Log[],
  limit: number
): HomeActivityItem[] {
  const items: HomeActivityItem[] = [
    ...entities.map((entity) => ({ type: "entity" as const, entity, at: entity.updatedAt })),
    ...logs.map((log) => ({
      type: "log" as const,
      log,
      at: log.updatedAt || log.createdAt || log.date,
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export interface HomeProjectSummary {
  entity: Entity;
  logCount: number;
  inboxCount: number;
  linkedCount: number;
}

export interface HomeNetworkSummary {
  intelligence: EntityIntelligence;
  logCount: number;
  inboxCount: number;
  linkedCount: number;
}

export function buildHomeProjectSummaries(
  entities: Entity[],
  logs: Log[],
  inboxItems: InboxItem[],
  includePrivate: boolean
): HomeProjectSummary[] {
  return entities
    .filter((e) => e.type === "project")
    .map((entity) => {
      const counts = getProjectHomeCounts(entity, logs, inboxItems, includePrivate);
      return { entity, ...counts };
    })
    .sort((a, b) => b.linkedCount - a.linkedCount || a.entity.name.localeCompare(b.entity.name));
}

export function buildHomeNetworkSummaries(
  data: ArgusData,
  entities: Entity[],
  inboxItems: InboxItem[],
  includePrivate: boolean,
  today: string,
  limit: number
): HomeNetworkSummary[] {
  return entities
    .filter((e) => {
      if (e.type === "person" || e.type === "company") return true;
      if (e.type === "other") {
        const kind = referenceKindFromNotes(e.notes);
        return kind === "topic" || kind === "event";
      }
      return false;
    })
    .map((entity) => {
      const intelligence = buildEntityIntelligence(data, entity, includePrivate, today);
      const inboxCount = getLinkedInboxForEntity(inboxItems, entity.id, includePrivate).length;
      return {
        intelligence,
        logCount: intelligence.logCount,
        inboxCount,
        linkedCount: intelligence.logCount + inboxCount,
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
