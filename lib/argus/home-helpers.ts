import type { Entity, InboxItem, Log } from "./types";
import { getProjectHomeCounts } from "./project-evidence-scope";

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

export function countActiveProjects(projects: HomeProjectSummary[]): number {
  return projects.filter((p) => p.linkedCount > 0).length;
}
