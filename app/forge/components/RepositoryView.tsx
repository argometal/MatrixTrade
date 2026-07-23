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
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState, OperationalView } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";

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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          onClick={() => {
            const title = promptTitle("New folder name", "New folder");
            if (!title) return;
            const { state: next } = createFolder(state, { title, parentId: folderId, view });
            setState(next);
          }}
        >
          New Folder
        </button>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          onClick={() => {
            const title = promptTitle("New Chaos Deck name", "New Chaos Deck");
            if (!title) return;
            const { state: next } = createDeck(state, { title, folderId, view });
            setState(next);
          }}
        >
          New Chaos Deck
        </button>
      </div>

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
                          const title = promptTitle("Rename folder", f.title);
                          if (!title) return;
                          setState(renameFolder(state, f.id, title));
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
                          const title = promptTitle("Child folder name", "New folder");
                          if (!title) return;
                          const { state: next } = createFolder(state, {
                            title,
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
                          const title = promptTitle("Chaos Deck name", "New Chaos Deck");
                          if (!title) return;
                          const { state: next } = createDeck(state, {
                            title,
                            folderId: f.id,
                            view,
                          });
                          setState(next);
                          setMenuId(null);
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

      <section aria-labelledby={`${view}-decks-heading`} className="space-y-2">
        <h3 id={`${view}-decks-heading`} className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Chaos Decks
        </h3>
        {decks.length === 0 ? (
          <p className="text-sm text-zinc-600">No Chaos Decks at this level.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
            {decks.map((d) => (
              <li key={d.id} className="flex items-stretch bg-zinc-950">
                <div className="min-w-0 flex-1 px-3 py-3">
                  <p className="font-medium text-zinc-100">{d.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {d.contentCount} items · {formatTime(d.updatedAt)}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-600">{d.preview}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Deck open / content view — later AF03 slice (not this one).
                  </p>
                </div>
                <div className="relative border-l border-zinc-800">
                  <button
                    type="button"
                    aria-label={`Menu for deck ${d.title}`}
                    aria-expanded={menuId === d.id}
                    className="flex h-full min-w-11 items-center justify-center px-3 text-zinc-400 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                    onClick={() => setMenuId(menuId === d.id ? null : d.id)}
                  >
                    ⋯
                  </button>
                  {menuId === d.id ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        onClick={() => {
                          const title = promptTitle("Rename Chaos Deck", d.title);
                          if (!title) return;
                          setState(renameDeck(state, d.id, title));
                          setMenuId(null);
                        }}
                      >
                        Rename
                      </button>
                      {view === "active" ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                          onClick={() => {
                            setState(archiveDeck(state, d.id));
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
    </div>
  );
}
