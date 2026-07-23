"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  archiveDeck,
  archiveFolder,
  createDeck,
  createFolder,
  emptyOrSeedRepo,
  folderBreadcrumb,
  getFolder,
  levelStats,
  listChildFolders,
  listDecksAt,
  renameDeck,
  renameFolder,
  setDeckListLayout,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState, OperationalView } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { ChaosDeckList } from "./ChaosDeckList";
import { CreationMenu, type CreateAction } from "./CreationMenu";

type Props = {
  view: OperationalView;
  folderId: string | null;
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function RepositoryView({ view, folderId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, []);

  const basePath = view === "active" ? "/forge/active" : "/forge/archive";
  const folderHref = (id: string) => `${basePath}/f/${id}`;

  const currentFolder = state && folderId ? getFolder(state, folderId) : undefined;
  const title = currentFolder?.title ?? (view === "active" ? "Active" : "Archive");

  const crumbs = useMemo(() => {
    if (!state) return [];
    return folderBreadcrumb(state, folderId);
  }, [state, folderId]);

  const folders = useMemo(() => {
    if (!state) return [];
    const list = listChildFolders(state, view, folderId);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) => f.title.toLowerCase().includes(q));
  }, [state, view, folderId, query]);

  const decks = useMemo(() => {
    if (!state) return [];
    const list = listDecksAt(state, view, folderId);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => d.title.toLowerCase().includes(q) || d.preview.toLowerCase().includes(q));
  }, [state, view, folderId, query]);

  const stats = state ? levelStats(state, view, folderId) : { folders: 0, decks: 0, lastModified: null };

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
      return;
    }
    if (action === "deck") {
      const name = promptTitle("New Chaos Deck name", "New Chaos Deck");
      if (!name) return;
      const { state: next, deck } = createDeck(state, { title: name, folderId, view });
      setState(next);
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
    <div className="space-y-4">
      <Af03RepoDisclosure />

      <nav aria-label="Folder breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
        <Link href={basePath} className="rounded px-1 py-0.5 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
          {view === "active" ? "Active" : "Archive"}
        </Link>
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <span aria-hidden>/</span>
            <Link
              href={folderHref(c.id)}
              className="rounded px-1 py-0.5 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              {c.title}
            </Link>
          </span>
        ))}
      </nav>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-zinc-100">{title}</h2>
          <p className="text-xs text-zinc-500">
            Location is organization only — not identity, not Argus relations.
          </p>
        </div>
        {folderId || crumbs.length ? (
          <Link
            href={currentFolder?.parentId ? folderHref(currentFolder.parentId) : basePath}
            className="shrink-0 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            Up
          </Link>
        ) : null}
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-center text-xs">
        <div>
          <dt className="text-zinc-500">Folders</dt>
          <dd className="text-base font-semibold text-zinc-100">{stats.folders}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Chaos Decks</dt>
          <dd className="text-base font-semibold text-zinc-100">{stats.decks}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Updated</dt>
          <dd className="text-sm font-medium text-zinc-200">{formatTime(stats.lastModified)}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <label htmlFor={`search-${view}-${folderId ?? "root"}`} className="block text-sm font-medium text-zinc-300">
          Search this level
        </label>
        <input
          id={`search-${view}-${folderId ?? "root"}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter folders and decks…"
          className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        />
      </div>

      <CreationMenu scope="folder" onAction={handleCreate} />

      <section aria-labelledby={`${view}-folders-heading`} className="space-y-2">
        <h3 id={`${view}-folders-heading`} className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Folders
        </h3>
        {folders.length === 0 ? (
          <p className="text-sm text-zinc-600">No folders at this level.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
            {folders.map((f) => (
              <li key={f.id} className="flex items-stretch bg-zinc-950">
                <Link
                  href={folderHref(f.id)}
                  className="min-w-0 flex-1 px-3 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
                >
                  <p className="font-medium text-zinc-100">{f.title}</p>
                  <p className="text-xs text-zinc-500">Folder · {formatTime(f.updatedAt)}</p>
                </Link>
                <div className="relative border-l border-zinc-800">
                  <button
                    type="button"
                    aria-label={`Menu for folder ${f.title}`}
                    aria-expanded={menuId === f.id}
                    className="flex h-full min-w-11 items-center justify-center px-3 text-zinc-400 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                    onClick={() => setMenuId(menuId === f.id ? null : f.id)}
                  >
                    ⋯
                  </button>
                  {menuId === f.id ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
                    >
                      <Link role="menuitem" href={folderHref(f.id)} className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
                        Open
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        onClick={() => {
                          const name = promptTitle("Rename folder", f.title);
                          if (!name) return;
                          setState(renameFolder(state, f.id, name));
                          setMenuId(null);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        onClick={() => {
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
                      >
                        Create child folder
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        onClick={() => {
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
                      >
                        Create Chaos Deck
                      </button>
                      {view === "active" ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                          onClick={() => {
                            setState(archiveFolder(state, f.id));
                            setMenuId(null);
                          }}
                        >
                          Archive
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChaosDeckList
        decks={decks}
        layout={state.prefs.deckListLayout}
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
        onLayoutChange={(layout) => setState(setDeckListLayout(state, layout))}
      />
    </div>
  );
}
