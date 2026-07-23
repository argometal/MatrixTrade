"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  archiveDeck,
  archiveFolder,
  createDeck,
  createFolder,
  deckHref,
  deckRowMeta,
  emptyOrSeedRepo,
  folderBreadcrumb,
  folderRowMeta,
  formatRelativeAgo,
  getFolder,
  levelSnapshot,
  listChildFolders,
  listDecksAt,
  renameDeck,
  renameFolder,
  restoreDeck,
  setDeckListLayout,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03ChaosDeck, Af03Folder, Af03RepoState, OperationalView } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { ChaosDeckList } from "./ChaosDeckList";
import { CreationMenu, type CreateAction } from "./CreationMenu";
import { LevelSnapshotChart } from "./LevelSnapshotChart";
import { RepoListRow } from "./RepoListRow";

type Props = {
  view: OperationalView;
  folderId: string | null;
};

type SortKey = "name" | "updated";

export function RepositoryView({ view, folderId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, []);

  const basePath = view === "active" ? "/forge/active" : "/forge/archive";
  const folderHref = (id: string) => `${basePath}/f/${id}`;

  const currentFolder = state && folderId ? getFolder(state, folderId) : undefined;
  const title = currentFolder?.title ?? (view === "active" ? "Active" : "Archive");
  const rootLabel = view === "active" ? "01 Active" : "02 Archive";

  const crumbs = useMemo(() => {
    if (!state) return [];
    return folderBreadcrumb(state, folderId);
  }, [state, folderId]);

  const parentHref = currentFolder?.parentId
    ? folderHref(currentFolder.parentId)
    : folderId
      ? basePath
      : "/forge";

  const folders = useMemo(() => {
    if (!state) return [];
    const list = listChildFolders(state, view, folderId);
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((f) => f.title.toLowerCase().includes(q)) : list;
    return [...filtered].sort((a, b) =>
      sortKey === "name"
        ? a.title.localeCompare(b.title)
        : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [state, view, folderId, query, sortKey]);

  const decks = useMemo(() => {
    if (!state) return [];
    const list = listDecksAt(state, view, folderId);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter((d) => d.title.toLowerCase().includes(q) || d.preview.toLowerCase().includes(q))
      : list;
    return [...filtered].sort((a, b) =>
      sortKey === "name"
        ? a.title.localeCompare(b.title)
        : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [state, view, folderId, query, sortKey]);

  const snapshot = state
    ? levelSnapshot(state, view, folderId)
    : {
        folders: 0,
        decks: 0,
        items: 0,
        emptyDecks: 0,
        fresh: 0,
        older: 0,
        recentItems: 0,
        archivedDecksGlobal: 0,
      };

  function promptTitle(label: string, initial: string): string | null {
    const value = window.prompt(label, initial);
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  function handleCreate(action: CreateAction) {
    if (!state) return;
    if (action === "folder") {
      const name = promptTitle("New folder name", "New folder");
      if (!name) return;
      const { state: next } = createFolder(state, { title: name, parentId: folderId, view });
      setState(next);
      setCreateOpen(false);
      return;
    }
    if (action === "deck") {
      const name = promptTitle("New Chaos Deck name", "New Chaos Deck");
      if (!name) return;
      const { state: next, deck } = createDeck(state, { title: name, folderId, view });
      setState(next);
      setCreateOpen(false);
      window.location.href = `/forge/deck/${deck.id}`;
    }
  }

  if (!state) {
    return <p className="text-sm text-zinc-500">Loading repository…</p>;
  }

  if (folderId && !currentFolder) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Folder not found (id is identity — path is not).
        </p>
        <Link href={basePath} className="text-sm text-zinc-300 underline">
          Back to {view === "active" ? "Active" : "Archive"} root
        </Link>
      </div>
    );
  }

  if (folderId && currentFolder && currentFolder.view !== view) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          This folder belongs to {currentFolder.view}, not {view}.
        </p>
        <Link
          href={`${currentFolder.view === "active" ? "/forge/active" : "/forge/archive"}/f/${currentFolder.id}`}
          className="text-sm text-zinc-300 underline"
        >
          Open in correct view
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Af03RepoDisclosure />

      {/* Header — screenshot-like: back + title + menu */}
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={parentHref}
            className="text-sm font-medium text-sky-400 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            ‹ {folderId ? (crumbs[crumbs.length - 2]?.title ?? (view === "active" ? "Active" : "Archive")) : "Home"}
          </Link>
          <button
            type="button"
            aria-label="Level menu"
            aria-expanded={createOpen}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-xl text-zinc-400 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={() => setCreateOpen((o) => !o)}
          >
            ⋯
          </button>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
          {folderId ? title : rootLabel}
        </h2>
        <p className="text-xs text-zinc-500">
          Organization only — path is not identity. Not Argus relations. Not review due.
        </p>
      </header>

      {createOpen ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <CreationMenu scope="folder" onAction={handleCreate} />
        </div>
      ) : null}

      <LevelSnapshotChart snapshot={snapshot} />

      <div className="space-y-2">
        <label htmlFor={`search-${view}-${folderId ?? "root"}`} className="sr-only">
          Search this level
        </label>
        <input
          id={`search-${view}-${folderId ?? "root"}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search folders and decks…"
          className="min-h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        />
      </div>

      <section aria-labelledby={`${view}-contents-heading`} className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id={`${view}-contents-heading`} className="text-base font-semibold text-zinc-100">
            Contents
          </h3>
          <button
            type="button"
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={() => setSortKey((k) => (k === "name" ? "updated" : "name"))}
          >
            ▲ {sortKey === "name" ? "Name" : "Updated"} (All)
          </button>
        </div>

        {folders.length === 0 && decks.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">Nothing at this level yet.</p>
        ) : state.prefs.deckListLayout === "grid" ? (
          <div className="space-y-3">
            {folders.length > 0 ? (
              <ul className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/40">
                {folders.map((f) => (
                  <FolderRow
                    key={f.id}
                    folder={f}
                    state={state}
                    href={folderHref(f.id)}
                    view={view}
                    menuOpen={menuId === f.id}
                    onToggleMenu={() => setMenuId(menuId === f.id ? null : f.id)}
                    onRename={() => {
                      const name = promptTitle("Rename folder", f.title);
                      if (!name) return;
                      setState(renameFolder(state, f.id, name));
                      setMenuId(null);
                    }}
                    onChildFolder={() => {
                      const name = promptTitle("Child folder name", "New folder");
                      if (!name) return;
                      const { state: next } = createFolder(state, {
                        title: name,
                        parentId: f.id,
                        view,
                      });
                      setState(next);
                      setMenuId(null);
                    }}
                    onChildDeck={() => {
                      const name = promptTitle("Chaos Deck name", "New Chaos Deck");
                      if (!name) return;
                      const { state: next, deck } = createDeck(state, {
                        title: name,
                        folderId: f.id,
                        view,
                      });
                      setState(next);
                      setMenuId(null);
                      window.location.href = `/forge/deck/${deck.id}`;
                    }}
                    onArchive={() => {
                      setState(archiveFolder(state, f.id));
                      setMenuId(null);
                    }}
                  />
                ))}
              </ul>
            ) : null}
            <ChaosDeckList
              decks={decks}
              layout="grid"
              view={view}
              menuId={menuId}
              onToggleMenu={setMenuId}
              onRename={(d) => {
                const name = promptTitle("Rename Chaos Deck", d.title);
                if (!name) return;
                setState(renameDeck(state, d.id, name));
                setMenuId(null);
              }}
              onArchive={(d) => {
                setState(archiveDeck(state, d.id));
                setMenuId(null);
              }}
              onRestore={(d) => {
                setState(restoreDeck(state, d.id));
                setMenuId(null);
              }}
              onLayoutChange={(layout) => setState(setDeckListLayout(state, layout))}
            />
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/40">
            {folders.map((f) => (
              <FolderRow
                key={f.id}
                folder={f}
                state={state}
                href={folderHref(f.id)}
                view={view}
                menuOpen={menuId === f.id}
                onToggleMenu={() => setMenuId(menuId === f.id ? null : f.id)}
                onRename={() => {
                  const name = promptTitle("Rename folder", f.title);
                  if (!name) return;
                  setState(renameFolder(state, f.id, name));
                  setMenuId(null);
                }}
                onChildFolder={() => {
                  const name = promptTitle("Child folder name", "New folder");
                  if (!name) return;
                  const { state: next } = createFolder(state, {
                    title: name,
                    parentId: f.id,
                    view,
                  });
                  setState(next);
                  setMenuId(null);
                }}
                onChildDeck={() => {
                  const name = promptTitle("Chaos Deck name", "New Chaos Deck");
                  if (!name) return;
                  const { state: next, deck } = createDeck(state, {
                    title: name,
                    folderId: f.id,
                    view,
                  });
                  setState(next);
                  setMenuId(null);
                  window.location.href = `/forge/deck/${deck.id}`;
                }}
                onArchive={() => {
                  setState(archiveFolder(state, f.id));
                  setMenuId(null);
                }}
              />
            ))}
            {decks.map((d) => (
              <DeckRow
                key={d.id}
                deck={d}
                state={state}
                view={view}
                menuOpen={menuId === d.id}
                onToggleMenu={() => setMenuId(menuId === d.id ? null : d.id)}
                onRename={() => {
                  const name = promptTitle("Rename Chaos Deck", d.title);
                  if (!name) return;
                  setState(renameDeck(state, d.id, name));
                  setMenuId(null);
                }}
                onArchive={() => {
                  setState(archiveDeck(state, d.id));
                  setMenuId(null);
                }}
                onRestore={() => {
                  setState(restoreDeck(state, d.id));
                  setMenuId(null);
                }}
                onToggleLayout={() =>
                  setState(setDeckListLayout(state, state.prefs.deckListLayout === "list" ? "grid" : "list"))
                }
              />
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={() =>
              setState(setDeckListLayout(state, state.prefs.deckListLayout === "list" ? "grid" : "list"))
            }
          >
            View: {state.prefs.deckListLayout}
          </button>
        </div>
      </section>
    </div>
  );
}

function FolderRow({
  folder,
  state,
  href,
  view,
  menuOpen,
  onToggleMenu,
  onRename,
  onChildFolder,
  onChildDeck,
  onArchive,
}: {
  folder: Af03Folder;
  state: Af03RepoState;
  href: string;
  view: OperationalView;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRename: () => void;
  onChildFolder: () => void;
  onChildDeck: () => void;
  onArchive: () => void;
}) {
  const meta = folderRowMeta(state, folder.id);
  const primary =
    meta.items === 0
      ? { label: "0 ITEMS", tone: "quiet" as const }
      : { label: `${meta.items} ITEMS`, tone: "hot" as const };

  return (
    <RepoListRow
      href={href}
      icon="folder"
      title={folder.title}
      primaryBadge={primary}
      secondaryBadge={meta.recentItems > 0 ? `${meta.recentItems} NEW` : undefined}
      meta={
        <>
          <span title="Child folders">⊞ {meta.childFolders}</span>
          <span title="Chaos Decks">▦ {meta.decks}</span>
          <span title="Last updated">✎ {formatRelativeAgo(folder.updatedAt)}</span>
        </>
      }
      menu={
        <>
          <button
            type="button"
            aria-label={`Menu for folder ${folder.title}`}
            aria-expanded={menuOpen}
            className="flex min-w-11 items-center justify-center px-2 text-zinc-500 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={onToggleMenu}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div role="menu" className="absolute right-0 top-full z-10 w-44 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
              <Link role="menuitem" href={href} className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
                Open
              </Link>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onRename}>
                Rename
              </button>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onChildFolder}>
                Create child folder
              </button>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onChildDeck}>
                Create Chaos Deck
              </button>
              {view === "active" ? (
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onArchive}>
                  Archive
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      }
    />
  );
}

function DeckRow({
  deck,
  state,
  view,
  menuOpen,
  onToggleMenu,
  onRename,
  onArchive,
  onRestore,
  onToggleLayout,
}: {
  deck: Af03ChaosDeck;
  state: Af03RepoState;
  view: OperationalView;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRename: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onToggleLayout: () => void;
}) {
  const meta = deckRowMeta(state, deck.id);
  const primary =
    meta.items === 0
      ? { label: "EMPTY", tone: "quiet" as const }
      : { label: `${meta.items} ITEMS`, tone: meta.items >= 5 ? ("hot" as const) : ("neutral" as const) };

  return (
    <RepoListRow
      href={deckHref(deck.id)}
      icon="deck"
      title={deck.title}
      primaryBadge={primary}
      secondaryBadge={meta.recentItems > 0 ? `${meta.recentItems} NEW` : view === "archive" ? "ARCHIVED" : undefined}
      meta={
        <>
          <span title="Content items">▣ {meta.items}</span>
          <span title="Last updated">✎ {formatRelativeAgo(deck.updatedAt)}</span>
          <span title="Created">◎ {formatRelativeAgo(deck.createdAt)}</span>
        </>
      }
      menu={
        <>
          <button
            type="button"
            aria-label={`Menu for deck ${deck.title}`}
            aria-expanded={menuOpen}
            className="flex min-w-11 items-center justify-center px-2 text-zinc-500 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={onToggleMenu}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div role="menu" className="absolute right-0 top-full z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
              <Link role="menuitem" href={deckHref(deck.id)} className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
                Open
              </Link>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onRename}>
                Rename
              </button>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onToggleLayout}>
                Toggle list/grid pref
              </button>
              <button
                type="button"
                role="menuitem"
                disabled
                className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-zinc-600"
              >
                Move (soon)
              </button>
              {view === "active" ? (
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onArchive}>
                  Archive
                </button>
              ) : (
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onRestore}>
                  Restore
                </button>
              )}
            </div>
          ) : null}
        </>
      }
    />
  );
}
