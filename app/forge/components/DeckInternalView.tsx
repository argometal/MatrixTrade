"use client";

/**
 * CHANGE 24-39 — Chaos Deck as capture + recovery space.
 * Classic dump capture · full-content search · denser grid · optional titles.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createFragment } from "@/lib/argusforge/af03-builder-store";
import {
  buildExchangePackage,
  downloadExchangePackage,
} from "@/lib/argusforge/af03-exchange-export";
import {
  filterDeckItems,
  fragmentDisplayTitle,
  fragmentFirstImageAssetId,
  fragmentPreviewText,
} from "@/lib/argusforge/af03-deck-search";
import {
  archiveDeck,
  createContent,
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
  updateContent,
  viewHref,
} from "@/lib/argusforge/af03-repo-store";
import { createVaultPrep } from "@/lib/argusforge/af03-vault-prep-store";
import type { Af03ContentItem, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { UNASSIGNED_REALM_ID } from "@/lib/argusforge/af03-repo-types";
import { realmHref } from "@/lib/argusforge/af03-realm-map";
import {
  chaosAssetsAvailability,
  createObjectUrl,
  revokeObjectUrl,
} from "@/lib/argusforge/af03-chaos-assets-idb";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { CreationMenu, type CreateAction } from "./CreationMenu";
import { DeckCaptureComposer } from "./DeckCaptureComposer";
import { EntityLocationBreadcrumb } from "./EntityLocationNav";
import { ForgeOverflowMenu } from "./ForgeOverflowMenu";
import { AF_LABEL, AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";

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

function kindHint(item: Af03ContentItem): string | null {
  const bits: string[] = [];
  if (item.unsupported) bits.push("stub");
  if (item.markedForLater) bits.push("later");
  if (item.kind === "link") bits.push("link");
  return bits.length ? bits.join(" · ") : null;
}

/** AF03 §6 + 24-39 — Chaos Deck internal view. */
export function DeckInternalView({ deckId }: Props) {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const repo = recordDeckOpen(emptyOrSeedRepo(), deckId);
    setState(repo);
  }, [deckId]);

  const deck = state ? getDeck(state, deckId) : undefined;
  const allItems = useMemo(
    () => (state ? listItemsInDeck(state, deckId) : []),
    [state, deckId]
  );
  const items = useMemo(
    () => (state ? filterDeckItems(state, deckId, query) : []),
    [state, deckId, query]
  );
  const stats = state ? deckStats(state, deckId) : null;
  const layout = state?.prefs.deckInternalLayout ?? "list";
  const searching = query.trim().length > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function prepareVault() {
    if (!state || !deck) return;
    const chosen = allItems.filter((i) => selected.has(i.id));
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

  function createBuilderFragment() {
    if (!state || !deck) return;
    const { state: next, fragment } = createFragment(state, deck.id);
    setState(next);
    setDeckMenuOpen(false);
    window.location.href = itemHref(deck.id, fragment.id);
  }

  function exportNeutralPackage() {
    if (!state || !deck) return;
    const pkg = buildExchangePackage(state, deck.id);
    if (!pkg) {
      window.alert("Could not build exchange package for this deck.");
      return;
    }
    downloadExchangePackage(pkg);
    setDeckMenuOpen(false);
  }

  /** Secondary limited stubs — File/PDF. Structured opens Builder. */
  function handleSecondaryCreate(action: CreateAction) {
    if (!state || !deck) return;
    if (action === "structured") {
      createBuilderFragment();
      return;
    }
    if (action === "file" || action === "pdf") {
      const name =
        action === "pdf" ? "document.pdf" : "file.bin";
      const { state: next } = createContent(state, {
        deckId,
        kind: action === "pdf" ? "pdf" : "file",
        title: name,
        body: `Reference only — original name preserved. Binary not stored in this prototype.`,
        sourceRef: name,
        unsupported: true,
        unsupportedReason: "Binary payload not stored — stub keeps the reference",
      });
      setState(next);
    }
  }

  function renameFragment(item: Af03ContentItem) {
    if (!state) return;
    const title = promptTitle("Rename Fragment", item.title);
    if (title === null) return;
    setState(updateContent(state, item.id, { title: title || "Untitled note" }));
    setMenuId(null);
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
    <div className="min-w-0 space-y-4 pb-4">
      <Af03RepoDisclosure compact />
      <EntityLocationBreadcrumb state={state} deckId={deckId} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-zinc-100">{deck.title}</h2>
          <p className={`text-xs ${AF_TEXT.metadata}`}>
            Capture, find, and review material in this Deck.
          </p>
        </div>
        <div className="shrink-0">
          <ForgeOverflowMenu
            open={deckMenuOpen}
            onOpenChange={setDeckMenuOpen}
            label="Deck menu"
            menuWidthPx={208}
            triggerClassName="min-h-11 min-w-11 rounded-lg border border-zinc-800 text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            items={[
              {
                id: "rename",
                label: "Rename Deck",
                onClick: () => {
                  const title = promptTitle("Rename Chaos Deck", deck.title);
                  if (!title) return;
                  setState(renameDeck(state, deck.id, title));
                },
              },
              {
                id: "layout",
                label: `Change view (${layout === "list" ? "→ grid" : "→ list"})`,
                onClick: () => {
                  setState(setDeckInternalLayout(state, layout === "list" ? "grid" : "list"));
                },
              },
              {
                id: "new-builder",
                label: "Structured Fragment",
                onClick: createBuilderFragment,
              },
              {
                id: "export",
                label: "Export exchange JSON",
                onClick: exportNeutralPackage,
              },
              {
                id: "vault",
                label: `Prepare for Vault (${selected.size})`,
                onClick: prepareVault,
              },
              {
                id: "argus-move",
                label: "Move deck in Argus…",
                onClick: () => {
                  window.location.href = realmHref(deck.folderId ?? UNASSIGNED_REALM_ID, {
                    deckId: deck.id,
                  });
                },
              },
              {
                id: "argus-units",
                label: "Regroup fragments in Argus…",
                onClick: () => {
                  window.location.href = "/forge/argus/units";
                },
              },
              deck.view === "active"
                ? {
                    id: "archive",
                    label: "Archive",
                    onClick: () => {
                      setState(archiveDeck(state, deck.id));
                      window.location.href = "/forge/archive";
                    },
                  }
                : {
                    id: "restore",
                    label: "Restore to Active",
                    onClick: () => {
                      setState(restoreDeck(state, deck.id));
                      window.location.href = "/forge/active";
                    },
                  },
            ]}
          />
        </div>
      </div>

      {stats ? (
        <dl className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800/70 bg-zinc-900/30 px-3 py-2 text-center text-xs sm:grid-cols-6">
          <div>
            <dt className={AF_TEXT.metadata}>{AF_LABEL.fragments}</dt>
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

      <DeckCaptureComposer
        state={state}
        deckId={deck.id}
        deckTitle={deck.title}
        onSaved={(next) => setState(next)}
      />

      <CreationMenu scope="deck" onAction={handleSecondaryCreate} />

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

      <div className="space-y-2">
        <label className="sr-only" htmlFor="deck-search">
          Search this Deck
        </label>
        <div className="flex gap-2">
          <input
            id="deck-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this Deck…"
            autoComplete="off"
            className="min-h-11 w-full flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          />
          {searching ? (
            <button
              type="button"
              className="min-h-11 shrink-0 rounded-xl border border-zinc-700 px-3 text-sm text-zinc-300 hover:text-zinc-100"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          ) : null}
        </div>
        {searching ? (
          <p className="text-[11px] text-zinc-500">
            {items.length} match{items.length === 1 ? "" : "es"} in title, body, blocks, links &amp; filenames
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Fragments ({searching ? `${items.length}/${allItems.length}` : allItems.length})
        </h3>
        <div
          className="flex rounded-lg border border-zinc-800 p-0.5 text-xs"
          role="group"
          aria-label="Content layout"
        >
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

      {allItems.length === 0 ? (
        <p className={`text-sm ${AF_TEXT.metadata}`}>
          No fragments yet — capture above. Same pattern as Chaos Dumping; destination is this Deck.
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-6 text-center text-sm text-zinc-500">
          No matches for “{query.trim()}”.{" "}
          <button type="button" className="underline" onClick={() => setQuery("")}>
            Clear
          </button>
        </p>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`relative flex flex-col overflow-hidden rounded-xl border bg-zinc-900 shadow-sm ${
                searching
                  ? "border-emerald-700/50 ring-1 ring-emerald-500/25"
                  : "border-zinc-700/50"
              }`}
            >
              <div className="absolute left-1.5 top-1.5 z-[1]">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={`Select ${fragmentDisplayTitle(item)}`}
                  className="h-3.5 w-3.5 accent-emerald-500"
                />
              </div>
              <ItemMenu
                item={item}
                floating
                open={menuId === item.id}
                onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                onRename={() => renameFragment(item)}
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
                onRegroupInArgus={() => {
                  setMenuId(null);
                  window.location.href = "/forge/argus/units";
                }}
                onRemove={() => {
                  if (
                    !window.confirm(
                      `Delete Fragment “${fragmentDisplayTitle(item)}” and its blocks? This cannot be undone.`
                    )
                  ) {
                    return;
                  }
                  setState(removeContent(state, item.id));
                  setMenuId(null);
                }}
              />
              <Link
                href={itemHref(deckId, item.id)}
                className="flex min-h-0 flex-1 flex-col gap-1.5 px-2.5 pb-2.5 pt-7 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <GridThumb state={state} item={item} />
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-50">
                  {fragmentDisplayTitle(item)}
                </p>
                {fragmentPreviewText(item) ? (
                  <p className="line-clamp-5 whitespace-pre-line text-[15px] leading-[1.35] text-zinc-300">
                    {fragmentPreviewText(item)}
                  </p>
                ) : (
                  <p className="text-[13px] text-zinc-500">Empty capture</p>
                )}
                {kindHint(item) ? (
                  <span className="mt-auto pt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    {kindHint(item)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-stretch bg-zinc-950 ${
                searching ? "ring-1 ring-inset ring-emerald-500/30" : ""
              }`}
            >
              <label className="flex items-center px-2">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  aria-label={`Select ${fragmentDisplayTitle(item)}`}
                  className="h-4 w-4"
                />
              </label>
              <Link
                href={itemHref(deckId, item.id)}
                className="min-w-0 flex-1 px-2 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-zinc-100">
                    {fragmentDisplayTitle(item)}
                  </p>
                  {kindHint(item) ? (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">
                      {kindHint(item)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {formatTime(item.updatedAt)}
                  {item.unsupported && item.unsupportedReason
                    ? ` · ${item.unsupportedReason}`
                    : ""}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-400">
                  {fragmentPreviewText(item, 160) || "—"}
                </p>
              </Link>
              <div className="relative border-l border-zinc-800">
                <ItemMenu
                  item={item}
                  open={menuId === item.id}
                  onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                  onRename={() => renameFragment(item)}
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
                  onRegroupInArgus={() => {
                    setMenuId(null);
                    window.location.href = "/forge/argus/units";
                  }}
                  onRemove={() => {
                    if (
                      !window.confirm(
                        `Delete Fragment “${fragmentDisplayTitle(item)}” and its blocks? This cannot be undone.`
                      )
                    ) {
                      return;
                    }
                    setState(removeContent(state, item.id));
                    setMenuId(null);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={`text-[11px] ${AF_TEXT.disabled}`}>
        <Link href="/forge/vault" className="underline">
          Vault prep queue
        </Link>
      </p>
    </div>
  );
}

function GridThumb({
  state,
  item,
}: {
  state: Af03RepoState;
  item: Af03ContentItem;
}) {
  const assetId = fragmentFirstImageAssetId(state, item.id);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    const avail = chaosAssetsAvailability();
    if (!avail.ok) {
      setUrl(null);
      return;
    }
    createObjectUrl(assetId)
      .then((u) => {
        if (!active) {
          if (u) revokeObjectUrl(u);
          return;
        }
        if (!u) {
          setUrl(null);
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
      if (objectUrl) revokeObjectUrl(objectUrl);
    };
  }, [assetId]);

  if (!assetId) return null;
  if (!url) {
    return (
      <span
        className="mb-0.5 flex h-16 w-full items-center justify-center rounded-lg bg-zinc-800/80 text-[10px] uppercase tracking-wide text-zinc-500"
        aria-hidden
      >
        Image
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="mb-0.5 h-16 w-full rounded-lg object-cover"
    />
  );
}

function ItemMenu({
  item,
  open,
  onToggle,
  onRename,
  onDuplicate,
  onMarkLater,
  onMoveUp,
  onMoveDown,
  onRegroupInArgus,
  onRemove,
  floating = false,
}: {
  item: Af03ContentItem;
  open: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onMarkLater: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRegroupInArgus: () => void;
  onRemove: () => void;
  floating?: boolean;
}) {
  return (
    <div
      className={
        floating
          ? "absolute right-1 top-1 z-[2]"
          : "relative h-full border-l border-zinc-800"
      }
    >
      <ForgeOverflowMenu
        open={open}
        onOpenChange={(next) => {
          if (next !== open) onToggle();
        }}
        label={`Menu for ${fragmentDisplayTitle(item)}`}
        triggerClassName={
          floating
            ? "flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            : "flex h-full min-h-11 min-w-11 items-center justify-center px-3 text-zinc-400 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        }
        items={[
          {
            id: "view",
            label: "Open (Viewer)",
            onClick: () => {
              window.location.href = viewHref(item.deckId, item.id);
            },
          },
          {
            id: "edit",
            label: "Edit",
            onClick: () => {
              window.location.href = itemHref(item.deckId, item.id);
            },
          },
          { id: "rename", label: "Rename…", onClick: onRename },
          { id: "dup", label: "Duplicate", onClick: onDuplicate },
          {
            id: "later",
            label: item.markedForLater ? "Unmark later" : "Mark for later",
            onClick: onMarkLater,
          },
          { id: "regroup", label: "Regroup in Argus…", onClick: onRegroupInArgus },
          { id: "up", label: "Reorder up", onClick: onMoveUp },
          { id: "down", label: "Reorder down", onClick: onMoveDown },
          { id: "delete", label: "Delete…", onClick: onRemove, danger: true },
        ]}
      />
    </div>
  );
}
