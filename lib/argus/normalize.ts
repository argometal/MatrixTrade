import type { ArgusData, Entity, Log } from "./types";

export function normalizeLog(log: Log): Log {
  return {
    ...log,
    kind: log.kind ?? "log",
    topics: log.topics ?? [],
  };
}

export function normalizeArgusData(data: ArgusData): ArgusData {
  return {
    ...data,
    logs: (data.logs ?? []).map(normalizeLog),
    entities: data.entities ?? [],
    inboxItems: data.inboxItems ?? [],
    attachments: data.attachments ?? [],
    version: 3,
  };
}
