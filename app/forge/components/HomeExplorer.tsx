"use client";

/**
 * CHANGE 24-1E / 24-23 — Home primary knowledge Explorer.
 * Visual hierarchy refinement: search + contents first; metrics secondary.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  realmFragmentCount,
  recentlyOpenedDecks,
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
  levelSnapshot,
  moveDeckToFolder,
  recordRealmOpen,
  renameDeck,
  renameFolder,
  restoreDeck,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03ChaosDeck, Af03Folder, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import {
  provisionalDeckTitle,
  provisionalRealmTitle,
  AF_TEXT,
} from "@/lib/argusforge/af03-visible-ontology";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { ForgeMoveDeckDialog } from "./ForgeMoveDeckDialog";
import { ForgeOverflowMenu } from "./ForgeOverflowMenu";
import {
  LevelSnapshotChart,
  type SnapshotActionKey,
} from "./LevelSnapshotChart";

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

function TypeIcon({ type }: { type: "realm" | "deck" | "fragment" }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
        type === "realm"
          ? "bg-emerald-500/15 text-emerald-300"
          : type === "fragment"
            ? "bg-sky-500/15 text-sky-300"
            : "bg-zinc-800 text-zinc-200"
      }`}
      aria-hidden
    >
      {type === "realm" ? "R" : type === "fragment" ? "F" : "D"}
    </span>
  );
}

const STATUS_CHIPS: { id: ExplorerStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archive", label: "Archive" },
  { id: "empty", label: "Empty" },
];

const SORT_LABELS: Record<ExplorerSortKey, string> = {
  updated: "Recent",
  opened: "Opened",
  stale: "Needs review",
  name: "Name",
  fragments: "Fragments",
  status: "Status",
};

export function HomeExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [queryDraft, setQueryDraft] = useState("");
  const [snapshotFocus, setSnapshotFocus] = useState<SnapshotActionKey | null>(null);
  const [recentMenuId, setRecentMenuId] = useState<string | null>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<number | null>(null);

  const realmId = searchParams.get("realm");
  const status = parseExplorerStatus(searchParams.get("status"));
  const sort = parseExplorerSort(searchParams.get("sort"));
  const q = searchParams.get("q") ?? "";
  const showStatusBadges = status === "all" || status === "empty";

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, []);

  useEffect(() => {
    setQueryDraft(q);
  }, [q]);

  useEffect(() => {
    if (!realmId) return;
    setState((prev) => recordRealmOpen(prev ?? emptyOrSeedRepo(), realmId));
  }, [realmId]);

  useEffect(() => {
    if (!createOpen) return;
    function onDoc(e: MouseEvent) {
      if (!createRef.current?.contains(e.target as Node)) setCreateOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [createOpen]);

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

  function scheduleSearch(next: string) {
    setQueryDraft(next);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      pushParams({ q: next });
    }, 280);
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
  const recentOpened = state ? recentlyOpenedDecks(state, 3) : [];
  const snapshot = state
    ? levelSnapshot(state, status === "archive" ? "archive" : "active", realmId)
    : null;

  const repoEmpty = Boolean(state && state.folders.length === 0 && state.decks.length === 0);
  const listEmpty = !q.trim() && realms.length === 0 && decks.length === 0;

  function createRealm() {
    if (!state) return;
    const siblings = state.folders.filter((f) => f.parentId === (realmId ?? null));
    const name = provisionalRealmTitle(siblings.map((f) => f.title));
    const view = status === "archive" ? "archive" : "active";
    const { state: next } = createFolder(state, {
      title: name,
      parentId: realmId,
      view,
    });
    setState(next);
    setCreateOpen(false);
  }

  function createChaosDeck() {
    if (!state) return;
    const siblings = state.decks.filter((d) => d.folderId === (realmId ?? null));
    const name = provisionalDeckTitle(siblings.map((d) => d.title));
    const view =
      currentRealm?.view ?? (status === "archive" ? "archive" : "active");
    const { state: next, deck } = createDeck(state, {
      title: name,
      folderId: realmId,
      view,
    });
    setState(next);
    setCreateOpen(false);
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
    <div className="min-w-0 space-y-3">
      <Af03RepoDisclosure compact />

      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500/90">
            Home · Explorer
          </p>
          <h2 className="truncate text-xl font-semibold tracking-tight text-zinc-50">
            {currentRealm ? currentRealm.title : "Knowledge Explorer"}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {summary.realms} Realms · {summary.decks} Decks · {summary.fragments} Fragments ·{" "}
            {summary.blocks} Blocks
          </p>
        </div>
        <div className="relative shrink-0" ref={createRef}>
          <button
            type="button"
            aria-label="Create"
            aria-expanded={createOpen}
            onClick={() => setCreateOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-xl font-light text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            +
          </button>
          {createOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                onClick={createRealm}
              >
                New Realm
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                onClick={createChaosDeck}
              >
                New Chaos Deck
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Search */}
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          if (searchTimer.current) window.clearTimeout(searchTimer.current);
          pushParams({ q: queryDraft });
        }}
      >
        <label htmlFor="home-explorer-search" className="sr-only">
          Global Find — Fragments, Decks, Realms
        </label>
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          aria-hidden
        >
          ⌕
        </span>
        <input
          id="home-explorer-search"
          type="search"
          value={queryDraft}
          onChange={(e) => scheduleSearch(e.target.value)}
          placeholder="Find Fragments (and Decks / Realms)…"
          className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-9 pr-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        />
      </form>

      {/* Filters + sort */}
      <div className="flex items-center gap-2">
        <div
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Status filter"
        >
          {STATUS_CHIPS.map((chip) => {
            const active = status === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => pushParams({ status: chip.id })}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <label className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 ring-1 ring-zinc-800">
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(e) => pushParams({ sort: e.target.value as ExplorerSortKey })}
            className="max-w-[7.5rem] bg-transparent font-semibold text-zinc-200 focus:outline-none"
            aria-label="Sort"
          >
            <option value="updated">Recently updated</option>
            <option value="opened">Recently opened</option>
            <option value="stale">Needs review</option>
            <option value="name">Name</option>
            <option value="fragments">Fragment count</option>
            <option value="status">Status</option>
          </select>
          <span aria-hidden className="text-zinc-600">
            ▾
          </span>
        </label>
      </div>

      {/* Breadcrumbs */}
      <nav
        aria-label="Realm path"
        className="flex flex-wrap items-center gap-1 text-xs text-zinc-500"
      >
        {realmId ? (
          <button
            type="button"
            aria-label="Back"
            className="mr-1 min-h-8 rounded-md px-1.5 text-emerald-300/90 hover:bg-zinc-900"
            onClick={() => {
              const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2]! : null;
              pushParams({ realmId: parent?.id ?? null });
            }}
          >
            ←
          </button>
        ) : null}
        {crumbs.map((c, i) => (
          <span key={`${c.id ?? "home"}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {i === crumbs.length - 1 ? (
              <span className="text-zinc-300">{c.title}</span>
            ) : (
              <button
                type="button"
                className="min-h-8 text-emerald-300/90 underline-offset-2 hover:underline"
                onClick={() => pushParams({ realmId: c.id })}
              >
                {c.title}
              </button>
            )}
          </span>
        ))}
        {!realmId ? <span className="text-zinc-600">· Unassigned Decks</span> : null}
      </nav>

      {/* Contents / search */}
      {q.trim() ? (
        <section aria-labelledby="search-results-heading" className="space-y-2">
          <h3 id="search-results-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Search results · {searchHits.length}
          </h3>
          {searchHits.length === 0 ? (
            <EmptyPanel
              title="No matching Fragments, Decks, or Realms"
              primaryLabel="Clear search"
              onPrimary={() => {
                setQueryDraft("");
                pushParams({ q: "" });
              }}
              secondaryLabel="Reset filters"
              onSecondary={() => pushParams({ status: "all", sort: "updated", q: "" })}
            />
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
              {searchHits.map((hit) => (
                <li key={`${hit.objectType}-${hit.id}`}>
                  <Link
                    href={hit.href}
                    className="flex min-h-14 items-center gap-3 px-3 py-2.5 hover:bg-zinc-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
                  >
                    <TypeIcon
                      type={
                        hit.objectType === "realm"
                          ? "realm"
                          : hit.objectType === "fragment"
                            ? "fragment"
                            : "deck"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-zinc-100">{hit.title}</p>
                        {hit.objectType === "fragment" ? (
                          <span className="shrink-0 rounded-full border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            Viewer
                          </span>
                        ) : null}
                        {showStatusBadges ? <StatusBadge status={hit.status} /> : null}
                      </div>
                      <p className="truncate text-xs text-zinc-500">
                        {hit.objectType === "fragment" && hit.deckTitle
                          ? `In ${hit.deckTitle} · provenance · ${formatRelativeAgo(hit.updatedAt)}`
                          : `${hit.parentRealmTitle} · ${formatRelativeAgo(hit.updatedAt)}`}
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
          <h3
            id="explorer-contents-heading"
            className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {realmId ? "Contents" : "Home · Root"}
          </h3>
          {listEmpty ? (
            repoEmpty ? (
              <EmptyPanel
                title="Your Explorer is empty"
                primaryLabel="+ New Realm"
                onPrimary={createRealm}
                secondaryLabel="+ New Chaos Deck"
                onSecondary={createChaosDeck}
              />
            ) : (
              <EmptyPanel
                title="No matching Realms or Chaos Decks"
                primaryLabel="Clear search"
                onPrimary={() => {
                  setQueryDraft("");
                  pushParams({ q: "" });
                }}
                secondaryLabel="Reset filters"
                onSecondary={() => pushParams({ status: "all", sort: "updated" })}
              />
            )
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
              {realms.map((folder) => (
                <RealmRow
                  key={folder.id}
                  folder={folder}
                  chaosDeckCount={realmChaosDeckCount(state, folder.id)}
                  fragmentCount={realmFragmentCount(state, folder.id)}
                  showBadge={showStatusBadges}
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
                    const siblings = state.folders.filter((f) => f.parentId === folder.id);
                    const name = provisionalRealmTitle(siblings.map((f) => f.title));
                    const { state: next } = createFolder(state, {
                      title: name,
                      parentId: folder.id,
                      view: folder.view,
                    });
                    setState(next);
                    setMenuId(null);
                  }}
                  onChildDeck={() => {
                    const siblings = state.decks.filter((d) => d.folderId === folder.id);
                    const name = provisionalDeckTitle(siblings.map((d) => d.title));
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
                  showBadge={showStatusBadges}
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

      {/* Recently opened — compact, not a duplicate Contents list */}
      {!q.trim() && !repoEmpty && recentOpened.length > 0 ? (
        <section aria-labelledby="recent-opened-heading" className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3
              id="recent-opened-heading"
              className={`text-xs font-semibold uppercase tracking-wide ${AF_TEXT.metadata}`}
            >
              Recently opened
            </h3>
            <button
              type="button"
              className="text-[11px] font-medium text-emerald-400/90"
              onClick={() => pushParams({ sort: "opened", status: "all" })}
            >
              View all
            </button>
          </div>
          <ul className="flex flex-col gap-0.5">
            {recentOpened.map((d) => (
              <li key={d.id} className="flex items-center gap-1 rounded-lg hover:bg-zinc-900">
                <Link
                  href={`/forge/deck/${d.id}`}
                  className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-1.5 text-sm text-zinc-300"
                >
                  <TypeIcon type="deck" />
                  <span className="min-w-0 flex-1 truncate">{d.title}</span>
                  <span className={`shrink-0 text-[11px] ${AF_TEXT.disabled}`}>
                    {formatRelativeAgo(d.lastOpenedAt ?? d.updatedAt)}
                  </span>
                </Link>
                <ForgeOverflowMenu
                  open={recentMenuId === d.id}
                  onOpenChange={(open) => setRecentMenuId(open ? d.id : null)}
                  label={`Actions for ${d.title}`}
                  triggerClassName="flex h-10 w-10 items-center justify-center text-zinc-400 hover:text-zinc-100"
                  items={[
                    {
                      id: "open",
                      label: "Open",
                      onClick: () => {
                        window.location.href = `/forge/deck/${d.id}`;
                      },
                    },
                    {
                      id: "move",
                      label: "Move…",
                      onClick: () => {
                        setMoveDeckId(d.id);
                        setRecentMenuId(null);
                      },
                    },
                    {
                      id: "rename",
                      label: "Rename…",
                      onClick: () => {
                        const name = promptTitle("Rename Chaos Deck", d.title);
                        if (!name) return;
                        setState(renameDeck(state, d.id, name));
                        setRecentMenuId(null);
                      },
                    },
                    {
                      id: "archive",
                      label: d.view === "archive" ? "Already archived" : "Archive",
                      onClick: () => {
                        if (d.view === "archive") return;
                        setState(archiveDeck(state, d.id));
                        setRecentMenuId(null);
                      },
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Overview metrics — collapsed, secondary */}
      {!repoEmpty ? (
        <section className="rounded-lg border border-zinc-800/70">
          <button
            type="button"
            className={`flex min-h-10 w-full items-center justify-between px-3 text-left text-xs font-medium ${AF_TEXT.metadata}`}
            aria-expanded={overviewOpen}
            onClick={() => setOverviewOpen((o) => !o)}
          >
            Overview metrics
            <span>{overviewOpen ? "Hide" : "Show"}</span>
          </button>
          {overviewOpen && snapshot ? (
            <div className="border-t border-zinc-800 px-3 py-2">
              <LevelSnapshotChart
                snapshot={snapshot}
                activeAction={snapshotFocus}
                onClear={() => {
                  setSnapshotFocus(null);
                  pushParams({ status: "all" });
                }}
                onSelect={(action) => {
                  setSnapshotFocus(action);
                  setOverviewOpen(true);
                  if (action === "empty") {
                    pushParams({ status: "empty" });
                    return;
                  }
                  if (action === "realms") {
                    pushParams({ status: "all", sort: "name" });
                    return;
                  }
                  if (action === "decks") {
                    pushParams({ status: "all", sort: "updated" });
                    return;
                  }
                  if (action === "fragments" || action === "blocks") {
                    pushParams({ status: "all", sort: "fragments" });
                  }
                }}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="sr-only">
        Sorted by {SORT_LABELS[sort]}
      </p>

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

function EmptyPanel(props: {
  title: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center">
      <p className="text-sm text-zinc-400">{props.title}</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={props.onPrimary}
          className="min-h-11 rounded-lg bg-emerald-600 text-sm font-semibold text-white"
        >
          {props.primaryLabel}
        </button>
        <button
          type="button"
          onClick={props.onSecondary}
          className="min-h-11 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-200"
        >
          {props.secondaryLabel}
        </button>
      </div>
    </div>
  );
}

function RealmRow(props: {
  folder: Af03Folder;
  chaosDeckCount: number;
  fragmentCount: number;
  showBadge: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onRename: () => void;
  onChildRealm: () => void;
  onChildDeck: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { folder, chaosDeckCount, fragmentCount } = props;
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
            {props.showBadge ? (
              <StatusBadge status={folder.view === "archive" ? "archive" : "active"} />
            ) : null}
          </div>
          <p className="truncate text-xs text-zinc-500">
            {chaosDeckCount} Deck{chaosDeckCount === 1 ? "" : "s"} · {fragmentCount} Fragment
            {fragmentCount === 1 ? "" : "s"} · updated {formatRelativeAgo(folder.updatedAt)}
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
  showBadge: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onRename: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const signals = deckBuilderSignals(props.state, props.deck);
  const distinctBits: string[] = [];
  if (signals.imageBlockCount > 0) distinctBits.push(`${signals.imageBlockCount} images`);
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
            {props.showBadge ? <StatusBadge status={signals.status} /> : null}
          </div>
          <p className="truncate text-xs text-zinc-500">
            {signals.fragmentCount} Fragments · {signals.blockCount} Blocks
            {distinctBits.length ? ` · ${distinctBits.join(" · ")}` : ""}
            {" · updated "}
            {formatRelativeAgo(signals.lastUpdated)}
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
