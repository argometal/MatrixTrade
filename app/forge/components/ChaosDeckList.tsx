"use client";

import Link from "next/link";
import type { Af03ChaosDeck, Af03LayoutMode, OperationalView } from "@/lib/argusforge/af03-repo-types";
import { deckHref, deckStatus } from "@/lib/argusforge/af03-repo-store";

type Props = {
  decks: Af03ChaosDeck[];
  layout: Af03LayoutMode;
  view: OperationalView;
  menuId: string | null;
  onToggleMenu: (id: string | null) => void;
  onRename: (deck: Af03ChaosDeck) => void;
  onArchive: (deck: Af03ChaosDeck) => void;
  onLayoutChange: (layout: Af03LayoutMode) => void;
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

function statusLabel(deck: Af03ChaosDeck): string {
  const s = deckStatus(deck);
  if (s === "archived") return "Archived";
  if (s === "empty") return "Empty";
  return "Active";
}

/** AF03 §5 — Chaos Deck list / grid at folder level. No Alexandria grades. */
export function ChaosDeckList({
  decks,
  layout,
  view,
  menuId,
  onToggleMenu,
  onRename,
  onArchive,
  onLayoutChange,
}: Props) {
  return (
    <section aria-labelledby="chaos-decks-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="chaos-decks-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Chaos Decks
        </h3>
        <div className="flex rounded-lg border border-zinc-800 p-0.5 text-xs" role="group" aria-label="Deck layout">
          <button
            type="button"
            aria-pressed={layout === "list"}
            className={`min-h-9 rounded-md px-2.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              layout === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={() => onLayoutChange("list")}
          >
            List
          </button>
          <button
            type="button"
            aria-pressed={layout === "grid"}
            className={`min-h-9 rounded-md px-2.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              layout === "grid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={() => onLayoutChange("grid")}
          >
            Grid
          </button>
        </div>
      </div>

      {decks.length === 0 ? (
        <p className="text-sm text-zinc-600">No Chaos Decks at this level.</p>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {decks.map((d) => (
            <li key={d.id} className="relative flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <Link
                href={deckHref(d.id)}
                className="flex min-h-[7.5rem] flex-1 flex-col px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  {statusLabel(d)}
                </span>
                <span className="mt-1 font-medium text-zinc-100">{d.title}</span>
                <span className="mt-2 line-clamp-2 flex-1 text-xs text-zinc-500">{d.preview}</span>
                <span className="mt-2 text-xs text-zinc-600">
                  {d.contentCount} items · {formatTime(d.updatedAt)}
                </span>
              </Link>
              <div className="absolute right-1 top-1">
                <DeckMenu
                  deck={d}
                  view={view}
                  open={menuId === d.id}
                  onToggle={() => onToggleMenu(menuId === d.id ? null : d.id)}
                  onRename={() => onRename(d)}
                  onArchive={() => onArchive(d)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
          {decks.map((d) => (
            <li key={d.id} className="flex items-stretch bg-zinc-950">
              <Link
                href={deckHref(d.id)}
                className="min-w-0 flex-1 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-zinc-100">{d.title}</p>
                  <span className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                    {statusLabel(d)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {d.contentCount} items · {formatTime(d.updatedAt)}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-600">{d.preview}</p>
              </Link>
              <div className="relative border-l border-zinc-800">
                <DeckMenu
                  deck={d}
                  view={view}
                  open={menuId === d.id}
                  onToggle={() => onToggleMenu(menuId === d.id ? null : d.id)}
                  onRename={() => onRename(d)}
                  onArchive={() => onArchive(d)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeckMenu({
  deck,
  view,
  open,
  onToggle,
  onRename,
  onArchive,
}: {
  deck: Af03ChaosDeck;
  view: OperationalView;
  open: boolean;
  onToggle: () => void;
  onRename: () => void;
  onArchive: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label={`Menu for deck ${deck.title}`}
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
            href={deckHref(deck.id)}
            className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Open
          </Link>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onRename}
          >
            Rename
          </button>
          {view === "active" ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              onClick={onArchive}
            >
              Archive
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
