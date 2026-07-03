import type { ArgusData, Entity, JournalKind, Log } from "./types";

const FAVORITES_KEY = "argus-favorite-entities";

export function inferJournalKind(opts: {
  followUpDate?: string;
  eventDate?: string;
  kindOverride?: JournalKind;
}): JournalKind {
  if (opts.kindOverride) return opts.kindOverride;
  if (opts.followUpDate?.trim()) return "follow_up";
  if (opts.eventDate?.trim()) return "event";
  return "log";
}

export function resolveLogDate(kind: JournalKind, eventDate: string, today: string): string {
  if (kind === "event" && eventDate.trim()) return eventDate.slice(0, 10);
  return today;
}

export interface EntityPickerBuckets {
  recent: Entity[];
  frequent: Entity[];
  alphabetical: Entity[];
}

export function buildEntityPickerBuckets(data: ArgusData, includePrivate: boolean): EntityPickerBuckets {
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  const entityMap = new Map(data.entities.map((e) => [e.id, e]));

  const recentIds: string[] = [];
  const seenRecent = new Set<string>();
  for (const log of [...visibleLogs].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const id of log.entityIds) {
      if (!seenRecent.has(id) && entityMap.has(id)) {
        seenRecent.add(id);
        recentIds.push(id);
      }
      if (recentIds.length >= 12) break;
    }
    if (recentIds.length >= 12) break;
  }

  const counts = new Map<string, number>();
  for (const log of visibleLogs) {
    for (const id of log.entityIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const frequentIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => entityMap.has(id))
    .slice(0, 12);

  const alphabetical = [...data.entities].sort((a, b) => a.name.localeCompare(b.name));

  return {
    recent: recentIds.map((id) => entityMap.get(id)!),
    frequent: frequentIds.map((id) => entityMap.get(id)!),
    alphabetical,
  };
}

export function getUpcomingEvents(logs: Log[], today: string, limit: number): Log[] {
  return logs
    .filter((l) => l.kind === "event" && l.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function getUpcomingFollowUps(logs: Log[], today: string, limit: number): Log[] {
  return logs
    .filter((l) => {
      const touch = l.followUpDate ?? (l.kind === "follow_up" ? l.date : undefined);
      return touch && touch >= today;
    })
    .sort((a, b) => {
      const da = a.followUpDate ?? a.date;
      const db = b.followUpDate ?? b.date;
      return da.localeCompare(db);
    })
    .slice(0, limit);
}

/** First line of body, max 60 chars — used when title omitted at capture. */
export function autoTitleFromBody(body: string): string {
  const line = body.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return "Untitled record";
  if (line.length <= 60) return line;
  return `${line.slice(0, 57)}...`;
}

export function getRecentActivity(logs: Log[], limit: number): Log[] {
  return [...logs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

export function getMemoryStream(logs: Log[], limit: number): Log[] {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export function getUpcomingReminders(logs: Log[], today: string, limit: number): Log[] {
  return getUpcomingFollowUps(logs, today, limit);
}

export function getNeedsClassificationLogs(logs: Log[], limit?: number): Log[] {
  const items = logs
    .filter((l) => l.classificationStatus === "needs_classification")
    .sort((a, b) => b.date.localeCompare(a.date));
  return limit ? items.slice(0, limit) : items;
}

export function getRecentlyAddedEntities(entities: Entity[], limit: number): Entity[] {
  return [...entities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export { FAVORITES_KEY };
