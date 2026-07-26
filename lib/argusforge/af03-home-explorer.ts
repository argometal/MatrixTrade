/**
 * CHANGE 24-1E — Home Explorer queries (search / filter / sort / builder signals).
 * Uses existing AF03 repo; no parallel tree.
 */

import type { Af03ChaosDeck, Af03Folder, Af03RepoState } from "./af03-repo-types";
import { UNASSIGNED_REALM_ID } from "./af03-repo-types";
import { folderBreadcrumb, getFolder, listChildFolders, listDecksAt } from "./af03-repo-store";

export type ExplorerStatusFilter = "all" | "active" | "archive" | "empty";
export type ExplorerSortKey =
  | "name"
  | "updated"
  | "opened"
  | "stale"
  | "fragments"
  | "status";

/** Placeholder only — never invent success. */
export type AlexandriaExplorerStatus =
  | "not_tested"
  | "export_ready"
  | "test_pending"
  | "tested"
  | "failed"
  | "incompatible";

export type DeckBuilderSignals = {
  fragmentCount: number;
  blockCount: number;
  imageBlockCount: number;
  assetCount: number;
  lastUpdated: string;
  status: "active" | "archive";
  exportAvailable: boolean;
  alexandriaStatus: AlexandriaExplorerStatus;
};

export type ExplorerSearchHit = {
  id: string;
  objectType: "realm" | "chaos_deck" | "fragment";
  title: string;
  parentRealmTitle: string;
  status: "active" | "archive";
  updatedAt: string;
  href: string;
};

export function homeExplorerHref(opts: {
  realmId?: string | null;
  status?: ExplorerStatusFilter;
  sort?: ExplorerSortKey;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.realmId) params.set("realm", opts.realmId);
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  if (opts.sort && opts.sort !== "updated") params.set("sort", opts.sort);
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  const qs = params.toString();
  return qs ? `/forge?${qs}` : "/forge";
}

export function parseExplorerStatus(raw: string | null): ExplorerStatusFilter {
  if (raw === "active" || raw === "archive" || raw === "all" || raw === "empty") {
    return raw;
  }
  return "all";
}

export function parseExplorerSort(raw: string | null): ExplorerSortKey {
  if (
    raw === "name" ||
    raw === "updated" ||
    raw === "opened" ||
    raw === "stale" ||
    raw === "fragments" ||
    raw === "status"
  ) {
    return raw;
  }
  return "updated";
}

/** Oldest / never opened first — “needs review” queue. */
function compareNeedsReview(
  aOpened: string | null | undefined,
  bOpened: string | null | undefined,
  aUpdated: string,
  bUpdated: string
): number {
  const aKey = aOpened ?? "";
  const bKey = bOpened ?? "";
  if (aKey !== bKey) return aKey.localeCompare(bKey);
  return aUpdated.localeCompare(bUpdated);
}

export function deckBuilderSignals(state: Af03RepoState, deck: Af03ChaosDeck): DeckBuilderSignals {
  const fragments = state.items.filter((i) => i.deckId === deck.id);
  const fragmentIds = new Set(fragments.map((f) => f.id));
  const blocks = (state.blocks ?? []).filter((b) => fragmentIds.has(b.fragmentId));
  const imageBlockCount = blocks.filter((b) => b.type === "image").length;
  const assetIds = new Set(
    blocks
      .filter((b) => b.type === "image")
      .map((b) => ("assetId" in b.payload ? b.payload.assetId : null))
      .filter((id): id is string => Boolean(id))
  );
  return {
    fragmentCount: fragments.length,
    blockCount: blocks.length,
    imageBlockCount,
    assetCount: assetIds.size,
    lastUpdated: deck.updatedAt,
    status: deck.view === "archive" ? "archive" : "active",
    exportAvailable: true,
    alexandriaStatus: "not_tested",
  };
}

export function alexandriaStatusLabel(status: AlexandriaExplorerStatus): string | null {
  if (status === "not_tested") return "Not tested";
  return status.replace(/_/g, " ");
}

function realmTitle(state: Af03RepoState, folderId: string | null): string {
  if (!folderId) return "Unassigned";
  return getFolder(state, folderId)?.title ?? "Realm";
}

export function listRealmsAt(
  state: Af03RepoState,
  parentId: string | null,
  status: ExplorerStatusFilter
): Af03Folder[] {
  if (status === "all" || status === "empty") {
    const active = listChildFolders(state, "active", parentId);
    const archived = listChildFolders(state, "archive", parentId);
    const all = [...active, ...archived];
    if (status === "empty") {
      return all.filter((f) => realmChaosDeckCount(state, f.id) === 0);
    }
    return all;
  }
  return listChildFolders(state, status === "archive" ? "archive" : "active", parentId);
}

export function listDecksForExplorer(
  state: Af03RepoState,
  realmId: string | null,
  status: ExplorerStatusFilter
): Af03ChaosDeck[] {
  if (status === "all" || status === "empty") {
    const all = [
      ...listDecksAt(state, "active", realmId),
      ...listDecksAt(state, "archive", realmId),
    ];
    if (status === "empty") {
      return all.filter((d) => d.contentCount === 0);
    }
    return all;
  }
  return listDecksAt(state, status === "archive" ? "archive" : "active", realmId);
}

/** Direct Chaos Decks inside a Realm (not nested child-Realm decks). */
export function realmChaosDeckCount(state: Af03RepoState, folderId: string): number {
  return state.decks.filter((d) => d.folderId === folderId).length;
}

/** Fragments in direct Chaos Decks of a Realm. */
export function realmFragmentCount(state: Af03RepoState, folderId: string): number {
  const deckIds = new Set(
    state.decks.filter((d) => d.folderId === folderId).map((d) => d.id)
  );
  return state.items.filter((i) => deckIds.has(i.deckId)).length;
}

/** Recently opened decks (never-opened excluded), newest first. */
export function recentlyOpenedDecks(state: Af03RepoState, limit = 3): Af03ChaosDeck[] {
  return [...state.decks]
    .filter((d) => Boolean(d.lastOpenedAt))
    .sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""))
    .slice(0, limit);
}

export function filterAndSortDecks(
  state: Af03RepoState,
  decks: Af03ChaosDeck[],
  sort: ExplorerSortKey
): Af03ChaosDeck[] {
  return [...decks].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.title.localeCompare(b.title);
      case "opened":
        return (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? "");
      case "stale":
        return compareNeedsReview(
          a.lastOpenedAt,
          b.lastOpenedAt,
          a.updatedAt,
          b.updatedAt
        );
      case "fragments":
        return (
          state.items.filter((i) => i.deckId === b.id).length -
          state.items.filter((i) => i.deckId === a.id).length
        );
      case "status":
        return a.view.localeCompare(b.view) || a.title.localeCompare(b.title);
      case "updated":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
}

export function filterAndSortRealms(
  realms: Af03Folder[],
  sort: ExplorerSortKey
): Af03Folder[] {
  return [...realms].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.title.localeCompare(b.title);
      case "opened":
        return (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? "");
      case "stale":
        return compareNeedsReview(
          a.lastOpenedAt,
          b.lastOpenedAt,
          a.updatedAt,
          b.updatedAt
        );
      case "status":
        return a.view.localeCompare(b.view) || a.title.localeCompare(b.title);
      case "fragments":
      case "updated":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
}

export function searchExplorer(state: Af03RepoState, query: string): ExplorerSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: ExplorerSearchHit[] = [];

  for (const folder of state.folders) {
    if (folder.title.toLowerCase().includes(q)) {
      hits.push({
        id: folder.id,
        objectType: "realm",
        title: folder.title,
        parentRealmTitle: realmTitle(state, folder.parentId),
        status: folder.view === "archive" ? "archive" : "active",
        updatedAt: folder.updatedAt,
        href: homeExplorerHref({ realmId: folder.id, status: folder.view }),
      });
    }
  }

  for (const deck of state.decks) {
    const titleHit = deck.title.toLowerCase().includes(q);
    const previewHit = deck.preview.toLowerCase().includes(q);
    if (titleHit || previewHit) {
      hits.push({
        id: deck.id,
        objectType: "chaos_deck",
        title: deck.title,
        parentRealmTitle: realmTitle(state, deck.folderId),
        status: deck.view === "archive" ? "archive" : "active",
        updatedAt: deck.updatedAt,
        href: `/forge/deck/${deck.id}`,
      });
    }
  }

  for (const item of state.items) {
    const tags = (item.tags ?? []).join(" ").toLowerCase();
    const hay = `${item.title} ${item.body} ${tags}`.toLowerCase();
    if (!hay.includes(q)) continue;
    const deck = state.decks.find((d) => d.id === item.deckId);
    hits.push({
      id: item.id,
      objectType: "fragment",
      title: item.title || "Untitled fragment",
      parentRealmTitle: deck ? realmTitle(state, deck.folderId) : "—",
      status: deck?.view === "archive" ? "archive" : "active",
      updatedAt: item.updatedAt,
      href: `/forge/deck/${item.deckId}/item/${item.id}`,
    });
  }

  return hits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 80);
}

export function explorerBreadcrumb(
  state: Af03RepoState,
  realmId: string | null
): Array<{ id: string | null; title: string }> {
  if (!realmId || realmId === UNASSIGNED_REALM_ID) {
    return [{ id: null, title: "Home" }];
  }
  const chain = folderBreadcrumb(state, realmId);
  return [{ id: null, title: "Home" }, ...chain.map((f) => ({ id: f.id, title: f.title }))];
}

export function compactHomeSummary(state: Af03RepoState): {
  realms: number;
  decks: number;
  fragments: number;
  blocks: number;
} {
  return {
    realms: state.folders.length,
    decks: state.decks.length,
    fragments: state.items.length,
    blocks: (state.blocks ?? []).length,
  };
}
