import type { ArgusData, Entity, EntityContextSlice, Log } from "./types";

function logsForEntity(logs: Log[], entityId: string): Log[] {
  return logs.filter((l) => l.entityIds.includes(entityId));
}

/** Co-occurring entity IDs on shared journal entries (relationship graph). */
export function getRelatedEntityIds(
  data: ArgusData,
  entityId: string,
  includePrivate: boolean
): string[] {
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  const related = new Set<string>();
  for (const log of logsForEntity(visibleLogs, entityId)) {
    for (const id of log.entityIds) {
      if (id !== entityId) related.add(id);
    }
  }
  return [...related].sort();
}

/**
 * Context slices: group co-mentioned company/project entities by calendar year.
 * Example: Mike + SLB in 2026, Mike + Exxon in 2028 — entity Mike stays stable.
 */
export function buildEntityContextTimeline(
  data: ArgusData,
  entityId: string,
  includePrivate: boolean
): EntityContextSlice[] {
  const entity = data.entities.find((e) => e.id === entityId);
  if (!entity) return [];

  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  const linked = logsForEntity(visibleLogs, entityId).sort((a, b) => a.date.localeCompare(b.date));

  const byYear = new Map<number, { coIds: Set<string>; logIds: string[] }>();

  for (const log of linked) {
    const year = parseInt(log.date.slice(0, 4), 10);
    if (Number.isNaN(year)) continue;
    const bucket = byYear.get(year) ?? { coIds: new Set<string>(), logIds: [] };
    bucket.logIds.push(log.id);
    for (const id of log.entityIds) {
      if (id === entityId) continue;
      const co = data.entities.find((e) => e.id === id);
      if (co && co.type !== "person") bucket.coIds.add(id);
      else if (co && co.type === "person" && entity.type !== "person") bucket.coIds.add(id);
    }
    byYear.set(year, bucket);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  return years.map((year, index) => {
    const bucket = byYear.get(year)!;
    const nextYear = years[index + 1];
    return {
      periodStart: `${year}-01-01`,
      periodEnd: nextYear ? `${nextYear - 1}-12-31` : undefined,
      coEntityIds: [...bucket.coIds],
      logIds: bucket.logIds,
    };
  });
}

export function formatContextLabel(entity: Entity, coEntities: Entity[]): string {
  if (coEntities.length === 0) return "";
  return coEntities.map((e) => e.name).join(", ");
}
