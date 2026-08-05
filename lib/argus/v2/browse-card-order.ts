/** Client-side card order for browse grids/boards (per browser). */

export type BrowseCardOrderMap = Record<string, string[]>;

const STORAGE_KEY = "argus-v2-browse-card-order-v1";

export function readBrowseCardOrder(scope: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BrowseCardOrderMap;
    const list = parsed[scope];
    return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeBrowseCardOrder(scope: string, order: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as BrowseCardOrderMap) : {};
    parsed[scope] = order;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* quota */
  }
}

export function applyBrowseOrder<T extends { id: string }>(rows: T[], order: string[]): T[] {
  if (order.length === 0) return rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const next: T[] = [];
  for (const id of order) {
    const row = byId.get(id);
    if (row) {
      next.push(row);
      byId.delete(id);
    }
  }
  for (const row of byId.values()) next.push(row);
  return next;
}

export function placeInBrowseOrder(
  order: string[],
  entityId: string,
  beforeId: string | null,
  knownIds: string[]
): string[] {
  const base = order.filter((id) => knownIds.includes(id));
  for (const id of knownIds) {
    if (!base.includes(id)) base.push(id);
  }
  const without = base.filter((id) => id !== entityId);
  if (!beforeId || !without.includes(beforeId)) {
    without.push(entityId);
    return without;
  }
  without.splice(without.indexOf(beforeId), 0, entityId);
  return without;
}
