/**
 * CHANGE 24-0F — Realm MapTree metrics + treemap layout + deck-graph helpers.
 * Provisional formulas only — not final recurrence / MTA scoring.
 */

import {
  UNASSIGNED_REALM_ID,
  type Af03ChaosDeck,
  type Af03Folder,
  type Af03RepoState,
  type OperationalView,
} from "./af03-repo-types";
import type { ArgusGraphState } from "./argus-graph-types";

const DAY_MS = 86_400_000;

export type RealmMetrics = {
  fragmentCount: number;
  deckCount: number;
  relationCount: number;
  recurrenceCount: number;
  /** Raw mass before visual normalization */
  rawWeight: number;
  /** sqrt-normalized visual weight (min 1) */
  visualWeight: number;
  /** 0..1 freshness — recent activity → stronger */
  freshness: number;
  lastActivityAt: string | null;
};

export type RealmTreeNode = {
  id: string;
  title: string;
  /** true for provisional Unassigned */
  synthetic: boolean;
  view: OperationalView;
  folder: Af03Folder | null;
  metrics: RealmMetrics;
  children: RealmTreeNode[];
};

export type TreemapRect = {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  node: RealmTreeNode;
};

export type DeckGraphLink = {
  id: string;
  sourceDeckId: string;
  targetDeckId: string;
  type: string;
  confirmed: boolean;
};

export type DeckNodeMetrics = {
  fragmentCount: number;
  relationCount: number;
  recurrenceCount: number;
  rawWeight: number;
  visualWeight: number;
  freshness: number;
  lastActivityAt: string | null;
  openCount: number;
};

/** Provisional size: fragments + relations + recurrence; floor 1. */
export function deckRawWeight(
  deck: Af03ChaosDeck,
  state: Af03RepoState,
  graph: ArgusGraphState | null
): number {
  const fragments = state.items.filter((i) => i.deckId === deck.id).length;
  let relations = 0;
  let recurrence = 0;
  if (graph) {
    const unitIds = new Set(
      graph.units.filter((u) => u.chaosDeckId === deck.id).map((u) => u.id)
    );
    relations = graph.relations.filter(
      (r) => unitIds.has(r.sourceUnitId) || unitIds.has(r.targetUnitId)
    ).length;
    recurrence = graph.recurrence.filter(
      (c) => c.status === "open" && c.unitIds.some((id) => unitIds.has(id))
    ).length;
  }
  // Provisional — not final recurrence scoring (24-0F).
  return Math.max(1, fragments + relations + recurrence);
}

/** Cap dominance: sqrt so one junk deck cannot own the plane. */
export function visualWeightFromRaw(raw: number): number {
  return Math.max(1, Math.sqrt(Math.max(0, raw)));
}

/**
 * Provisional freshness 0..1 from ISO timestamps (edit/open/capture proxies).
 * Half-life ~14 days. Not final color semantics.
 */
export function freshnessFromTimestamps(isos: Array<string | null | undefined>): number {
  const times = isos
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .map((s) => Date.parse(s))
    .filter((n) => Number.isFinite(n));
  if (times.length === 0) return 0.15;
  const latest = Math.max(...times);
  const ageDays = Math.max(0, (Date.now() - latest) / DAY_MS);
  const score = Math.exp(-ageDays / 14);
  return Math.min(1, Math.max(0.12, score));
}

export function deckMetrics(
  deck: Af03ChaosDeck,
  state: Af03RepoState,
  graph: ArgusGraphState | null
): DeckNodeMetrics {
  const fragmentCount = state.items.filter((i) => i.deckId === deck.id).length;
  const rawWeight = deckRawWeight(deck, state, graph);
  let relationCount = 0;
  let recurrenceCount = 0;
  if (graph) {
    const unitIds = new Set(
      graph.units.filter((u) => u.chaosDeckId === deck.id).map((u) => u.id)
    );
    relationCount = graph.relations.filter(
      (r) => unitIds.has(r.sourceUnitId) || unitIds.has(r.targetUnitId)
    ).length;
    recurrenceCount = graph.recurrence.filter(
      (c) => c.status === "open" && c.unitIds.some((id) => unitIds.has(id))
    ).length;
  }
  const itemLatest = state.items
    .filter((i) => i.deckId === deck.id)
    .map((i) => i.updatedAt);
  const lastActivityAt =
    [deck.lastOpenedAt, deck.updatedAt, ...itemLatest]
      .filter((s): s is string => !!s)
      .sort()
      .at(-1) ?? null;
  return {
    fragmentCount,
    relationCount,
    recurrenceCount,
    rawWeight,
    visualWeight: visualWeightFromRaw(rawWeight),
    freshness: freshnessFromTimestamps([
      deck.lastOpenedAt,
      deck.updatedAt,
      ...itemLatest,
    ]),
    lastActivityAt,
    openCount: deck.openCount ?? 0,
  };
}

function folderDescendantIds(state: Af03RepoState, folderId: string): Set<string> {
  const ids = new Set<string>([folderId]);
  const walk = (pid: string) => {
    for (const f of state.folders) {
      if (f.parentId === pid && !ids.has(f.id)) {
        ids.add(f.id);
        walk(f.id);
      }
    }
  };
  walk(folderId);
  return ids;
}

function decksInFolderSubtree(
  state: Af03RepoState,
  folderId: string,
  view: OperationalView
): Af03ChaosDeck[] {
  const ids = folderDescendantIds(state, folderId);
  return state.decks.filter((d) => d.view === view && d.folderId && ids.has(d.folderId));
}

function realmMetricsForFolder(
  state: Af03RepoState,
  folder: Af03Folder,
  graph: ArgusGraphState | null
): RealmMetrics {
  const decks = decksInFolderSubtree(state, folder.id, folder.view);
  return aggregateRealmMetrics(decks, state, graph, [
    folder.lastOpenedAt,
    folder.updatedAt,
    ...decks.map((d) => d.lastOpenedAt),
    ...decks.map((d) => d.updatedAt),
  ]);
}

function aggregateRealmMetrics(
  decks: Af03ChaosDeck[],
  state: Af03RepoState,
  graph: ArgusGraphState | null,
  extraTimestamps: Array<string | null | undefined>
): RealmMetrics {
  let fragmentCount = 0;
  let relationCount = 0;
  let recurrenceCount = 0;
  const activity: Array<string | null | undefined> = [...extraTimestamps];
  for (const deck of decks) {
    const m = deckMetrics(deck, state, graph);
    fragmentCount += m.fragmentCount;
    relationCount += m.relationCount;
    recurrenceCount += m.recurrenceCount;
    activity.push(m.lastActivityAt);
  }
  // Provisional realm mass — fragments + relations + recurrence.
  const rawWeight = Math.max(1, fragmentCount + relationCount + recurrenceCount);
  const lastActivityAt =
    activity
      .filter((s): s is string => !!s)
      .sort()
      .at(-1) ?? null;
  return {
    fragmentCount,
    deckCount: decks.length,
    relationCount,
    recurrenceCount,
    rawWeight,
    visualWeight: visualWeightFromRaw(rawWeight),
    freshness: freshnessFromTimestamps(activity),
    lastActivityAt,
  };
}

function buildChildTree(
  state: Af03RepoState,
  parentId: string,
  view: OperationalView,
  graph: ArgusGraphState | null
): RealmTreeNode[] {
  return state.folders
    .filter((f) => f.view === view && f.parentId === parentId)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((folder) => ({
      id: folder.id,
      title: folder.title,
      synthetic: false,
      view: folder.view,
      folder,
      metrics: realmMetricsForFolder(state, folder, graph),
      children: buildChildTree(state, folder.id, view, graph),
    }));
}

/**
 * Home MapTree roots: top-level folders as Realms + Unassigned for root decks.
 * Includes active and archive roots (filter hooks later for Focus/Active/Archive).
 */
export function buildHomeRealmForest(
  state: Af03RepoState,
  graph: ArgusGraphState | null
): RealmTreeNode[] {
  const roots: RealmTreeNode[] = [];

  for (const view of ["active", "archive"] as OperationalView[]) {
    const top = state.folders
      .filter((f) => f.view === view && f.parentId === null)
      .sort((a, b) => a.title.localeCompare(b.title));
    for (const folder of top) {
      roots.push({
        id: folder.id,
        title: folder.title,
        synthetic: false,
        view: folder.view,
        folder,
        metrics: realmMetricsForFolder(state, folder, graph),
        children: buildChildTree(state, folder.id, view, graph),
      });
    }
  }

  const unassignedDecks = state.decks.filter((d) => d.folderId === null);
  if (unassignedDecks.length > 0 || roots.length === 0) {
    const metrics = aggregateRealmMetrics(unassignedDecks, state, graph, [
      ...unassignedDecks.map((d) => d.lastOpenedAt),
      ...unassignedDecks.map((d) => d.updatedAt),
    ]);
    roots.unshift({
      id: UNASSIGNED_REALM_ID,
      title: "Unassigned",
      synthetic: true,
      view: "active",
      folder: null,
      metrics,
      children: [],
    });
  }

  return roots;
}

/** Nested treemap via alternating slice (simple, stable). */
export function layoutTreemap(
  nodes: RealmTreeNode[],
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 0,
  vertical = w >= h
): TreemapRect[] {
  if (nodes.length === 0 || w < 1 || h < 1) return [];

  const weights = nodes.map((n) => Math.max(1, n.metrics.visualWeight));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const out: TreemapRect[] = [];
  let cursor = 0;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const frac = weights[i]! / total;
    let bx: number;
    let by: number;
    let bw: number;
    let bh: number;
    if (vertical) {
      bw = w * frac;
      bh = h;
      bx = x + cursor;
      by = y;
      cursor += bw;
    } else {
      bw = w;
      bh = h * frac;
      bx = x;
      by = y + cursor;
      cursor += bh;
    }

    const pad = 2;
    const ix = bx + pad;
    const iy = by + pad;
    const iw = Math.max(0, bw - pad * 2);
    const ih = Math.max(0, bh - pad * 2);

    if (n.children.length > 0) {
      const header = Math.min(30, Math.max(20, ih * 0.16));
      // Header strip = this Realm (clickable); children fill remainder.
      out.push({
        id: n.id,
        title: n.title,
        x: ix,
        y: iy,
        w: iw,
        h: header,
        depth,
        node: n,
      });
      out.push(
        ...layoutTreemap(
          n.children,
          ix,
          iy + header + 2,
          iw,
          Math.max(0, ih - header - 2),
          depth + 1,
          !vertical
        )
      );
    } else {
      out.push({
        id: n.id,
        title: n.title,
        x: ix,
        y: iy,
        w: iw,
        h: ih,
        depth,
        node: n,
      });
    }
  }

  return out;
}

/** Freshness → CSS-ish color (provisional palette). */
export function freshnessToFill(freshness: number, archived: boolean): string {
  const t = Math.min(1, Math.max(0, freshness));
  if (archived) {
    const g = Math.round(30 + t * 40);
    return `rgb(${g}, ${g}, ${Math.round(g * 1.05)})`;
  }
  // Muted zinc → warm amber intensity
  const r = Math.round(24 + t * 160);
  const g = Math.round(24 + t * 90);
  const b = Math.round(28 + t * 20);
  return `rgb(${r}, ${g}, ${b})`;
}

export function freshnessToBorder(freshness: number): string {
  const t = Math.min(1, Math.max(0, freshness));
  const a = 0.25 + t * 0.55;
  return `rgba(251, 191, 36, ${a.toFixed(2)})`;
}

export function realmHref(realmId: string): string {
  return `/forge/realm/${realmId}`;
}

export function isUnassignedRealm(realmId: string): boolean {
  return realmId === UNASSIGNED_REALM_ID;
}

/** Decks shown in a Realm graph (direct + nested under folder; Unassigned = root). */
export function listDecksForRealm(
  state: Af03RepoState,
  realmId: string
): Af03ChaosDeck[] {
  if (isUnassignedRealm(realmId)) {
    return state.decks
      .filter((d) => d.folderId === null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const folder = state.folders.find((f) => f.id === realmId);
  if (!folder) return [];
  return decksInFolderSubtree(state, folder.id, folder.view).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

/** Cluster key for sub-Realm grouping (immediate folder under opened realm, or self). */
export function deckClusterKey(
  state: Af03RepoState,
  realmId: string,
  deck: Af03ChaosDeck
): { clusterId: string; label: string } {
  if (isUnassignedRealm(realmId) || !deck.folderId) {
    return { clusterId: "direct", label: "In this Realm" };
  }
  if (deck.folderId === realmId) {
    return { clusterId: "direct", label: "In this Realm" };
  }
  // Walk up to child of opened realm
  let cur = state.folders.find((f) => f.id === deck.folderId);
  let childOfRealm: Af03Folder | undefined;
  while (cur) {
    if (cur.parentId === realmId) {
      childOfRealm = cur;
      break;
    }
    if (cur.id === realmId) break;
    cur = cur.parentId ? state.folders.find((f) => f.id === cur!.parentId) : undefined;
  }
  if (childOfRealm) {
    return { clusterId: childOfRealm.id, label: childOfRealm.title };
  }
  const folder = state.folders.find((f) => f.id === deck.folderId);
  return {
    clusterId: deck.folderId,
    label: folder?.title ?? "Sub-Realm",
  };
}

/** Aggregate unit-level Argus relations into Chaos Deck ↔ Chaos Deck links. */
export function deckLinksForRealm(
  state: Af03RepoState,
  realmId: string,
  graph: ArgusGraphState | null
): DeckGraphLink[] {
  if (!graph) return [];
  const decks = new Set(listDecksForRealm(state, realmId).map((d) => d.id));
  const unitToDeck = new Map(
    graph.units
      .filter((u) => u.chaosDeckId && decks.has(u.chaosDeckId))
      .map((u) => [u.id, u.chaosDeckId!] as const)
  );
  const seen = new Set<string>();
  const links: DeckGraphLink[] = [];
  for (const r of graph.relations) {
    const a = unitToDeck.get(r.sourceUnitId);
    const b = unitToDeck.get(r.targetUnitId);
    if (!a || !b || a === b) continue;
    const key = `${a}->${b}:${r.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      id: `decklink_${r.id}`,
      sourceDeckId: a,
      targetDeckId: b,
      type: r.type,
      confirmed: r.confirmed,
    });
  }
  return links;
}

export function getRealmTitle(state: Af03RepoState, realmId: string): string {
  if (isUnassignedRealm(realmId)) return "Unassigned";
  return state.folders.find((f) => f.id === realmId)?.title ?? "Realm";
}
