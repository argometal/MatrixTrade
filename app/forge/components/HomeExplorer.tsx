"use client";

/**
 * CHANGE 24-1E — Home primary knowledge Explorer.
 * Traditional navigation + AF semantics (Realm → Chaos Deck → Fragment → Block).
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  alexandriaStatusLabel,
  compactHomeSummary,
  deckBuilderSignals,
  explorerBreadcrumb,
  filterAndSortDecks,
  filterAndSortRealms,
  homeExplorerHref,
  listDecksForExplorer,
  listRealmsAt,
  parseExplorerSort,
  parseExplorerStatus,
  realmChaosDeckCount,
  searchExplorer,
  type ExplorerSortKey,
  type ExplorerStatusFilter,
} from "@/lib/argusforge/af03-home-explorer";
import {
  archiveDeck,
  archiveFolder,
  createDeck,
  createFolder,
  deleteDeck,
  deleteFolder,
  emptyOrSeedRepo,
  formatRelativeAgo,
  getFolder,
  homeOverview,
  levelSnapshot,
  moveDeckToFolder,
  recordRealmOpen,
  renameDeck,
  renameFolder,
  restoreDeck,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03ChaosDeck, Af03Folder, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { ForgeMoveDeckDialog } from "./ForgeMoveDeckDialog";
import { ForgeOverflowMenu } from "./ForgeOverflowMenu";
import { LevelSnapshotChart } from "./LevelSnapshotChart";

function promptTitle(label: string, initial: string): string | null {
  const value = window.prompt(label, initial);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function StatusBadge({ status }: { status: "active" | "archive" }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        status === "archive"
          ? "bg-zinc-800 text-zinc-400"
          : "bg-emerald-900/50 text-emerald-200"
      }`}
    >
      {status === "archive" ? "Archive" : "Active"}
    </span>
  );
}

function TypeIcon({ type }: { type: "realm" | "deck" }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
        type === "realm"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-zinc-800 text-zinc-200"
      }`}
      aria-hidden
    >
      {type === "realm" ? "R" : "D"}
    </span>
  );
}

export function HomeExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [queryDraft, setQueryDraft] = useState("");

  const realmId = searchParams.get("realm");
  const status = parseExplorerStatus(searchParams.get("status"));
  const sort = parseExplorerSort(searchParams.get("sort"));
  const q = searchParams.get("q") ?? "";

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, []);

  useEffect(() => {
    setQueryDraft(q);
  }, [q]);

  /** Keep Realm lastOpenedAt current when drilling in Explorer (Needs review sort). */
  useEffect(() => {
    if (!realmId) return;
    setState((prev) => recordRealmOpen(prev ?? emptyOrSeedRepo(), realmId));
  }, [realmId]);

  function pushParams(patch: {
    realmId?: string | null;
    status?: ExplorerStatusFilter;
    sort?: ExplorerSortKey;
    q?: string;
  }) {
    router.replace(
      homeExplorerHref({
        realmId: patch.realmId !== undefined ? patch.realmId : realmId,
        status: patch.status ?? status,
        sort: patch.sort ?? sort,
        q: patch.q !== undefined ? patch.q : q,
      })
    );
  }

  const currentRealm = state && realmId ? getFolder(state, realmId) : undefined;
  const crumbs = useMemo(
    () => (state ? explorerBreadcrumb(state, realmId) : [{ id: null, title: "Home" }]),
    [state, realmId]
  );

  const realms = useMemo(() => {
    if (!state || q.trim()) return [];
    return filterAndSortRealms(listRealmsAt(state, realmId, status), sort);
  }, [state, realmId, status, sort, q]);

  const decks = useMemo(() => {
    if (!state || q.trim()) return [];
    return filterAndSortDecks(state, listDecksForExplorer(state, realmId, status), sort);
  }, [state, realmId, status, sort, q]);

  const searchHits = useMemo(
    () => (state && q.trim() ? searchExplorer(state, q) : []),
    [state, q]
  );

  const summary = state ? compactHomeSummary(state) : null;
  const overview = state ? homeOverview(state) : null;
  const snapshot = state
    ? levelSnapshot(
        state,
        status === "archive" ? "archive" : "active",
        realmId
      )
    : null;

  function createRealm() {
    if (!state) return;
    const name = promptTitle("New Realm name", "New Realm");
    if (!name) return;
    const view = status === "archive" ? "archive" : "active";
    const { state: next } = createFolder(state, {
      title: name,
      parentId: realmId,
      view,
    });
    setState(next);
  }

  function createChaosDeck() {
    if (!state) return;
    const name = promptTitle("New Chaos Deck name", "New Chaos Deck");
    if (!name) return;
    const view =
      currentRealm?.view ?? (status === "archive" ? "archive" : "active");
    const { state: next, deck } = createDeck(state, {
      title: name,
      folderId: realmId,
      view,
    });
    setState(next);
    window.location.href = `/forge/deck/${deck.id}`;
  }

  const moveDeckTarget =
    state && moveDeckId ? state.decks.find((d) => d.id === moveDeckId) : undefined;

  if (!state || !summary) {
    return <p className="text-sm text-zinc-500">Loading Explorer…</p>;
  }

  if (realmId && !currentRealm) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Realm not found.
        </p>
        <Link href="/forge" className="text-sm text-emerald-300 underline">
          Back to Home Explorer
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <Af03RepoDisclosure />

      {/* 1. Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500/90">
            Home · Explorer
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
            {currentRealm ? currentRealm.title : "Knowledge Explorer"}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {summary.realms} Realms · {summary.decks} Decks · {summary.fragments} Fragments ·{" "}
            {summary.blocks} Blocks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-lg border border-zinc-700 px-3 text-sm font-medium text-zinc-100"
            onClick={createRealm}
          >
            New Realm
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 text-sm font-medium text-emerald-100"
            onClick={createChaosDeck}
          >
            New Chaos Deck
          </button>
        </div>
      </header>

      {/* 2. Search */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: queryDraft });
        }}
      >
        <label htmlFor="home-explorer-search" className="sr-only">
          Search Realms, Decks, Fragments
        </label>
        <input
          id="home-explorer-search"
          type="search"
          value={queryDraft}
          onChange={(e) => setQueryDraft(e.target.value)}
          placeholder="Search Realms, Decks, Fragments…"
          className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-lg border border-zinc-700 px-3 text-sm font-medium text-zinc-100"
        >
          Search
        </button>
      </form>

      {/* 3. Status + sort */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 text-xs text-zinc-400">
          Status
          <select
            className="min-h-9 flex-1 rounded-md border-0 bg-transparent text-sm text-zinc-100 focus:outline-none"
            value={status}
            onChange={(e) =>
              pushParams({ status: e.target.value as ExplorerStatusFilter })
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archive">Archive</option>
          </select>
        </label>
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 text-xs text-zinc-400">
          Sort
          <select
            className="min-h-9 flex-1 rounded-md border-0 bg-transparent text-sm text-zinc-100 focus:outline-none"
            value={sort}
            onChange={(e) => pushParams({ sort: e.target.value as ExplorerSortKey })}
          >
            <option value="updated">Recently updated</option>
            <option value="opened">Recently opened</option>
            <option value="stale">Needs review</option>
            <option value="name">Name</option>
            <option value="fragments">Fragment count</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      {/* 4. Breadcrumbs */}
      <nav aria-label="Realm path" className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
        {crumbs.map((c, i) => (
          <span key={`${c.id ?? "home"}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {i === crumbs.length - 1 ? (
              <span className="text-zinc-300">{c.title}</span>
            ) : (
              <button
                type="button"
                className="min-h-9 text-emerald-300/90 underline-offset-2 hover:underline"
                onClick={() => pushParams({ realmId: c.id })}
              >
                {c.title}
              </button>
            )}
          </span>
        ))}
        {!realmId ? (
          <span className="ml-1 text-zinc-600">· Unassigned decks at root</span>
        ) : null}
      </nav>

      {/* 5. Explorer / search results */}
      {q.trim() ? (
        <section aria-labelledby="search-results-heading" className="space-y-2">
          <h3 id="search-results-heading" className="text-sm font-semibold text-zinc-200">
            Search results ({searchHits.length})
          </h3>
          {searchHits.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-600">No matches.</p>
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
              {searchHits.map((hit) => (
                <li key={`${hit.objectType}-${hit.id}`}>
                  <Link
                    href={hit.href}
                    className="flex min-h-14 items-center gap-3 px-3 py-2.5 hover:bg-zinc-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
                  >
                    <TypeIcon type={hit.objectType === "realm" ? "realm" : "deck"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-zinc-100">{hit.title}</p>
                        <span className="text-[10px] uppercase text-zinc-500">
                          {hit.objectType.replace("_", " ")}
                        </span>
                        <StatusBadge status={hit.status} />
                      </div>
                      <p className="truncate text-xs text-zinc-500">
                        {hit.parentRealmTitle} · {formatRelativeAgo(hit.updatedAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-labelledby="explorer-contents-heading" className="space-y-2">
          <h3 id="explorer-contents-heading" className="text-sm font-semibold text-zinc-200">
            Contents
          </h3>
          {realms.length === 0 && decks.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-600">
              Nothing here yet. Create a Realm or Chaos Deck.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
              {realms.map((folder) => (
                <RealmRow
                  key={folder.id}
                  folder={folder}
                  chaosDeckCount={realmChaosDeckCount(state, folder.id)}
                  menuOpen={menuId === folder.id}
                  onMenuOpenChange={(open) => setMenuId(open ? folder.id : null)}
                  onOpen={() => pushParams({ realmId: folder.id })}
                  onRename={() => {
                    const name = promptTitle("Rename Realm", folder.title);
                    if (!name) return;
                    setState(renameFolder(state, folder.id, name));
                    setMenuId(null);
                  }}
                  onChildRealm={() => {
                    const name = promptTitle("Child Realm name", "New Realm");
                    if (!name) return;
                    const { state: next } = createFolder(state, {
                      title: name,
                      parentId: folder.id,
                      view: folder.view,
                    });
                    setState(next);
                    setMenuId(null);
                  }}
                  onChildDeck={() => {
                    const name = promptTitle("Chaos Deck name", "New Chaos Deck");
                    if (!name) return;
                    const { state: next, deck } = createDeck(state, {
                      title: name,
                      folderId: folder.id,
                      view: folder.view,
                    });
                    setState(next);
                    setMenuId(null);
                    window.location.href = `/forge/deck/${deck.id}`;
                  }}
                  onArchive={() => {
                    setState(archiveFolder(state, folder.id));
                    setMenuId(null);
                  }}
                  onDelete={() => {
                    const ok = window.confirm(
                      `Delete Realm “${folder.title}” and everything inside (child Realms, Decks, Fragments)? This cannot be undone.`
                    );
                    if (!ok) return;
                    setState(deleteFolder(state, folder.id));
                    setMenuId(null);
                    if (realmId === folder.id) pushParams({ realmId: null });
                  }}
                />
              ))}
              {decks.map((deck) => (
                <DeckExplorerRow
                  key={deck.id}
                  state={state}
                  deck={deck}
                  menuOpen={menuId === deck.id}
                  onMenuOpenChange={(open) => setMenuId(open ? deck.id : null)}
                  onRename={() => {
                    const name = promptTitle("Rename Chaos Deck", deck.title);
                    if (!name) return;
                    setState(renameDeck(state, deck.id, name));
                    setMenuId(null);
                  }}
                  onArchive={() => {
                    setState(archiveDeck(state, deck.id));
                    setMenuId(null);
                  }}
                  onRestore={() => {
                    setState(restoreDeck(state, deck.id));
                    setMenuId(null);
                  }}
                  onMove={() => {
                    setMenuId(null);
                    setMoveDeckId(deck.id);
                  }}
                  onDelete={() => {
                    const ok = window.confirm(
                      `Delete Chaos Deck “${deck.title}” and all its Fragments/Blocks? This cannot be undone.`
                    );
                    if (!ok) return;
                    setState(deleteDeck(state, deck.id));
                    setMenuId(null);
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 6. Optional recent */}
      {!q.trim() && overview && overview.recentDecks.length > 0 ? (
        <section aria-labelledby="recent-heading" className="space-y-2">
          <h3 id="recent-heading" className="text-sm font-semibold text-zinc-200">
            Recent Chaos Decks
          </h3>
          <ul className="flex flex-col gap-1">
            {overview.recentDecks.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/forge/deck/${d.id}`}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-zinc-800/80 px-3 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  <span className="truncate">{d.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatRelativeAgo(d.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 7. Collapsible overview metrics */}
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm font-medium text-zinc-300"
          aria-expanded={overviewOpen}
          onClick={() => setOverviewOpen((o) => !o)}
        >
          Overview metrics
          <span className="text-xs text-zinc-500">{overviewOpen ? "Hide" : "Show"}</span>
        </button>
        {overviewOpen && snapshot ? (
          <div className="border-t border-zinc-800 px-3 py-3">
            <LevelSnapshotChart snapshot={snapshot} />
            <p className="mt-2 text-[11px] text-zinc-600">
              Metrics are secondary. Explorer above is the primary surface.
            </p>
          </div>
        ) : null}
      </section>

      {state && moveDeckTarget ? (
        <ForgeMoveDeckDialog
          open={Boolean(moveDeckId)}
          state={state}
          deck={moveDeckTarget}
          onClose={() => setMoveDeckId(null)}
          onMove={(folderId) => {
            setState(moveDeckToFolder(state, moveDeckTarget.id, folderId));
            setMoveDeckId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RealmRow(props: {
  folder: Af03Folder;
  chaosDeckCount: number;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onRename: () => void;
  onChildRealm: () => void;
  onChildDeck: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { folder, chaosDeckCount } = props;
  return (
    <li className="relative flex items-stretch bg-zinc-950">
      <button
        type="button"
        onClick={props.onOpen}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-zinc-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
      >
        <TypeIcon type="realm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-zinc-100">{folder.title}</p>
            <StatusBadge status={folder.view === "archive" ? "archive" : "active"} />
          </div>
          <p className="truncate text-xs text-zinc-500">
            Realm · {chaosDeckCount} Chaos Deck{chaosDeckCount === 1 ? "" : "s"} · updated{" "}
            {formatRelativeAgo(folder.updatedAt)}
          </p>
        </div>
      </button>
      <div className="border-l border-zinc-800">
        <ForgeOverflowMenu
          open={props.menuOpen}
          onOpenChange={props.onMenuOpenChange}
          label={`Realm menu ${folder.title}`}
          items={[
            { id: "open", label: "Open", onClick: props.onOpen },
            { id: "rename", label: "Rename", onClick: props.onRename },
            { id: "child-realm", label: "New child Realm", onClick: props.onChildRealm },
            { id: "child-deck", label: "New Chaos Deck", onClick: props.onChildDeck },
            ...(folder.view === "active"
              ? [{ id: "archive", label: "Archive", onClick: props.onArchive }]
              : []),
            { id: "delete", label: "Delete…", onClick: props.onDelete, danger: true },
          ]}
        />
      </div>
    </li>
  );
}

function DeckExplorerRow(props: {
  state: Af03RepoState;
  deck: Af03ChaosDeck;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onRename: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const signals = deckBuilderSignals(props.state, props.deck);
  const alex = alexandriaStatusLabel(signals.alexandriaStatus);
  return (
    <li className="relative flex items-stretch bg-zinc-950">
      <Link
        href={`/forge/deck/${props.deck.id}`}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 hover:bg-zinc-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
      >
        <TypeIcon type="deck" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-zinc-100">{props.deck.title}</p>
            <StatusBadge status={signals.status} />
          </div>
          <p className="truncate text-xs text-zinc-500">
            {signals.fragmentCount} Fragments · {signals.blockCount} Blocks
            {signals.imageBlockCount > 0 ? ` · ${signals.imageBlockCount} images` : ""}
            {" · "}
            {formatRelativeAgo(signals.lastUpdated)}
            {signals.exportAvailable ? " · Export ready" : ""}
            {alex ? ` · ${alex}` : ""}
          </p>
        </div>
      </Link>
      <div className="border-l border-zinc-800">
        <ForgeOverflowMenu
          open={props.menuOpen}
          onOpenChange={props.onMenuOpenChange}
          label={`Deck menu ${props.deck.title}`}
          items={[
            {
              id: "open",
              label: "Open builder",
              onClick: () => {
                window.location.href = `/forge/deck/${props.deck.id}`;
              },
            },
            { id: "rename", label: "Rename", onClick: props.onRename },
            { id: "move", label: "Move…", onClick: props.onMove },
            { id: "delete", label: "Delete…", onClick: props.onDelete, danger: true },
            props.deck.view === "active"
              ? { id: "archive", label: "Archive", onClick: props.onArchive }
              : { id: "restore", label: "Restore to Active", onClick: props.onRestore },
          ]}
        />
      </div>
    </li>
  );
}
