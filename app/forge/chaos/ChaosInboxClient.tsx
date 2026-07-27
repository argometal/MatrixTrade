"use client";

/**
 * CHANGE 24-22 / 24-2E — Chaos Dumping (`+` route).
 * Fast capture: text and/or images — not builder, not Library, not Argus.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  formatDumpRelative,
  listDumpDestinations,
  readLastDumpDestination,
  resolveDumpDestination,
  writeLastDumpDestination,
} from "@/lib/argusforge/af03-chaos-dump";
import {
  appendImageFilesToDraft,
  extractImagesFromClipboard,
  extractImagesFromDrop,
  isValidChaosDumpCapture,
  persistChaosDumpCapture,
  revokeAllDraftImages,
  revokeDraftImage,
  undoChaosDumpCapture,
  type ChaosDraftImage,
} from "@/lib/argusforge/af03-chaos-dump-images";
import {
  createDeck,
  createFolder,
  emptyOrSeedRepo,
  itemHref,
  moveFragmentToDeck,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";

type ToastState = {
  itemId: string;
  deckId: string;
  snapshotBody: string;
  /** Asset IDs written for this capture (for undo awareness). */
  assetIds: string[];
};

const PLACEHOLDER =
  "Paste an idea, conversation, error, instruction, link, image, or raw material...";

function promptTitle(label: string, initial: string): string | null {
  const value = window.prompt(label, initial);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function ChaosInboxClient() {
  const formId = useId();
  const contentId = `${formId}-content`;
  const errorId = `${formId}-error`;
  const fileInputId = `${formId}-images`;
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftImagesRef = useRef<ChaosDraftImage[]>([]);

  const [state, setState] = useState<Af03RepoState | null>(null);
  const [content, setContent] = useState("");
  const [draftImages, setDraftImages] = useState<ChaosDraftImage[]>([]);
  const [destId, setDestId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    setMounted(true);
    const base = emptyOrSeedRepo();
    const preferred = readLastDumpDestination();
    const resolved = resolveDumpDestination(base, preferred);
    setState(resolved.state);
    setDestId(resolved.deckId);
  }, []);

  useEffect(() => {
    draftImagesRef.current = draftImages;
  }, [draftImages]);

  useEffect(() => {
    return () => {
      revokeAllDraftImages(draftImagesRef.current);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const t = window.setTimeout(() => expandedTextareaRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [expanded]);

  const destinations = useMemo(
    () => (state ? listDumpDestinations(state) : []),
    [state]
  );

  const destLabel = useMemo(() => {
    if (!destId) return "Chaos Inbox";
    return destinations.find((d) => d.id === destId)?.title ?? "Chaos Inbox";
  }, [destId, destinations]);

  const recent = useMemo(() => {
    if (!state || !destId) return [];
    return [...state.items]
      .filter((i) => i.deckId === destId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
  }, [state, destId]);

  const acceptImageFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setDraftImages((prev) => {
      const { drafts, error: err } = appendImageFilesToDraft(prev, files);
      if (err) setError(err.message);
      else setError(null);
      return drafts;
    });
  }, []);

  function removeDraft(draftId: string) {
    setDraftImages((prev) => {
      const target = prev.find((d) => d.draftId === draftId);
      if (target) revokeDraftImage(target);
      return prev.filter((d) => d.draftId !== draftId);
    });
  }

  function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (list?.length) {
      acceptImageFiles(Array.from(list));
    }
    e.target.value = "";
  }

  function onPaste(e: ClipboardEvent) {
    const images = extractImagesFromClipboard(e.clipboardData);
    if (images.length === 0) return;
    // Allow native text paste; only append images.
    acceptImageFiles(images);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    const { images, rejectedNonImages } = extractImagesFromDrop(e.dataTransfer);
    if (rejectedNonImages > 0 && images.length === 0) {
      setError("Only image files can be dropped into Chaos.");
      return;
    }
    if (rejectedNonImages > 0) {
      setError("Some non-image files were ignored.");
    }
    acceptImageFiles(images);
  }

  async function onSave() {
    if (!state || !destId || saving) return;
    if (!isValidChaosDumpCapture(content, draftImages.length)) {
      setError("Add text or at least one image before saving to Chaos.");
      return;
    }
    setSaving(true);
    setDraftImages((prev) => prev.map((d) => ({ ...d, status: "saving" as const })));
    try {
      const resolved = resolveDumpDestination(state, destId);
      const result = await persistChaosDumpCapture(resolved.state, {
        deckId: resolved.deckId,
        text: content,
        images: draftImages,
      });
      if (!result.ok) {
        setError(result.error.message);
        setDraftImages((prev) =>
          prev.map((d) => ({
            ...d,
            status: "error" as const,
            error: result.error.message,
          }))
        );
        return;
      }
      writeLastDumpDestination(resolved.deckId);
      const snapshotBody = content;
      revokeAllDraftImages(draftImages);
      setState(result.state);
      setDestId(resolved.deckId);
      setContent("");
      setDraftImages([]);
      setError(null);
      setExpanded(false);
      setToast({
        itemId: result.item.id,
        deckId: resolved.deckId,
        snapshotBody,
        assetIds: result.assetIds,
      });
    } finally {
      setSaving(false);
    }
  }

  async function undoSave() {
    if (!state || !toast) return;
    const result = await undoChaosDumpCapture(state, toast.itemId);
    revokeAllDraftImages(draftImages);
    setState(result.state);
    setContent(result.restoredText || toast.snapshotBody);
    setDraftImages(result.restoredImages);
    setToast(null);
    setError(null);
  }

  function birthDeck() {
    if (!state) return;
    const name = promptTitle("Chaos Deck name", "New Chaos Deck");
    if (!name) return;
    const { state: next, deck } = createDeck(state, {
      title: name,
      folderId: null,
      view: "active",
    });
    setState(next);
    setDestId(deck.id);
    writeLastDumpDestination(deck.id);
  }

  function birthRealm() {
    if (!state) return;
    const name = promptTitle("Realm name", "New Realm");
    if (!name) return;
    const { state: next } = createFolder(state, {
      title: name,
      parentId: null,
      view: "active",
    });
    setState(next);
  }

  if (!state || !destId) {
    return <p className="text-sm text-zinc-500">Loading Chaos Dumping…</p>;
  }

  const materialEditor = (opts: { fullscreen: boolean; textareaRef: typeof textareaRef }) => (
    <div
      className={`relative flex min-h-[14rem] flex-1 flex-col overflow-hidden rounded-2xl border bg-zinc-900/80 ${
        dragOver ? "border-emerald-500/70 ring-2 ring-emerald-500/30" : "border-zinc-800"
      } ${opts.fullscreen ? "min-h-0" : ""}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-emerald-950/40 text-sm font-medium text-emerald-100">
          Drop images into Chaos
        </div>
      ) : null}
      <label htmlFor={opts.fullscreen ? `${contentId}-fs` : contentId} className="sr-only">
        Material
      </label>
      <textarea
        ref={opts.textareaRef}
        id={opts.fullscreen ? `${contentId}-fs` : contentId}
        name="content"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (error) setError(null);
        }}
        onPaste={onPaste}
        placeholder={PLACEHOLDER}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full resize-none bg-transparent px-4 py-4 text-base leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500 ${
          opts.fullscreen ? "min-h-0 flex-1" : "min-h-[14rem] flex-1"
        }`}
      />
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-zinc-800/80 px-3 py-2">
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onFilePicked}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="min-h-9 rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 text-xs font-medium text-zinc-200 hover:border-zinc-500"
        >
          Add image
        </button>
        {draftImages.length > 0 ? (
          <span className="text-[11px] text-zinc-500">
            {draftImages.length} image{draftImages.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {!opts.fullscreen ? (
          <button
            type="button"
            aria-label="Expand editor fullscreen"
            title="Expand editor"
            onClick={() => setExpanded(true)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/90 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <ExpandIcon />
          </button>
        ) : null}
      </div>
      {draftImages.length > 0 ? (
        <DraftImageStrip images={draftImages} onRemove={removeDraft} />
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-3">
      <section
        aria-labelledby={`${formId}-material`}
        className="flex min-h-0 flex-1 flex-col gap-2"
      >
        <h2 id={`${formId}-material`} className="text-sm font-medium text-zinc-300">
          Material
        </h2>
        {expanded ? (
          <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-600">
            Editing in fullscreen — text and images stay in this draft.
          </p>
        ) : (
          materialEditor({ fullscreen: false, textareaRef })
        )}
      </section>

      <div className="shrink-0 space-y-2">
        <button
          type="button"
          aria-expanded={pickerOpen}
          aria-haspopup="listbox"
          onClick={() => setPickerOpen((o) => !o)}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <InboxIcon />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
              Save to
            </span>
            <span className="block truncate text-sm font-medium text-zinc-100">
              {destLabel}
            </span>
          </span>
          <ChevronDown />
        </button>
        {pickerOpen ? (
          <ul
            role="listbox"
            aria-label="Destination Chaos Deck"
            className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 py-1"
          >
            {destinations.map((d) => (
              <li key={d.id} role="option" aria-selected={d.id === destId}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-900 ${
                    d.id === destId ? "text-emerald-200" : "text-zinc-200"
                  }`}
                  onClick={() => {
                    setDestId(d.id);
                    writeLastDumpDestination(d.id);
                    setPickerOpen(false);
                  }}
                >
                  {d.title}
                  {d.isInbox ? (
                    <span className="ml-2 text-[10px] uppercase text-zinc-500">
                      default
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            <li className="border-t border-zinc-800 px-3 py-2">
              <button
                type="button"
                className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                onClick={() => {
                  setPickerOpen(false);
                  birthDeck();
                }}
              >
                or create a Chaos Deck…
              </button>
            </li>
          </ul>
        ) : (
          <p className="px-1 text-xs text-zinc-600">or choose a Chaos Deck.</p>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-rose-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-zinc-100 px-4 text-base font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save to Chaos"}
      </button>

      {toast ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
        >
          <span className="font-medium">Saved</span>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-emerald-200 underline-offset-2 hover:underline"
            onClick={() => router.push(itemHref(toast.deckId, toast.itemId))}
          >
            Open
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-emerald-200 underline-offset-2 hover:underline"
            onClick={() => setMoveOpen(true)}
          >
            Move
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-emerald-200 underline-offset-2 hover:underline"
            onClick={undoSave}
          >
            Undo
          </button>
        </div>
      ) : null}

      <section aria-labelledby={`${formId}-recent`} className="shrink-0 space-y-1.5 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            id={`${formId}-recent`}
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
          >
            Recent captures
          </h3>
          <Link
            href={`/forge/deck/${destId}`}
            className="text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            View all ›
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-zinc-600">Nothing in this destination yet.</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((item) => (
              <li key={item.id}>
                <Link
                  href={itemHref(item.deckId, item.id)}
                  className="flex min-h-10 items-center gap-2 rounded-lg px-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.title}
                    {item.kind === "image" || item.kind === "mixed" ? (
                      <span className="ml-1 text-[10px] uppercase text-zinc-600">
                        · {item.kind}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[11px] text-zinc-600">
                    {formatDumpRelative(item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-zinc-600">
          <button type="button" className="hover:text-zinc-300" onClick={birthDeck}>
            New Chaos Deck
          </button>
          <button type="button" className="hover:text-zinc-300" onClick={birthRealm}>
            New Realm
          </button>
        </div>
      </section>

      {mounted && expanded
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex flex-col bg-zinc-950"
              role="dialog"
              aria-modal="true"
              aria-label="Fullscreen Chaos editor"
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="flex min-h-11 min-w-0 items-start gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <span aria-hidden className="mt-0.5 text-lg text-zinc-300">
                    ←
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-100">
                      Back to +
                    </span>
                    <span className="block text-[11px] text-zinc-500">
                      Collapse editor
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="min-h-11 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <span className="block text-sm font-semibold text-sky-400">Done</span>
                  <span className="block text-[11px] text-zinc-500">
                    Collapse &amp; return
                  </span>
                </button>
              </header>
              <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <p className="text-xs text-zinc-500">
                  Save to: <span className="text-zinc-300">{destLabel}</span>
                </p>
                {materialEditor({ fullscreen: true, textareaRef: expandedTextareaRef })}
                {error ? (
                  <p role="alert" className="text-sm font-medium text-rose-300">
                    {error}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="mt-1 flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-zinc-100 px-4 text-base font-semibold text-zinc-950 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save to Chaos"}
                </button>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && moveOpen && toast ? (
        <CaptureMovePicker
          state={state}
          itemId={toast.itemId}
          currentDeckId={toast.deckId}
          onClose={() => setMoveOpen(false)}
          onMoved={(next, newDeckId) => {
            setState(next);
            setToast({ ...toast, deckId: newDeckId });
            setMoveOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function DraftImageStrip({
  images,
  onRemove,
}: {
  images: ChaosDraftImage[];
  onRemove: (draftId: string) => void;
}) {
  return (
    <ul className="flex shrink-0 gap-2 overflow-x-auto border-t border-zinc-800/80 px-3 py-2">
      {images.map((img) => (
        <li
          key={img.draftId}
          className={`relative w-24 shrink-0 overflow-hidden rounded-lg border ${
            img.status === "error" ? "border-rose-700" : "border-zinc-700"
          } bg-zinc-950`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.previewUrl}
            alt={img.filename}
            className="h-20 w-full object-cover"
          />
          <p className="truncate px-1 py-0.5 text-[9px] text-zinc-500" title={img.filename}>
            {img.filename}
          </p>
          {img.status === "error" ? (
            <p className="px-1 pb-1 text-[9px] text-rose-300">Failed</p>
          ) : null}
          <button
            type="button"
            aria-label={`Remove image ${img.filename}`}
            onClick={() => onRemove(img.draftId)}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-zinc-100"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

function CaptureMovePicker({
  state,
  itemId,
  currentDeckId,
  onClose,
  onMoved,
}: {
  state: Af03RepoState;
  itemId: string;
  currentDeckId: string;
  onClose: () => void;
  onMoved: (state: Af03RepoState, deckId: string) => void;
}) {
  const destinations = listDumpDestinations(state);
  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 p-3 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Move capture"
        className="flex max-h-[min(70dvh,28rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <header className="border-b border-zinc-800 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500/90">
            Move capture
          </p>
          <p className="mt-0.5 text-sm text-zinc-400">Choose a Chaos Deck by name.</p>
        </header>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {destinations.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                disabled={d.id === currentDeckId}
                className="block w-full px-4 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-900 disabled:opacity-40"
                onClick={() => {
                  onMoved(moveFragmentToDeck(state, itemId, d.id), d.id);
                }}
              >
                {d.title}
              </button>
            </li>
          ))}
        </ul>
        <footer className="border-t border-zinc-800 p-3">
          <button
            type="button"
            className="min-h-11 w-full rounded-lg border border-zinc-700 text-sm text-zinc-300"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300"
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 7.5 12 3l9 4.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M3 12h6l1.5 2h3L15 12h6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

function ChevronDown() {
  return (
    <span className="text-zinc-500" aria-hidden>
      ▾
    </span>
  );
}
