import type { V2EntityTab } from "@/lib/argus/v2/loaders";

export type EntityBoardColumnId = "active" | "recent" | "quiet";

export type EntityViewPrefs = {
  /** Per-tab ordered entity ids (cards + within-column board order). */
  orderByTab: Partial<Record<V2EntityTab, string[]>>;
  /** Manual board column placement (overrides activity bucket). */
  columnById: Record<string, EntityBoardColumnId>;
};

const STORAGE_KEY = "argus-v2-entity-view-prefs-v1";

const EMPTY: EntityViewPrefs = { orderByTab: {}, columnById: {} };

export function readEntityViewPrefs(): EntityViewPrefs {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<EntityViewPrefs>;
    return {
      orderByTab: parsed.orderByTab && typeof parsed.orderByTab === "object" ? parsed.orderByTab : {},
      columnById: parsed.columnById && typeof parsed.columnById === "object" ? parsed.columnById : {},
    };
  } catch {
    return EMPTY;
  }
}

export function writeEntityViewPrefs(prefs: EntityViewPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

export function applyEntityOrder<T extends { id: string }>(
  rows: T[],
  order: string[] | undefined
): T[] {
  if (!order || order.length === 0) return rows;
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

export function placeEntityInOrder(
  order: string[] | undefined,
  entityId: string,
  beforeId: string | null,
  knownIds: string[]
): string[] {
  const base = (order ?? knownIds).filter((id) => knownIds.includes(id));
  for (const id of knownIds) {
    if (!base.includes(id)) base.push(id);
  }
  const without = base.filter((id) => id !== entityId);
  if (!beforeId || !without.includes(beforeId)) {
    without.push(entityId);
    return without;
  }
  const index = without.indexOf(beforeId);
  without.splice(index, 0, entityId);
  return without;
}
