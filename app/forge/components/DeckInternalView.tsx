"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  archiveDeck,
  createContent,
  deckHref,
  deckStats,
  emptyOrSeedRepo,
  getDeck,
  itemHref,
  listItemsInDeck,
  moveContentOrder,
  removeContent,
  renameDeck,
  setDeckInternalLayout,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03ContentItem, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { CreationMenu, type CreateAction } from "./CreationMenu";

type Props = {
  deckId: string;
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

function promptTitle(label: string, initial: string): string | null {
  const value = window.prompt(label, initial);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function kindLabel(item: Af03ContentItem): string {
  if (item.unsupported) return `${item.kind} · stub`;
  return item.kind;
}

/** AF03 §6 — Chaos Deck internal cumulative content view. */
export function DeckInternalView({ deckId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, []);

  const deck = state ? getDeck(state, deckId) : undefined;
  const items = useMemo(() => (state ? listItemsInDeck(state, deckId) : []), [state, deckId]);
  const stats = state ? deckStats(state, deckId) : null;
  const layout = state?.prefs.deckInternalLayout ?? "list";

  function parentHref(): string {
    if (!deck) return "/forge/active";
    const base = deck.view === "active" ? "/forge/active" : "/forge/archive";
    return deck.folderId ? `${base}/f/${deck.folderId}` : base;
  }

  function handleCreate(action: CreateAction) {
    if (!state || !deck) return;
    if (action === "text") {
      const title = promptTitle("Text title (optional context)", "Untitled note");
      if (title === null) return;
      const body = window.prompt("Text body — raw capture, no classification required", "") ?? "";
      const { state: next, item } = createContent(state, {
        deckId,
        kind: "text",
        title: title || "Untitled note",
        body,
      });
      setState(next);
      window.location.href = itemHref(deckId, item.id);
      return;
    }
    if (action === "link") {
      const url = promptTitle("Link URL", "https://");
      if (!url) return;
      const title = promptTitle("Link title (optional)", url) || url;
      const { state: next, item } = createContent(state, {
        deckId,
        kind: "link",
        title,
        body: url,
        sourceRef: url,
      });
      setState(next);
      window.location.href = itemHref(deckId, item.id);
    }
  }

  if (!state) {
    return <p className="text-sm text-zinc-500">Loading Chaos Deck…</p>;
  }

  if (!deck) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Chaos Deck not found (id is identity).
        </p>
        <Link href="/forge/active" className="text-sm text-zinc-300 underline">
          Back to Active
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Af03RepoDisclosure />

      <nav aria-label="Deck location" className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <Link href={parentHref()} className="rounded px-1 py-0.5 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
          ← Folder
        </Link>
        <span aria-hidden>/</span>
        <span className="text-zinc-400">{deck.view === "active" ? "Active" : "Archive"}</span>
      </nav>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-zinc-100">{deck.title}</h2>
          <p className="text-xs text-zinc-500">
            Cumulative container — not a single fixed note card. No semantic segmentation yet.
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Deck menu"
            aria-expanded={deckMenuOpen}
            className="min-h-11 min-w-11 rounded-lg border border-zinc-800 text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={() => setDeckMenuOpen(!deckMenuOpen)}
          >
            ⋯
          </button>
          {deckMenuOpen ? (
            <div role="menu" className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  const title = promptTitle("Rename Chaos Deck", deck.title);
                  if (!title) return;
                  setState(renameDeck(state, deck.id, title));
                  setDeckMenuOpen(false);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  setState(setDeckInternalLayout(state, layout === "list" ? "grid" : "list"));
                  setDeckMenuOpen(false);
                }}
              >
                Switch to {layout === "list" ? "grid" : "list"} view
              </button>
              {deck.view === "active" ? (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    setState(archiveDeck(state, deck.id));
                    setDeckMenuOpen(false);
                    window.location.href = "/forge/archive";
                  }}
                >
                  Archive
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled
                className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-zinc-600"
                title="Vault pipeline not opened in this slice"
              >
                Prepare for Vault (soon)
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {stats ? (
        <dl className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-center text-xs sm:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Items</dt>
            <dd className="text-base font-semibold text-zinc-100">{stats.items}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Text</dt>
            <dd className="text-base font-semibold text-zinc-100">{stats.text}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Links</dt>
            <dd className="text-base font-semibold text-zinc-100">{stats.links}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Updated</dt>
            <dd className="text-sm font-medium text-zinc-200">{formatTime(stats.lastModified)}</dd>
          </div>
        </dl>
      ) : null}

      <CreationMenu scope="deck" onAction={handleCreate} />

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Contents</h3>
        <div className="flex rounded-lg border border-zinc-800 p-0.5 text-xs" role="group" aria-label="Content layout">
          <button
            type="button"
            aria-pressed={layout === "list"}
            className={`min-h-9 rounded-md px-2.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              layout === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
            }`}
            onClick={() => setState(setDeckInternalLayout(state, "list"))}
          >
            List
          </button>
          <button
            type="button"
            aria-pressed={layout === "grid"}
            className={`min-h-9 rounded-md px-2.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              layout === "grid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
            }`}
            onClick={() => setState(setDeckInternalLayout(state, "grid"))}
          >
            Grid
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-600">No content yet — add text or a link to accumulate.</p>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <Link
                href={itemHref(deckId, item.id)}
                className="block min-h-[6.5rem] px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">{kindLabel(item)}</span>
                <p className="mt-1 font-medium text-zinc-100">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.body || "—"}</p>
              </Link>
              <ItemMenu
                item={item}
                floating
                open={menuId === item.id}
                onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                onMoveUp={() => {
                  setState(moveContentOrder(state, item.id, "up"));
                  setMenuId(null);
                }}
                onMoveDown={() => {
                  setState(moveContentOrder(state, item.id, "down"));
                  setMenuId(null);
                }}
                onRemove={() => {
                  if (!window.confirm("Remove this content from the deck?")) return;
                  setState(removeContent(state, item.id));
                  setMenuId(null);
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-stretch bg-zinc-950">
              <Link
                href={itemHref(deckId, item.id)}
                className="min-w-0 flex-1 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-zinc-100">{item.title}</p>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">
                    {kindLabel(item)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {formatTime(item.updatedAt)}
                  {item.unsupported && item.unsupportedReason ? ` · ${item.unsupportedReason}` : ""}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-600">{item.body || "—"}</p>
              </Link>
              <div className="relative border-l border-zinc-800">
                <ItemMenu
                  item={item}
                  open={menuId === item.id}
                  onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                  onMoveUp={() => {
                    setState(moveContentOrder(state, item.id, "up"));
                    setMenuId(null);
                  }}
                  onMoveDown={() => {
                    setState(moveContentOrder(state, item.id, "down"));
                    setMenuId(null);
                  }}
                  onRemove={() => {
                    if (!window.confirm("Remove this content from the deck?")) return;
                    setState(removeContent(state, item.id));
                    setMenuId(null);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-zinc-600">
        Deck id <code className="text-zinc-500">{deck.id}</code> · path is not identity ·{" "}
        <Link href={deckHref(deck.id)} className="underline">
          self
        </Link>
      </p>
    </div>
  );
}

function ItemMenu({
  item,
  open,
  onToggle,
  onMoveUp,
  onMoveDown,
  onRemove,
  floating = false,
}: {
  item: Af03ContentItem;
  open: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  floating?: boolean;
}) {
  return (
    <div className={floating ? "absolute right-1 top-1" : "relative h-full"}>
      <button
        type="button"
        aria-label={`Menu for ${item.title}`}
        aria-expanded={open}
        className="flex h-full min-h-11 min-w-11 items-center justify-center px-3 text-zinc-400 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        onClick={onToggle}
      >
        ⋯
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
          <Link
            role="menuitem"
            href={itemHref(item.deckId, item.id)}
            className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Open / Edit
          </Link>
          <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onMoveUp}>
            Move up
          </button>
          <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" onClick={onMoveDown}>
            Move down
          </button>
          <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-zinc-800" onClick={onRemove}>
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
