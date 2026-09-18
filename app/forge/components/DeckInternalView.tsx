"use client";

/**
 * CHANGE 24-39 — Chaos Deck as capture + recovery space.
 * AlgoApp-equivalent chrome: Review | Cards | Front/Back editor.
 * Ontology unchanged: fragment title = Front, body = Back. No SRS.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
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
} from "@/lib/argusforge/af03-repo-store";
import { createVaultPrep } from "@/lib/argusforge/af03-vault-prep-store";
import type { Af03ContentItem, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { UNASSIGNED_REALM_ID } from "@/lib/argusforge/af03-repo-types";
import { realmHref } from "@/lib/argusforge/af03-realm-map";
import { fragmentModeHref } from "@/lib/argusforge/af03-entity-path";
import {
  chaosAssetsAvailability,
  createObjectUrl,
  revokeObjectUrl,
} from "@/lib/argusforge/af03-chaos-assets-idb";
import { DeckCaptureComposer } from "./DeckCaptureComposer";
import { ForgeOverflowMenu } from "./ForgeOverflowMenu";
import { filesFromDrop, filesFromPaste, MaterialImageAttach } from "./MaterialImageAttach";
import {
  appendImageFilesToDraft,
  persistChaosDumpCapture,
  revokeAllDraftImages,
  revokeDraftImage,
  type ChaosDraftImage,
} from "@/lib/argusforge/af03-chaos-dump-images";

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
  const [tab, setTab] = useState<"review" | "cards">("review");
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [dumpOpen, setDumpOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [titleOpen, setTitleOpen] = useState(false);
  const [newChromeOpen, setNewChromeOpen] = useState(false);
  const [draftImages, setDraftImages] = useState<ChaosDraftImage[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const draftImagesRef = useRef<ChaosDraftImage[]>([]);

  useEffect(() => {
    const repo = recordDeckOpen(emptyOrSeedRepo(), deckId);
    setState(repo);
  }, [deckId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "card") {
      setTab("cards");
      setNewCardOpen(true);
    }
  }, [deckId]);

  useEffect(() => {
    draftImagesRef.current = draftImages;
  }, [draftImages]);

  useEffect(() => {
    return () => {
      revokeAllDraftImages(draftImagesRef.current);
    };
  }, []);

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

  function acceptDraftImages(files: File[]) {
    if (files.length === 0) return;
    setNewChromeOpen(true);
    setDraftImages((prev) => {
      const { drafts, error } = appendImageFilesToDraft(prev, files);
      setImageNotice(error ? error.message : null);
      return drafts;
    });
  }

  function closeNewCard() {
    revokeAllDraftImages(draftImages);
    setDraftImages([]);
    setFront("");
    setBack("");
    setTitleOpen(false);
    setNewChromeOpen(false);
    setImageNotice(null);
    setNewCardOpen(false);
  }

  async function saveNewCard() {
    if (!state || !deck) return;
    if (!front.trim() && !back.trim() && draftImages.length === 0) return;
    setImageBusy(true);
    setImageNotice(null);
    try {
      if (draftImages.length > 0 || back.trim()) {
        const result = await persistChaosDumpCapture(state, {
          deckId: deck.id,
          text: back,
          images: draftImages,
        });
        if (!result.ok) {
          setImageNotice(result.error.message);
          return;
        }
        let next = result.state;
        if (front.trim()) {
          next = updateContent(next, result.item.id, { title: front.trim() });
        }
        setState(next);
      } else {
        const { state: next } = createContent(state, {
          deckId: deck.id,
          kind: "text",
          title: front.trim() || "Untitled note",
          body: back,
        });
        setState(next);
      }
      revokeAllDraftImages(draftImages);
      setDraftImages([]);
      setFront("");
      setBack("");
      setTitleOpen(false);
      setNewChromeOpen(false);
      setNewCardOpen(false);
      setTab("cards");
    } finally {
      setImageBusy(false);
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
    return <p className="text-sm text-slate-500">Loading deck…</p>;
  }

  if (!deck) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-600">
          Deck not found.
        </p>
        <Link href="/forge/active" className="text-sm text-[#2f80ed] underline">
          Back to My Decks
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-w-0 w-full space-y-4 pb-16 lg:pb-4">
      <header className="flex items-center gap-2">
        <Link
          href="/forge/active"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white"
          aria-label="Back to My Decks"
        >
          ‹
        </Link>
        <h2 className="min-w-0 flex-1 truncate text-[20px] font-semibold tracking-tight text-slate-900">
          {deck.title}
        </h2>
        <ForgeOverflowMenu
          open={deckMenuOpen}
          onOpenChange={setDeckMenuOpen}
          label="Deck menu"
          menuWidthPx={220}
          variant="light"
          triggerClassName="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-white"
          items={[
            {
              id: "rename",
              label: "Rename",
              onClick: () => {
                const title = promptTitle("Rename deck", deck.title);
                if (!title) return;
                setState(renameDeck(state, deck.id, title));
              },
            },
            {
              id: "new-card",
              label: "New material",
              onClick: () => {
                setTab("cards");
                setNewCardOpen(true);
              },
            },
            {
              id: "dump",
              label: "Dump capture…",
              onClick: () => setDumpOpen((v) => !v),
            },
            {
              id: "builder",
              label: "Structured fragment",
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
              label: "Move in Argus…",
              onClick: () => {
                window.location.href = realmHref(deck.folderId ?? UNASSIGNED_REALM_ID, {
                  deckId: deck.id,
                });
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
                  label: "Restore",
                  onClick: () => {
                    setState(restoreDeck(state, deck.id));
                    window.location.href = "/forge/active";
                  },
                },
          ]}
        />
      </header>

      <div className="flex rounded-full bg-white p-1 shadow-sm" role="tablist" aria-label="Deck">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "review"}
          className={`min-h-10 flex-1 rounded-full text-sm font-semibold ${
            tab === "review" ? "bg-[#2f80ed] text-white" : "text-slate-500"
          }`}
          onClick={() => setTab("review")}
        >
          Browse
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cards"}
          className={`min-h-10 flex-1 rounded-full text-sm font-semibold ${
            tab === "cards" ? "bg-[#2f80ed] text-white" : "text-slate-500"
          }`}
          onClick={() => setTab("cards")}
        >
          Material
        </button>
      </div>

      {stats ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            ["Fragments", String(stats.items)],
            ["Recent", String(stats.recent)],
            ["Later", String(stats.markedLater)],
            ["Stubs", String(stats.stubs)],
            ["Links", String(stats.links)],
            ["Updated", formatTime(stats.lastModified)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white px-3 py-2.5 text-center shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-0.5 text-base font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {dumpOpen ? (
        <DeckCaptureComposer
          state={state}
          deckId={deck.id}
          deckTitle={deck.title}
          onSaved={(next) => {
            setState(next);
            setDumpOpen(false);
          }}
        />
      ) : null}

      {tab === "review" ? (
        <section className="space-y-4">
          {allItems.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-sm text-slate-500">No material yet.</p>
              <button
                type="button"
                className="mt-4 min-h-11 rounded-lg bg-[#2f80ed] px-5 text-sm font-semibold text-white"
                onClick={() => {
                  setTab("cards");
                  setNewCardOpen(true);
                }}
              >
                New material
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Material</h3>
                <span className="text-sm text-slate-400">{allItems.length}</span>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {allItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={fragmentModeHref(deck.id, item.id, "classic")}
                      className="block min-h-[10rem] overflow-hidden rounded-xl bg-white px-4 py-4 shadow-sm"
                    >
                      <p className="line-clamp-3 text-[15px] font-semibold leading-snug text-slate-900">
                        {fragmentDisplayTitle(item)}
                      </p>
                      <GridThumb state={state} item={item} />
                      {fragmentPreviewText(item) ? (
                        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-500">
                          {fragmentPreviewText(item)}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#e8f2ff] px-3 py-2 text-sm text-slate-700">
              <span>{selected.size} selected</span>
              <button type="button" className="font-semibold text-[#2f80ed]" onClick={prepareVault}>
                Prepare for Vault
              </button>
              <button type="button" className="text-slate-500" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <input
              id="deck-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search material…"
              autoComplete="off"
              className="min-h-11 w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
            />
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs" role="group">
              <button
                type="button"
                className={`min-h-10 rounded-lg px-2.5 font-medium ${
                  layout === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400"
                }`}
                onClick={() => setState(setDeckInternalLayout(state, "list"))}
              >
                List
              </button>
              <button
                type="button"
                className={`min-h-10 rounded-lg px-2.5 font-medium ${
                  layout === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400"
                }`}
                onClick={() => setState(setDeckInternalLayout(state, "grid"))}
              >
                Grid
              </button>
            </div>
          </div>

          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-semibold text-[#2f80ed]"
            onClick={() => setNewCardOpen(true)}
          >
            + New material
          </button>

          {allItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No material yet.</p>
          ) : items.length === 0 ? (
            <p className="rounded-xl bg-white px-3 py-8 text-center text-sm text-slate-500 shadow-sm">
              No matches for “{query.trim()}”.
            </p>
          ) : layout === "grid" ? (
            <ul className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
              {items.map((item) => (
                <li key={item.id} className="relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
                  <div className="absolute left-1.5 top-1.5 z-[1]">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${fragmentDisplayTitle(item)}`}
                      className="h-3.5 w-3.5 accent-[#2f80ed]"
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
                          `Delete “${fragmentDisplayTitle(item)}”? This cannot be undone.`
                        )
                      ) {
                        return;
                      }
                      setState(removeContent(state, item.id));
                      setMenuId(null);
                    }}
                  />
                  <Link
                    href={fragmentModeHref(deckId, item.id, "classic")}
                    className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 pb-3 pt-7"
                  >
                    <GridThumb state={state} item={item} />
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">
                      {fragmentDisplayTitle(item)}
                    </p>
                    <p className="line-clamp-4 whitespace-pre-line text-sm leading-snug text-slate-500">
                      {fragmentPreviewText(item) || "Empty"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {items.map((item) => (
                <li key={item.id} className="flex items-stretch border-b border-slate-100 last:border-b-0">
                  <label className="flex items-center px-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${fragmentDisplayTitle(item)}`}
                      className="h-4 w-4 accent-[#2f80ed]"
                    />
                  </label>
                  <Link href={fragmentModeHref(deckId, item.id, "classic")} className="min-w-0 flex-1 px-2 py-3">
                    <p className="truncate font-medium text-slate-900">{fragmentDisplayTitle(item)}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                      {fragmentPreviewText(item, 160) || "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatTime(item.updatedAt)}
                      {kindHint(item) ? ` · ${kindHint(item)}` : ""}
                    </p>
                  </Link>
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
                          `Delete “${fragmentDisplayTitle(item)}”? This cannot be undone.`
                        )
                      ) {
                        return;
                      }
                      setState(removeContent(state, item.id));
                      setMenuId(null);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {newCardOpen ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[#f4f6f8]" role="dialog" aria-modal="true" aria-label="New material">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              className="text-sm font-medium text-slate-500"
              onClick={closeNewCard}
            >
              Cancel
            </button>
            <p className="text-sm font-semibold text-slate-900">New material</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`text-sm font-medium ${
                  newChromeOpen ? "text-[#2f80ed]" : "text-slate-500"
                }`}
                aria-expanded={newChromeOpen}
                aria-pressed={newChromeOpen}
                onClick={() => setNewChromeOpen((v) => !v)}
              >
                Tools
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-[#2f80ed] disabled:text-slate-300"
                disabled={imageBusy}
                onClick={() => void saveNewCard()}
              >
                {imageBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </header>
          <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden px-4 py-4 lg:px-8">
            {newChromeOpen ? (
              <>
            {titleOpen || front.trim() ? (
              <label className="block shrink-0 space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Title <span className="font-normal normal-case">(optional)</span>
                </span>
                <textarea
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  rows={2}
                  placeholder="What this cluster is about"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
                />
              </label>
            ) : (
              <button
                type="button"
                className="self-start text-sm font-medium text-slate-400 hover:text-slate-600"
                onClick={() => setTitleOpen(true)}
              >
                Add title (optional)
              </button>
            )}
            <MaterialImageAttach
              drafts={draftImages}
              busy={imageBusy}
              notice={imageNotice}
              onAddFiles={acceptDraftImages}
              onRemoveDraft={(draftId) => {
                setDraftImages((prev) => {
                  const target = prev.find((d) => d.draftId === draftId);
                  if (target) revokeDraftImage(target);
                  return prev.filter((d) => d.draftId !== draftId);
                });
              }}
            />
              </>
            ) : imageNotice ? (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {imageNotice}
              </p>
            ) : null}
            <label className="flex min-h-0 flex-1 flex-col gap-1.5">
              {newChromeOpen ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Material</span>
              ) : (
                <span className="sr-only">Material</span>
              )}
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
                  const files = filesFromPaste(e);
                  if (files.length === 0) return;
                  e.preventDefault();
                  acceptDraftImages(files);
                }}
                onDragOver={(e: DragEvent<HTMLTextAreaElement>) => e.preventDefault()}
                onDrop={(e: DragEvent<HTMLTextAreaElement>) => {
                  const files = filesFromDrop(e);
                  if (files.length) acceptDraftImages(files);
                }}
                className="min-h-0 w-full flex-1 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base leading-relaxed text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
                placeholder="Events, notes… Paste or drop images here."
              />
            </label>
          </div>
        </div>
      ) : null}
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
      <span className="mb-0.5 flex h-16 w-full items-center justify-center rounded-lg bg-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
        Image
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="mb-0.5 h-16 w-full rounded-lg object-cover" />
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
    <div className={floating ? "absolute right-1 top-1 z-[2]" : "relative"}>
      <ForgeOverflowMenu
        open={open}
        onOpenChange={(next) => {
          if (next !== open) onToggle();
        }}
        variant="light"
        label={`Menu for ${fragmentDisplayTitle(item)}`}
        triggerClassName={
          floating
            ? "flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            : "flex h-full min-h-11 min-w-11 items-center justify-center px-3 text-slate-400 hover:text-slate-700"
        }
        items={[
          {
            id: "open",
            label: "Open",
            onClick: () => {
              window.location.href = fragmentModeHref(item.deckId, item.id, "classic");
            },
          },
          {
            id: "builder",
            label: "Builder",
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
