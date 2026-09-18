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
  folderRowMeta,
  formatRelativeAgo,
  getFolder,
  listChildFolders,
  listDecksAt,
  renameDeck,
  renameFolder,
  restoreDeck,
  setDeckListLayout,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03ChaosDeck, Af03Folder, Af03RepoState, OperationalView } from "@/lib/argusforge/af03-repo-types";
import { ForgeOverflowMenu } from "./ForgeOverflowMenu";
import { NewDeckSheet, NewFolderSheet } from "./algo/NewDeckSheet";
import { RepoListRow } from "./RepoListRow";

type Props = {
  view: OperationalView;
  folderId: string | null;
  /** Home uses /forge so back/root stay on the homologated explorer. */
  rootHref?: string;
};

type SortKey = "name" | "updated";

export function RepositoryView({ view, folderId, rootHref }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sheet, setSheet] = useState<"deck" | "folder" | null>(null);

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "deck") setSheet("deck");
    if (params.get("new") === "folder") setSheet("folder");
  }, []);

  const basePath = rootHref ?? (view === "active" ? "/forge/active" : "/forge/archive");
  const folderHref = (id: string) => `${basePath}/f/${id}`;

  const currentFolder = state && folderId ? getFolder(state, folderId) : undefined;
  const title = currentFolder?.title ?? (view === "active" ? "My Decks" : "Archive");

  const parentHref = currentFolder?.parentId
    ? folderHref(currentFolder.parentId)
    : folderId
      ? basePath
      : null;

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

  const mixed = useMemo(() => {
    const folderRows = folders.map((folder) => ({
      kind: "folder" as const,
      id: folder.id,
      title: folder.title,
      updatedAt: folder.updatedAt,
      folder,
    }));
    const deckRows = decks.map((deck) => ({
      kind: "deck" as const,
      id: deck.id,
      title: deck.title,
      updatedAt: deck.updatedAt,
      deck,
    }));
    const rows = [...folderRows, ...deckRows];
    return rows.sort((a, b) =>
      sortKey === "name" ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [folders, decks, sortKey]);

  function promptTitle(label: string, initial: string): string | null {
    const value = window.prompt(label, initial);
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  function saveNewDeck(input: { title: string; folderId: string | null }) {
    if (!state) return;
    const { state: next, deck } = createDeck(state, {
      title: input.title,
      folderId: input.folderId,
      view,
    });
    setState(next);
    setSheet(null);
    window.location.href = `/forge/deck/${deck.id}`;
  }

  function saveNewFolder(title: string) {
    if (!state) return;
    const { state: next } = createFolder(state, { title, parentId: folderId, view });
    setState(next);
    setSheet(null);
  }

  if (!state) {
    return <p className="text-sm text-slate-500">Loading library…</p>;
  }

  if (folderId && !currentFolder) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Folder not found (id is identity — path is not).
        </p>
        <Link href={basePath} className="text-sm text-[#2f80ed] underline">
          Back to {view === "active" ? "My Decks" : "Archive"}
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
    <div className="min-w-0 w-full space-y-4">
      <header className="flex items-center gap-2">
        {parentHref ? (
          <Link
            href={parentHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-white"
            aria-label="Back"
          >
            ‹
          </Link>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate text-[22px] font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <ForgeOverflowMenu
          open={menuId === "__lib__"}
          onOpenChange={(open) => setMenuId(open ? "__lib__" : null)}
          label="Library menu"
          variant="light"
          triggerClassName="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-white"
          items={[
            { id: "deck", label: "New deck", onClick: () => setSheet("deck") },
            { id: "folder", label: "New folder", onClick: () => setSheet("folder") },
          ]}
        />
      </header>

      <div>
        <label htmlFor={`search-${view}-${folderId ?? "root"}`} className="sr-only">
          Search
        </label>
        <input
          id={`search-${view}-${folderId ?? "root"}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
        />
      </div>

      <section aria-labelledby={`${view}-contents-heading`} className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h3 id={`${view}-contents-heading`} className="text-sm font-semibold text-slate-500">
            Decks
          </h3>
          <button
            type="button"
            className="text-xs font-semibold text-[#2f80ed]"
            onClick={() => setSortKey((k) => (k === "name" ? "updated" : "name"))}
          >
            ▲ {sortKey === "name" ? "Name" : "Updated"} (All)
          </button>
        </div>

        <ul className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {!folderId && view === "active" ? (
            <li className="flex items-stretch border-b border-slate-100">
              <Link href="/forge/chaos" className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden>
                  ⌂
                </span>
                <span className="text-[15px] font-semibold text-slate-900">Inbox</span>
              </Link>
            </li>
          ) : null}

          {mixed.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-slate-500">
              Nothing here yet. New deck or folder from ⋯
            </li>
          ) : (
            mixed.map((row) =>
              row.kind === "folder" ? (
                <FolderRow
                  key={row.id}
                  folder={row.folder}
                  state={state}
                  href={folderHref(row.folder.id)}
                  view={view}
                  menuOpen={menuId === row.id}
                  onMenuOpenChange={(open) => setMenuId(open ? row.id : null)}
                  onRename={() => {
                    const name = promptTitle("Rename folder", row.folder.title);
                    if (!name) return;
                    setState(renameFolder(state, row.folder.id, name));
                    setMenuId(null);
                  }}
                  onChildFolder={() => {
                    const { state: next } = createFolder(state, {
                      title: "New folder",
                      parentId: row.folder.id,
                      view,
                    });
                    setState(next);
                    setMenuId(null);
                  }}
                  onChildDeck={() => {
                    const { state: next, deck } = createDeck(state, {
                      title: "My Deck",
                      folderId: row.folder.id,
                      view,
                    });
                    setState(next);
                    setMenuId(null);
                    window.location.href = `/forge/deck/${deck.id}`;
                  }}
                  onArchive={() => {
                    setState(archiveFolder(state, row.folder.id));
                    setMenuId(null);
                  }}
                />
              ) : (
                <DeckRow
                  key={row.id}
                  deck={row.deck}
                  state={state}
                  view={view}
                  menuOpen={menuId === row.id}
                  onMenuOpenChange={(open) => setMenuId(open ? row.id : null)}
                  onRename={() => {
                    const name = promptTitle("Rename deck", row.deck.title);
                    if (!name) return;
                    setState(renameDeck(state, row.deck.id, name));
                    setMenuId(null);
                  }}
                  onArchive={() => {
                    setState(archiveDeck(state, row.deck.id));
                    setMenuId(null);
                  }}
                  onRestore={() => {
                    setState(restoreDeck(state, row.deck.id));
                    setMenuId(null);
                  }}
                  onToggleLayout={() =>
                    setState(setDeckListLayout(state, state.prefs.deckListLayout === "list" ? "grid" : "list"))
                  }
                />
              )
            )
          )}
        </ul>
      </section>

      {sheet === "deck" ? (
        <NewDeckSheet
          state={state}
          view={view}
          currentFolderId={folderId}
          onClose={() => setSheet(null)}
          onSave={saveNewDeck}
        />
      ) : null}
      {sheet === "folder" ? (
        <NewFolderSheet onClose={() => setSheet(null)} onSave={saveNewFolder} />
      ) : null}
    </div>
  );
}

function FolderRow({
  folder,
  state,
  href,
  view,
  menuOpen,
  onMenuOpenChange,
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
  onMenuOpenChange: (open: boolean) => void;
  onRename: () => void;
  onChildFolder: () => void;
  onChildDeck: () => void;
  onArchive: () => void;
}) {
  const meta = folderRowMeta(state, folder.id);
  const primary = { label: String(meta.items), tone: "neutral" as const };

  return (
    <RepoListRow
      href={href}
      icon="folder"
      title={folder.title}
      primaryBadge={primary}
      secondaryBadge={view === "archive" ? "Archived" : undefined}
      meta={<span>{formatRelativeAgo(folder.updatedAt)}</span>}
      menu={
        <ForgeOverflowMenu
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          label={`Menu for folder ${folder.title}`}
          menuWidthPx={176}
          triggerClassName="flex min-w-11 items-center justify-center px-2 text-slate-400 hover:text-slate-700"
          variant="light"
          items={[
            {
              id: "open",
              label: "Open",
              onClick: () => {
                window.location.href = href;
              },
            },
            { id: "rename", label: "Rename", onClick: onRename },
            { id: "child-folder", label: "Create child folder", onClick: onChildFolder },
            { id: "child-deck", label: "Create Chaos Deck", onClick: onChildDeck },
            ...(view === "active"
              ? [{ id: "archive", label: "Archive", onClick: onArchive }]
              : []),
          ]}
        />
      }
    />
  );
}

function DeckRow({
  deck,
  state,
  view,
  menuOpen,
  onMenuOpenChange,
  onRename,
  onArchive,
  onRestore,
  onToggleLayout,
}: {
  deck: Af03ChaosDeck;
  state: Af03RepoState;
  view: OperationalView;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onRename: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onToggleLayout: () => void;
}) {
  const meta = deckRowMeta(state, deck.id);
  const primary = { label: String(meta.items), tone: "neutral" as const };

  return (
    <RepoListRow
      href={deckHref(deck.id)}
      icon="deck"
      title={deck.title}
      primaryBadge={primary}
      secondaryBadge={view === "archive" ? "Archived" : undefined}
      meta={<span>{formatRelativeAgo(deck.updatedAt)}</span>}
      menu={
        <ForgeOverflowMenu
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          label={`Menu for deck ${deck.title}`}
          menuWidthPx={160}
          triggerClassName="flex min-w-11 items-center justify-center px-2 text-slate-400 hover:text-slate-700"
          variant="light"
          items={[
            {
              id: "open",
              label: "Open",
              onClick: () => {
                window.location.href = deckHref(deck.id);
              },
            },
            { id: "rename", label: "Rename", onClick: onRename },
            { id: "layout", label: "Toggle list/grid pref", onClick: onToggleLayout },
            view === "active"
              ? { id: "archive", label: "Archive", onClick: onArchive }
              : { id: "restore", label: "Restore", onClick: onRestore },
          ]}
        />
      }
    />
  );
}
