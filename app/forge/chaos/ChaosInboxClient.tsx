"use client";

/**
 * CHANGE 24-22 — Chaos Dumping (`+` route).
 * Fast capture only — not builder, not Library, not Argus enrichment.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatDumpRelative,
  listDumpDestinations,
  looksLikeUrl,
  readLastDumpDestination,
  resolveDumpDestination,
  titleFromDump,
  writeLastDumpDestination,
} from "@/lib/argusforge/af03-chaos-dump";
import {
  createContent,
  createDeck,
  createFolder,
  emptyOrSeedRepo,
  itemHref,
  moveFragmentToDeck,
  removeContent,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";

type ToastState = {
  itemId: string;
  deckId: string;
  snapshotBody: string;
};

const PLACEHOLDER =
  "Paste an idea, conversation, error, instruction, link, or raw material...";

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
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [state, setState] = useState<Af03RepoState | null>(null);
  const [content, setContent] = useState("");
  const [destId, setDestId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const base = emptyOrSeedRepo();
    const preferred = readLastDumpDestination();
    const resolved = resolveDumpDestination(base, preferred);
    setState(resolved.state);
    setDestId(resolved.deckId);
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

  function onSave() {
    if (!state || !destId) return;
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Add text or a link before saving to Chaos.");
      return;
    }
    const resolved = resolveDumpDestination(state, destId);
    const isLink = looksLikeUrl(trimmed);
    const title = titleFromDump(trimmed);
    const { state: next, item } = createContent(resolved.state, {
      deckId: resolved.deckId,
      kind: isLink ? "link" : "text",
      title,
      body: trimmed,
      sourceRef: isLink ? trimmed : null,
    });
    writeLastDumpDestination(resolved.deckId);
    setState(next);
    setDestId(resolved.deckId);
    setContent("");
    setError(null);
    setExpanded(false);
    setToast({
      itemId: item.id,
      deckId: resolved.deckId,
      snapshotBody: trimmed,
    });
  }

  function undoSave() {
    if (!state || !toast) return;
    setState(removeContent(state, toast.itemId));
    setContent(toast.snapshotBody);
    setToast(null);
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

  const editorCard = (
    <div className="relative flex min-h-[14rem] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
      <label htmlFor={contentId} className="sr-only">
        Material
      </label>
      <textarea
        ref={textareaRef}
        id={contentId}
        name="content"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (error) setError(null);
        }}
        placeholder={PLACEHOLDER}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="min-h-[14rem] w-full flex-1 resize-none bg-transparent px-4 py-4 text-base leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500"
      />
      <button
        type="button"
        aria-label="Expand editor fullscreen"
        title="Expand editor"
        onClick={() => setExpanded(true)}
        className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/90 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <ExpandIcon />
      </button>
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
        {editorCard}
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
        className="flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-zinc-100 px-4 text-base font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        Save to Chaos
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
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
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
              <div className="flex min-h-0 flex-1 flex-col px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <p className="mb-2 text-xs text-zinc-500">
                  Save to: <span className="text-zinc-300">{destLabel}</span>
                </p>
                <textarea
                  ref={expandedTextareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={PLACEHOLDER}
                  className="min-h-0 w-full flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-base leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-500"
                />
                <button
                  type="button"
                  onClick={onSave}
                  className="mt-3 flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-zinc-100 px-4 text-base font-semibold text-zinc-950"
                >
                  Save to Chaos
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
