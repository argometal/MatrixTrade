"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  archiveDeck,
  createContent,
  deckHref,
  deckStats,
  duplicateContent,
  emptyOrSeedRepo,
  getDeck,
  itemHref,
  listItemsInDeck,
  moveContentOrder,
  recordDeckOpen,
  removeContent,
  renameDeck,
  restoreDeck,
  setDeckInternalLayout,
  setMarkedForLater,
  viewHref,
} from "@/lib/argusforge/af03-repo-store";
import { UNASSIGNED_REALM_ID } from "@/lib/argusforge/af03-repo-types";
import { createVaultPrep } from "@/lib/argusforge/af03-vault-prep-store";
import type { Af03ContentItem, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { realmHref } from "@/lib/argusforge/af03-realm-map";
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
  const bits: string[] = [item.kind];
  if (item.unsupported) bits.push("stub");
  if (item.markedForLater) bits.push("later");
  return bits.join(" · ");
}

/** AF03 §6 + §7/§10/§11/§12 hooks — Chaos Deck internal view. */
export function DeckInternalView({ deckId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const repo = recordDeckOpen(emptyOrSeedRepo(), deckId);
    setState(repo);
  }, [deckId]);

  const deck = state ? getDeck(state, deckId) : undefined;
  const items = useMemo(() => (state ? listItemsInDeck(state, deckId) : []), [state, deckId]);
  const stats = state ? deckStats(state, deckId) : null;
  const layout = state?.prefs.deckInternalLayout ?? "list";

  function parentHref(): string {
    if (!deck) return "/forge";
    return realmHref(deck.folderId ?? UNASSIGNED_REALM_ID);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      window.location.href = viewHref(deckId, item.id);
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
      window.location.href = viewHref(deckId, item.id);
      return;
    }
    if (action === "image") {
      const url = promptTitle("Image URL (not binary upload)", "https://");
      if (!url) return;
      const title = promptTitle("Image title (optional)", "Image") || "Image";
      const { state: next, item } = createContent(state, {
        deckId,
        kind: "image",
        title,
        body: url,
        sourceRef: url,
      });
      setState(next);
      window.location.href = viewHref(deckId, item.id);
      return;
    }
    if (action === "file" || action === "pdf") {
      const name = promptTitle(
        action === "pdf" ? "PDF name (binary not stored — stub)" : "File name (binary not stored — stub)",
        action === "pdf" ? "document.pdf" : "file.bin"
      );
      if (!name) return;
      const { state: next, item } = createContent(state, {
        deckId,
        kind: action === "pdf" ? "pdf" : "file",
        title: name,
        body: `Reference only — original name preserved. Binary not stored in this prototype.`,
        sourceRef: name,
        unsupported: true,
        unsupportedReason: "Binary payload not stored — stub keeps the reference",
      });
      setState(next);
      window.location.href = viewHref(deckId, item.id);
    }
  }

  function prepareVault() {
    if (!state || !deck) return;
    const chosen = items.filter((i) => selected.has(i.id));
    if (chosen.length === 0) {
      window.alert("Select one or more items first.");
      return;
    }
    const note =
      window.prompt(
        "Optional note for human review (Vault does not auto-authorize)",
        ""
      ) ?? "";
    createVaultPrep({
      deckId: deck.id,
      deckTitle: deck.title,
      items: chosen.map((i) => ({
        id: i.id,
        title: i.title,
        kind: i.kind,
        sourceRef: i.sourceRef,
      })),
      note,
    });
    setSelected(new Set());
    setDeckMenuOpen(false);
    window.location.href = "/forge/vault";
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
        <Link
          href={parentHref()}
          className="rounded px-1 py-0.5 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          ← Folder
        </Link>
        <span aria-hidden>/</span>
        <span className="text-zinc-400">{deck.view === "active" ? "Active" : "Archive"}</span>
      </nav>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-zinc-100">{deck.title}</h2>
          <p className="text-xs text-zinc-500">
            Cumulative container — select items to prepare toward Vault (human review).
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
            <div
              role="menu"
              className="absolute right-0 z-10 mt-1 w-52 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
            >
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
                Change view ({layout === "list" ? "→ grid" : "→ list"})
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  handleCreate("text");
                  setDeckMenuOpen(false);
                }}
              >
                Add content (text)
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={prepareVault}
              >
                Prepare for Vault ({selected.size})
              </button>
              <button
                type="button"
                role="menuitem"
                disabled
                className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-zinc-600"
                title="Move between folders not implemented — DEBT / not exposed as functional"
              >
                Move (soon)
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
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    setState(restoreDeck(state, deck.id));
                    setDeckMenuOpen(false);
                    window.location.href = "/forge/active";
                  }}
                >
                  Restore to Active
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {stats ? (
        <dl className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-center text-xs sm:grid-cols-6">
          <div>
            <dt className="text-zinc-500">Items</dt>
            <dd className="text-base font-semibold text-zinc-100">{stats.items}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Recent</dt>
            <dd className="text-base font-semibold text-zinc-100">{stats.recent}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Later</dt>
            <dd className="text-base font-semibold text-zinc-100">{stats.markedLater}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Stubs</dt>
            <dd className="text-base font-semibold text-zinc-100">{stats.stubs}</dd>
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

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-900/50 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">
          <span>{selected.size} selected</span>
          <button
            type="button"
            className="rounded-md border border-sky-800 px-2 py-1 text-xs font-medium"
            onClick={prepareVault}
          >
            Prepare for Vault
          </button>
          <button
            type="button"
            className="text-xs text-sky-400 underline"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
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
        <p className="text-sm text-zinc-600">No content yet — add text, link, image URL, or a file/PDF stub.</p>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <div className="absolute left-2 top-2 z-[1]">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={`Select ${item.title}`}
                  className="h-4 w-4"
                />
              </div>
              <Link
                href={viewHref(deckId, item.id)}
                className="block min-h-[6.5rem] px-3 py-3 pl-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
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
                onDuplicate={() => {
                  const result = duplicateContent(state, item.id);
                  if (result) setState(result.state);
                  setMenuId(null);
                }}
                onMarkLater={() => {
                  setState(setMarkedForLater(state, item.id, !item.markedForLater));
                  setMenuId(null);
                }}
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
              <label className="flex items-center px-2">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={`Select ${item.title}`}
                  className="h-4 w-4"
                />
              </label>
              <Link
                href={viewHref(deckId, item.id)}
                className="min-w-0 flex-1 px-2 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
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
                  onDuplicate={() => {
                    const result = duplicateContent(state, item.id);
                    if (result) setState(result.state);
                    setMenuId(null);
                  }}
                  onMarkLater={() => {
                    setState(setMarkedForLater(state, item.id, !item.markedForLater));
                    setMenuId(null);
                  }}
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
        Deck id <code className="text-zinc-500">{deck.id}</code> ·{" "}
        <Link href="/forge/vault" className="underline">
          Vault prep queue
        </Link>
      </p>
    </div>
  );
}

function ItemMenu({
  item,
  open,
  onToggle,
  onDuplicate,
  onMarkLater,
  onMoveUp,
  onMoveDown,
  onRemove,
  floating = false,
}: {
  item: Af03ContentItem;
  open: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onMarkLater: () => void;
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
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href={viewHref(item.deckId, item.id)}
            className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Open (Viewer)
          </Link>
          <Link
            role="menuitem"
            href={itemHref(item.deckId, item.id)}
            className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Edit
          </Link>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onDuplicate}
          >
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onMarkLater}
          >
            {item.markedForLater ? "Unmark later" : "Mark for later"}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-zinc-600"
          >
            Move (soon)
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onMoveUp}
          >
            Reorder up
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onMoveDown}
          >
            Reorder down
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-zinc-800"
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
