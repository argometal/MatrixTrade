export type V2RecentEntityKind =
  | "organization"
  | "project"
  | "topic"
  | "event"
  | "contact"
  | "runbook";

export type V2RecentEntity = {
  id: string;
  kind: V2RecentEntityKind;
  label: string;
  href: string;
  visitedAt: number;
};

export const V2_RECENT_ENTITIES_KEY = "argus-v2-recent-entities";
export const V2_RECENT_ENTITIES_EVENT = "argus-v2-recent-updated";
const MAX_RECENT = 6;

export const V2_RECENT_ENTITY_ICONS: Record<V2RecentEntityKind, string> = {
  organization: "🏢",
  project: "📁",
  topic: "🏷",
  event: "📅",
  contact: "👤",
  runbook: "📋",
};

export function readRecentEntities(): V2RecentEntity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(V2_RECENT_ENTITIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as V2RecentEntity[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function recordRecentEntity(entry: Omit<V2RecentEntity, "visitedAt">) {
  if (typeof window === "undefined") return;
  try {
    const current = readRecentEntities().filter((item) => !(item.id === entry.id && item.kind === entry.kind));
    const next: V2RecentEntity[] = [{ ...entry, visitedAt: Date.now() }, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(V2_RECENT_ENTITIES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(V2_RECENT_ENTITIES_EVENT));
  } catch {
    /* ignore */
  }
}
