"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  moveContentToDeck,
  removeContent,
  renameDeck,
  restoreDeck,
  setDeckInternalLayout,
  setMarkedForLater,
  updateContent,
  viewHref,
} from "@/lib/argusforge/af03-repo-store";
import { createVaultPrep } from "@/lib/argusforge/af03-vault-prep-store";
import type { Af03ChaosDeck, Af03ContentItem, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { ChaosCaptureSurface } from "./ChaosCaptureSurface";
import { CreationMenu, type CreateAction } from "./CreationMenu";

type Props = {
  deckId: string;
};

/**
 * Chaos Θήκη (Theke) — binder of dumps.
 * Route ids still use `deck` for storage compatibility; UI says Theke / Dump.
 */

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

export function DeckInternalView({ deckId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);

  useEffect(() => {
    setState(emptyOrSeedRepo());
  }, []);

  const deck = state ? getDeck(state, deckId) : undefined;
  const items = useMemo(() => (state ? listItemsInDeck(state, deckId) : []), [state, deckId]);
  const stats = state ? deckStats(state, deckId) : null;
  const layout = state?.prefs.deckInternalLayout ?? "list";
  const otherThekes = useMemo(
    () => (state ? state.decks.filter((d) => d.id !== deckId) : []),
    [state, deckId]
  );

  function parentHref(): string {
    if (!deck) return "/forge/active";
    const base = deck.view === "active" ? "/forge/active" : "/forge/archive";
    return deck.folderId ? `${base}/f/${deck.folderId}` : base;
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
      setDeckMenuOpen(false);
      setCaptureOpen(true);
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
        action === "pdf" ? "PDF name (stub)" : "File name (stub)",
        action === "pdf" ? "document.pdf" : "file.bin"
      );
      if (!name) return;
      const { state: next, item } = createContent(state, {
        deckId,
        kind: action === "pdf" ? "pdf" : "file",
        title: name,
        body: `Reference only — binary not stored in this prototype.`,
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
      window.alert("Select one or more dumps first.");
      return;
    }
    const note =
      window.prompt("Optional note for human review (Vault does not auto-authorize)", "") ?? "";
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
    return <p className="text-sm text-zinc-500">Loading Theke…</p>;
  }

  if (!deck) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Theke not found (id is identity).
        </p>
        <Link href="/forge/active" className="text-sm text-zinc-300 underline">
          Back to Active
        </Link>
      </div>
    );
  }

  function saveCapture(payload: { title: string; body: string }) {
    if (!state) return;
    const { state: next, item } = createContent(state, {
      deckId,
      kind: "text",
      title: payload.title,
      body: payload.body,
    });
    setState(next);
    setCaptureOpen(false);
    window.location.href = viewHref(deckId, item.id);
  }

  return (
    <div className="space-y-4">
      {captureOpen ? (
        <ChaosCaptureSurface
          deckTitle={deck.title}
          onCancel={() => setCaptureOpen(false)}
          onSave={saveCapture}
        />
      ) : null}
      <Af03RepoDisclosure />

      <nav aria-label="Theke location" className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500/90">
            Θήκη · Theke
          </p>
          <h2 className="truncate text-lg font-semibold text-zinc-100">{deck.title}</h2>
          <p className="text-xs text-zinc-500">
            Binder of dumps — pour capture in; not a topic ontology.
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Theke menu"
            aria-expanded={deckMenuOpen}
            className="min-h-11 min-w-11 rounded-lg border border-zinc-800 text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={() => setDeckMenuOpen(!deckMenuOpen)}
          >
            ⋯
          </button>
          {deckMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-1 max-h-[70vh] w-52 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  const title = promptTitle("Rename Theke", deck.title);
                  if (!title) return;
                  setState(renameDeck(state, deck.id, title));
                  setDeckMenuOpen(false);
                }}
              >
                Rename Theke
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
                  setCaptureOpen(true);
                  setDeckMenuOpen(false);
                }}
              >
                Dump text
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={prepareVault}
              >
                Prepare for Vault ({selected.size})
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
                  Archive Theke
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
                  Restore Theke
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {stats ? (
        <dl className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-center text-xs sm:grid-cols-6">
          <div>
            <dt className="text-zinc-600">Dumps</dt>
            <dd className="font-semibold text-zinc-100">{stats.items}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Later</dt>
            <dd className="font-semibold text-zinc-100">{stats.markedLater}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Updated</dt>
            <dd className="font-semibold text-zinc-100">{formatTime(stats.lastModified)}</dd>
          </div>
        </dl>
      ) : null}

      {/* Collapsible ingest — temporary until capture IA settles */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/50">
        <button
          type="button"
          aria-expanded={ingestOpen}
          onClick={() => setIngestOpen((o) => !o)}
          className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-zinc-100">Dump into Theke</span>
            <span className="block text-[11px] text-zinc-500">
              {ingestOpen ? "Capture actions" : "Collapsed — tap to add dumps"}
            </span>
          </span>
          <span className="text-zinc-500">{ingestOpen ? "▾" : "▸"}</span>
        </button>
        {ingestOpen ? (
          <div className="border-t border-zinc-800 px-3 py-3">
            <CreationMenu scope="deck" onAction={handleCreate} />
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dumps</h3>
        <div className="inline-flex rounded-lg border border-zinc-800 p-0.5 text-xs">
          <button
            type="button"
            aria-pressed={layout === "list"}
            className={`min-h-9 rounded-md px-2.5 ${
              layout === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
            }`}
            onClick={() => setState(setDeckInternalLayout(state, "list"))}
          >
            List
          </button>
          <button
            type="button"
            aria-pressed={layout === "grid"}
            className={`min-h-9 rounded-md px-2.5 ${
              layout === "grid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
            }`}
            onClick={() => setState(setDeckInternalLayout(state, "grid"))}
          >
            Grid
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-600">Empty Theke — dump text, link, image URL, or a stub.</p>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="relative rounded-lg border border-zinc-800 bg-zinc-950">
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
                className="block min-h-[6.5rem] px-3 py-3 pl-9 pr-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Dump · {kindLabel(item)}
                </span>
                <p className="mt-1 font-medium text-zinc-100">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.body || "—"}</p>
              </Link>
              <DumpMenu
                item={item}
                otherThekes={otherThekes}
                floating
                open={menuId === item.id}
                onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                onClose={() => setMenuId(null)}
                onRename={() => {
                  const title = promptTitle("Rename dump", item.title);
                  if (!title) return;
                  setState(updateContent(state, item.id, { title }));
                  setMenuId(null);
                }}
                onMoveTo={(targetId) => {
                  setState(moveContentToDeck(state, item.id, targetId));
                  setMenuId(null);
                }}
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
                  if (!window.confirm("Remove this dump from the Theke?")) return;
                  setState(removeContent(state, item.id));
                  setMenuId(null);
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
          {items.map((item) => (
            <li key={item.id} className="relative flex items-stretch bg-zinc-950">
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
                    Dump · {kindLabel(item)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {formatTime(item.updatedAt)}
                  {item.unsupported && item.unsupportedReason ? ` · ${item.unsupportedReason}` : ""}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-600">{item.body || "—"}</p>
              </Link>
              <div className="relative shrink-0 border-l border-zinc-800">
                <DumpMenu
                  item={item}
                  otherThekes={otherThekes}
                  open={menuId === item.id}
                  onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                  onClose={() => setMenuId(null)}
                  onRename={() => {
                    const title = promptTitle("Rename dump", item.title);
                    if (!title) return;
                    setState(updateContent(state, item.id, { title }));
                    setMenuId(null);
                  }}
                  onMoveTo={(targetId) => {
                    setState(moveContentToDeck(state, item.id, targetId));
                    setMenuId(null);
                  }}
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
                    if (!window.confirm("Remove this dump from the Theke?")) return;
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
        Theke id <code className="text-zinc-500">{deck.id}</code> ·{" "}
        <Link href="/forge/vault" className="underline">
          Vault prep queue
        </Link>
      </p>
    </div>
  );
}

function DumpMenu({
  item,
  otherThekes,
  open,
  onToggle,
  onClose,
  onRename,
  onMoveTo,
  onDuplicate,
  onMarkLater,
  onMoveUp,
  onMoveDown,
  onRemove,
  floating = false,
}: {
  item: Af03ContentItem;
  otherThekes: Af03ChaosDeck[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRename: () => void;
  onMoveTo: (thekeId: string) => void;
  onDuplicate: () => void;
  onMarkLater: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  floating?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    const r = btnRef.current.getBoundingClientRect();
    const menuH = 360;
    const openUp = r.bottom + menuH > window.innerHeight - 16;
    const left = Math.min(Math.max(8, r.right - 176), window.innerWidth - 184);
    setPos({
      top: openUp ? r.top - 8 : r.bottom + 4,
      left,
      openUp,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      const menu = document.getElementById(`dump-menu-${item.id}`);
      if (menu?.contains(t)) return;
      onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose, item.id]);

  return (
    <div className={floating ? "absolute right-1 top-1 z-20" : "relative h-full"}>
      <button
        ref={btnRef}
        type="button"
        aria-label={`Menu for dump ${item.title}`}
        aria-expanded={open}
        className="flex h-full min-h-11 min-w-11 items-center justify-center px-3 text-zinc-400 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        onClick={onToggle}
      >
        ⋯
      </button>
      {open && pos ? (
        <div
          id={`dump-menu-${item.id}`}
          role="menu"
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.openUp ? undefined : pos.top,
            bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
            zIndex: 80,
          }}
          className="max-h-[min(70vh,22rem)] w-44 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
        >
          <Link
            role="menuitem"
            href={viewHref(item.deckId, item.id)}
            className="block px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Open (Viewer)
          </Link>
          <Link
            role="menuitem"
            href={itemHref(item.deckId, item.id)}
            className="block px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Edit
          </Link>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onRename}
          >
            Rename dump
          </button>
          {otherThekes.length > 0 ? (
            <div className="border-t border-zinc-800 py-1">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-600">
                Move to Theke
              </p>
              {otherThekes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="menuitem"
                  className="block w-full truncate px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => onMoveTo(t.id)}
                >
                  → {t.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-600">
              No other Theke to move into
            </p>
          )}
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onDuplicate}
          >
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onMarkLater}
          >
            {item.markedForLater ? "Unmark later" : "Mark for later"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onMoveUp}
          >
            Reorder up
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={onMoveDown}
          >
            Reorder down
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-zinc-800"
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
