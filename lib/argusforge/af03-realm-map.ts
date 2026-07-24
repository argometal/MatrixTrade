/**
 * CHANGE 24-17 — Argus Realm Treemap + molecular graph helpers.
 * Provisional formulas only — not final MTA / recurrence scoring.
 * Replaces 24-0F Home placement and 24-12 assumptions.
 */

import {
  UNASSIGNED_REALM_ID,
  type Af03ChaosDeck,
  type Af03Folder,
  type Af03RepoState,
  type OperationalView,
} from "./af03-repo-types";
import type { ArgusGraphState } from "./argus-graph-types";
import type { ActivityLevel, MolecularAffinity } from "./af03-realm-molecular";

const DAY_MS = 86_400_000;

/** Focus | Active | Archive — filters over the same Realm set (no copies). */
export type RealmLifecycleFilter = "focus" | "active" | "archive";

export type RealmMetrics = {
  fragmentCount: number;
  deckCount: number;
  relationCount: number;
  recurrenceCount: number;
  /** Provisional mass before visual normalization */
  rawWeight: number;
  /** log/sqrt visual weight */
  visualWeight: number;
  /** 0..1 freshness — color channel only */
  freshness: number;
  lastActivityAt: string | null;
  massScore: number;
};

export type RealmTreeNode = {
  id: string;
  title: string;
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
  /** Thicker edge = stronger / more recurrent (provisional). */
  relationStrength: number;
  confirmationState: "confirmed" | "suggested";
};

export type DeckNodeMetrics = {
  fragmentCount: number;
  relationCount: number;
  recurrenceCount: number;
  confirmedRecurrenceCount: number;
  inboundReferenceCount: number;
  confirmedEvidenceCount: number;
  /** Provisional importance/mass — not raw Fragment count. */
  massScore: number;
  rawWeight: number;
  visualWeight: number;
  freshness: number;
  lastActivityAt: string | null;
  lastUsedAt: string | null;
  openCount: number;
  activityLevel: ActivityLevel;
  affinityIds: string[];
  affinityScore: number | null;
  affinityReason: string | null;
  affinityCount: number;
  /** Future MTA placeholders (safe null defaults). */
  recurrenceScore: number | null;
  decayScore: number | null;
  suggestedClusterId: string | null;
  suggestionState: "none" | "suggested" | "confirmed" | "rejected";
};

/**
 * CHANGE 24-17 provisional mass — importance, not raw dump volume.
 * Low weight on Fragment count; higher on recurrence, relations, inbound refs, confirmed evidence.
 * log1p so 500 low-value fragments cannot dominate.
 */
export function computeMassScore(input: {
  fragmentCount: number;
  relationCount: number;
  openRecurrence: number;
  confirmedRecurrence: number;
  inboundReferences: number;
  confirmedEvidence: number;
}): number {
  const fragmentTerm = Math.log1p(input.fragmentCount) * 0.35;
  const recurrenceTerm = input.confirmedRecurrence * 2.2 + input.openRecurrence * 1.0;
  const relationTerm = input.relationCount * 1.5;
  const inboundTerm = input.inboundReferences * 1.8;
  const evidenceTerm = input.confirmedEvidence * 0.8;
  const raw =
    fragmentTerm + recurrenceTerm + relationTerm + inboundTerm + evidenceTerm;
  return Math.max(1, Math.log1p(raw) * 3.2);
}

export function visualWeightFromRaw(raw: number): number {
  return Math.max(1, Math.sqrt(Math.max(0, raw)));
}

/**
 * Freshness 0..1 — color = recent use only (not type/importance).
 * Half-life ~14 days. Provisional.
 */
export function freshnessFromTimestamps(isos: Array<string | null | undefined>): number {
  const times = isos
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .map((s) => Date.parse(s))
    .filter((n) => Number.isFinite(n));
  if (times.length === 0) return 0.15;
  const latest = Math.max(...times);
  const ageDays = Math.max(0, (Date.now() - latest) / DAY_MS);
  return Math.min(1, Math.max(0.12, Math.exp(-ageDays / 14)));
}

export function activityLevelFromFreshness(freshness: number): ActivityLevel {
  if (freshness >= 0.72) return "active";
  if (freshness >= 0.45) return "breathing";
  return "still";
}

function unitIdsForDeck(graph: ArgusGraphState, deckId: string): Set<string> {
  return new Set(graph.units.filter((u) => u.chaosDeckId === deckId).map((u) => u.id));
}

export function deckMetrics(
  deck: Af03ChaosDeck,
  state: Af03RepoState,
  graph: ArgusGraphState | null,
  affinities: MolecularAffinity[] = []
): DeckNodeMetrics {
  const fragmentCount = state.items.filter((i) => i.deckId === deck.id).length;
  let relationCount = 0;
  let openRecurrence = 0;
  let confirmedRecurrence = 0;
  let inboundReferences = 0;
  let confirmedEvidence = 0;

  if (graph) {
    const unitIds = unitIdsForDeck(graph, deck.id);
    relationCount = graph.relations.filter(
      (r) => unitIds.has(r.sourceUnitId) || unitIds.has(r.targetUnitId)
    ).length;
    for (const c of graph.recurrence) {
      if (!c.unitIds.some((id) => unitIds.has(id))) continue;
      if (c.status === "confirmed") confirmedRecurrence += 1;
      else if (c.status === "open") openRecurrence += 1;
    }
    for (const r of graph.relations) {
      const targetDeck = graph.units.find((u) => u.id === r.targetUnitId)?.chaosDeckId;
      const sourceDeck = graph.units.find((u) => u.id === r.sourceUnitId)?.chaosDeckId;
      if (targetDeck === deck.id && sourceDeck && sourceDeck !== deck.id) {
        inboundReferences += 1;
      }
    }
    confirmedEvidence = graph.units.filter(
      (u) => u.chaosDeckId === deck.id && u.confirmed
    ).length;
  }

  const massScore = computeMassScore({
    fragmentCount,
    relationCount,
    openRecurrence,
    confirmedRecurrence,
    inboundReferences,
    confirmedEvidence,
  });

  const itemLatest = state.items
    .filter((i) => i.deckId === deck.id)
    .map((i) => i.updatedAt);
  const lastUsedAt =
    [deck.lastOpenedAt, deck.updatedAt, ...itemLatest]
      .filter((s): s is string => !!s)
      .sort()
      .at(-1) ?? null;
  const freshness = freshnessFromTimestamps([
    deck.lastOpenedAt,
    deck.updatedAt,
    ...itemLatest,
  ]);
  const myAffinities = affinities.filter(
    (a) =>
      a.confirmationState !== "rejected" &&
      a.deckIds.includes(deck.id)
  );
  const primary = myAffinities[0] ?? null;

  return {
    fragmentCount,
    relationCount,
    recurrenceCount: openRecurrence + confirmedRecurrence,
    confirmedRecurrenceCount: confirmedRecurrence,
    inboundReferenceCount: inboundReferences,
    confirmedEvidenceCount: confirmedEvidence,
    massScore,
    rawWeight: massScore,
    visualWeight: visualWeightFromRaw(massScore),
    freshness,
    lastActivityAt: lastUsedAt,
    lastUsedAt,
    openCount: deck.openCount ?? 0,
    activityLevel: activityLevelFromFreshness(freshness),
    affinityIds: myAffinities.map((a) => a.id),
    affinityScore: primary?.affinityScore ?? null,
    affinityReason: primary?.affinityReason ?? null,
    affinityCount: myAffinities.length,
    recurrenceScore: null,
    decayScore: null,
    suggestedClusterId: primary?.id ?? null,
    suggestionState:
      primary?.confirmationState === "confirmed"
        ? "confirmed"
        : primary?.confirmationState === "rejected"
          ? "rejected"
          : primary
            ? "suggested"
            : "none",
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

function aggregateRealmMetrics(
  decks: Af03ChaosDeck[],
  state: Af03RepoState,
  graph: ArgusGraphState | null,
  extraTimestamps: Array<string | null | undefined>
): RealmMetrics {
  let fragmentCount = 0;
  let relationCount = 0;
  let recurrenceCount = 0;
  let massSum = 0;
  const activity: Array<string | null | undefined> = [...extraTimestamps];
  for (const deck of decks) {
    const m = deckMetrics(deck, state, graph);
    fragmentCount += m.fragmentCount;
    relationCount += m.relationCount;
    recurrenceCount += m.recurrenceCount;
    massSum += m.massScore;
    activity.push(m.lastActivityAt);
  }
  const massScore = Math.max(1, massSum);
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
    rawWeight: massScore,
    visualWeight: visualWeightFromRaw(massScore),
    freshness: freshnessFromTimestamps(activity),
    lastActivityAt,
    massScore,
  };
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
 * Build Realm forest for one operational slice (active | archive).
 * Focus filter currently shows active Realms (pending Focus intelligence).
 */
export function buildRealmForest(
  state: Af03RepoState,
  graph: ArgusGraphState | null,
  filter: RealmLifecycleFilter
): RealmTreeNode[] {
  const view: OperationalView = filter === "archive" ? "archive" : "active";
  const roots: RealmTreeNode[] = [];

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

  const unassignedDecks = state.decks.filter(
    (d) => d.folderId === null && d.view === view
  );
  if (unassignedDecks.length > 0 || (roots.length === 0 && filter !== "focus")) {
    const metrics = aggregateRealmMetrics(unassignedDecks, state, graph, [
      ...unassignedDecks.map((d) => d.lastOpenedAt),
      ...unassignedDecks.map((d) => d.updatedAt),
    ]);
    roots.unshift({
      id: UNASSIGNED_REALM_ID,
      title: "Unassigned",
      synthetic: true,
      view,
      folder: null,
      metrics,
      children: [],
    });
  }

  // Focus: same Active Realms for now (pending Focus layer) — no duplication.
  return roots;
}

/** @deprecated use buildRealmForest — kept for transitional imports. */
export function buildHomeRealmForest(
  state: Af03RepoState,
  graph: ArgusGraphState | null
): RealmTreeNode[] {
  return buildRealmForest(state, graph, "active");
}

/** Nested treemap via alternating slice. */
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

/**
 * Freshness → fill (Argus V2KnowledgeTreemap palette).
 * Active ≈ emerald-500 (#10b981); idle → zinc. Color = recent use only.
 */
export function freshnessToFill(freshness: number, archived: boolean): string {
  const t = Math.min(1, Math.max(0, freshness));
  if (archived) {
    const g = Math.round(36 + t * 28);
    return `rgb(${g}, ${Math.round(g + 4)}, ${Math.round(g + 6)})`;
  }
  // Match Argus activityColor: high = rgba(16,185,129), mid = rgba(52,211,153), low = zinc
  if (t >= 0.55) {
    const u = (t - 0.55) / 0.45;
    const r = Math.round(16 + (52 - 16) * (1 - u));
    const g = Math.round(185 + (211 - 185) * (1 - u) * 0.35);
    const b = Math.round(129 + (153 - 129) * (1 - u) * 0.35);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (t >= 0.25) {
    const u = (t - 0.25) / 0.3;
    // zinc-600 → emerald-400 soft
    const r = Math.round(63 + (52 - 63) * u);
    const g = Math.round(63 + (211 - 63) * u);
    const b = Math.round(70 + (153 - 70) * u);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const u = t / 0.25;
  const g = Math.round(39 + (63 - 39) * u);
  return `rgb(${g}, ${g}, ${Math.round(g + 4)})`;
}

/** Freshness → border (emerald, not ochre). */
export function freshnessToBorder(freshness: number): string {
  const t = Math.min(1, Math.max(0, freshness));
  const a = 0.28 + t * 0.55;
  return `rgba(16, 185, 129, ${a.toFixed(2)})`;
}

export function realmHref(realmId: string): string {
  return `/forge/realm/${realmId}`;
}

export function isUnassignedRealm(realmId: string): boolean {
  return realmId === UNASSIGNED_REALM_ID;
}

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

/** Explicit Chaos Deck ↔ Chaos Deck links from Argus unit relations. */
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

  type Acc = {
    id: string;
    sourceDeckId: string;
    targetDeckId: string;
    type: string;
    confirmedCount: number;
    total: number;
  };
  const acc = new Map<string, Acc>();

  for (const r of graph.relations) {
    const a = unitToDeck.get(r.sourceUnitId);
    const b = unitToDeck.get(r.targetUnitId);
    if (!a || !b || a === b) continue;
    const key = `${a}->${b}:${r.type}`;
    const cur = acc.get(key) ?? {
      id: `decklink_${a}_${b}_${r.type}`,
      sourceDeckId: a,
      targetDeckId: b,
      type: r.type,
      confirmedCount: 0,
      total: 0,
    };
    cur.total += 1;
    if (r.confirmed) cur.confirmedCount += 1;
    acc.set(key, cur);
  }

  return [...acc.values()].map((l) => {
    const confirmed = l.confirmedCount > 0 && l.confirmedCount === l.total;
    return {
      id: l.id,
      sourceDeckId: l.sourceDeckId,
      targetDeckId: l.targetDeckId,
      type: l.type,
      confirmed,
      relationStrength: Math.min(8, l.total),
      confirmationState: confirmed ? ("confirmed" as const) : ("suggested" as const),
    };
  });
}

/**
 * Structural affinity placeholders from nested sub-Realms (not formal relations).
 * Does not invent MTA scores. Does not write Argus edges.
 */
export function structuralAffinitiesForRealm(
  state: Af03RepoState,
  realmId: string
): MolecularAffinity[] {
  if (isUnassignedRealm(realmId)) return [];
  const decks = listDecksForRealm(state, realmId);
  const byCluster = new Map<string, string[]>();
  const labels = new Map<string, string>();
  for (const d of decks) {
    const { clusterId, label } = deckClusterKey(state, realmId, d);
    if (clusterId === "direct") continue;
    const list = byCluster.get(clusterId) ?? [];
    list.push(d.id);
    byCluster.set(clusterId, list);
    labels.set(clusterId, label);
  }
  const t = new Date().toISOString();
  const out: MolecularAffinity[] = [];
  for (const [cid, ids] of byCluster) {
    if (ids.length < 2) continue;
    out.push({
      id: `aff_struct_${realmId}_${cid}`,
      realmId,
      deckIds: ids,
      affinityScore: null,
      affinityReason: `Nested under sub-Realm “${labels.get(cid) ?? cid}” — affinity placeholder, not a confirmed relation`,
      confirmationState: "provisional",
      source: "structural",
      createdAt: t,
      recurrenceScore: null,
      decayScore: null,
      suggestedClusterId: cid,
      suggestionState: "suggested",
    });
  }
  return out;
}

/** Deterministic proximity layout: clusters as local molecules. */
export function molecularDefaultPosition(
  clusterIndex: number,
  withinCluster: number,
  affinityMateOffset = 0
): { x: number; y: number } {
  const cx = 80 + clusterIndex * 320;
  const cy = 80 + Math.floor(withinCluster / 3) * 200;
  const angle = (withinCluster + affinityMateOffset) * 1.1;
  const radius = 36 + withinCluster * 8;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + withinCluster * 110 + Math.sin(angle) * (radius * 0.35),
  };
}

export function getRealmTitle(state: Af03RepoState, realmId: string): string {
  if (isUnassignedRealm(realmId)) return "Unassigned";
  return state.folders.find((f) => f.id === realmId)?.title ?? "Realm";
}
