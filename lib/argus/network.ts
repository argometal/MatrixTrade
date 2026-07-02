import type { ArgusData, Entity, EntityNetworkView, Log } from "./types";
import { getRelatedEntityIds } from "./context";

function logsForEntity(logs: Log[], entityId: string): Log[] {
  return logs.filter((l) => l.entityIds.includes(entityId));
}

function lastInteractionDate(logs: Log[]): string | undefined {
  if (logs.length === 0) return undefined;
  return logs.reduce((max, l) => (l.date > max ? l.date : max), logs[0].date);
}

function nextTouchDate(logs: Log[], today: string): string | undefined {
  const reminders = logs
    .map((l) => l.followUpDate ?? (l.kind === "follow_up" ? l.date : undefined))
    .filter((d): d is string => Boolean(d))
    .sort();

  const upcoming = reminders.find((d) => d >= today);
  if (upcoming) return upcoming;
  return reminders.length > 0 ? reminders[reminders.length - 1] : undefined;
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

export function buildEntityNetworkViews(
  data: ArgusData,
  includePrivate: boolean,
  entityQuery?: string
): EntityNetworkView[] {
  const today = new Date().toISOString().slice(0, 10);
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  const q = entityQuery?.trim().toLowerCase() ?? "";

  let entities = data.entities;
  if (q) {
    entities = entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }

  return entities
    .map((entity) => {
      const linked = logsForEntity(visibleLogs, entity.id);
      const followUps = linked.filter((l) => l.followUpDate || l.kind === "follow_up");
      return {
        entity,
        lastInteraction: lastInteractionDate(linked),
        nextTouch: nextTouchDate(linked, today),
        topics: topicsForEntity(linked),
        logCount: linked.length,
        openFollowUps: followUps.filter((l) => {
          const touch = l.followUpDate ?? l.date;
          return touch >= today;
        }).length,
        relatedEntityIds: getRelatedEntityIds(data, entity.id, includePrivate),
      };
    })
    .sort((a, b) => a.entity.name.localeCompare(b.entity.name));
}

export function getGlobalTopics(data: ArgusData, includePrivate: boolean): string[] {
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  return topicsForEntity(visibleLogs);
}

export function getUpcomingFollowUps(data: ArgusData, includePrivate: boolean, limit = 10): Log[] {
  const today = new Date().toISOString().slice(0, 10);
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
