import type { ArgusData, Entity, Log } from "./types";

function logsForEntity(logs: Log[], entityId: string): Log[] {
  return logs.filter((l) => l.entityIds.includes(entityId));
}

function topicsForEntity(logs: Log[]): string[] {
  const set = new Set<string>();
  for (const log of logs) {
    for (const t of log.topics) {
      if (t.trim()) set.add(t.trim());
    }
  }
  return [...set].sort();
}

export function getGlobalTopics(data: ArgusData, includePrivate: boolean): string[] {
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  return topicsForEntity(visibleLogs);
}

export function getUpcomingFollowUps(data: ArgusData, includePrivate: boolean, limit = 10): Log[] {
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  return visibleLogs
    .filter((l) => l.kind === "follow_up")
    .sort((a, b) => {
      const da = a.followUpDate ?? a.date;
      const db = b.followUpDate ?? b.date;
      return da.localeCompare(db);
    })
    .slice(0, limit);
}

export function getEntityHistory(
  data: ArgusData,
  entityId: Entity["id"],
  includePrivate: boolean
): Log[] {
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  return logsForEntity(visibleLogs, entityId).sort((a, b) => b.date.localeCompare(a.date));
}
