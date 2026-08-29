"use client";

/**
 * CHANGE 24-47 — Classic Chaos capture inside a Deck.
 * Shares the transactional capture engine with Chaos Dumping (24-2E).
 * Destination is fixed to the current Deck.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  appendImageFilesToDraft,
  extractImagesFromClipboard,
  persistChaosDumpCapture,
  revokeAllDraftImages,
  revokeDraftImage,
  type ChaosDraftImage,
} from "@/lib/argusforge/af03-chaos-dump-images";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";

const PLACEHOLDER =
  "Paste an idea, conversation, error, instruction, link, or raw material...";

type Props = {
  state: Af03RepoState;
  deckId: string;
  deckTitle: string;
  onSaved: (next: Af03RepoState, itemId: string) => void;
};

export function DeckCaptureComposer({
  state,
  deckId,
  deckTitle,
  onSaved,
}: Props) {
  const formId = useId();
  const contentId = `${formId}-content`;
  const fileId = `${formId}-file`;
  const errorId = `${formId}-error`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftImagesRef = useRef<ChaosDraftImage[]>([]);

  const [content, setContent] = useState("");
  const [draftImages, setDraftImages] = useState<ChaosDraftImage[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    const t = window.setTimeout(() => expandedRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [expanded]);

  const acceptImages = useCallback((files: File[]) => {
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
    if (list?.length) acceptImages(Array.from(list));
    e.target.value = "";
  }

  function onPaste(e: ClipboardEvent) {
    const images = extractImagesFromClipboard(e.clipboardData);
    if (images.length === 0) return;
    acceptImages(images);
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      const result = await persistChaosDumpCapture(state, {
        deckId,
        text: content,
        images: draftImages,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      revokeAllDraftImages(draftImages);
      setDraftImages([]);
      setContent("");
      setExpanded(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
      onSaved(result.state, result.item.id);
    } finally {
      setBusy(false);
    }
  }

  const editor = (fullscreen: boolean) => (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 ${
        fullscreen ? "min-h-0 flex-1" : "min-h-[11rem]"
      }`}
    >
      <label htmlFor={fullscreen ? `${contentId}-fs` : contentId} className="sr-only">
        Capture
      </label>
      <textarea
        ref={fullscreen ? expandedRef : textareaRef}
        id={fullscreen ? `${contentId}-fs` : contentId}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (error) setError(null);
        }}
        onPaste={onPaste}
        placeholder={PLACEHOLDER}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full resize-none bg-transparent px-4 py-3.5 text-base leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500 ${
          fullscreen ? "min-h-0 flex-1" : "min-h-[8.5rem]"
        }`}
      />
      {draftImages.length > 0 ? (
        <ul className="flex gap-2 overflow-x-auto border-t border-zinc-800 px-3 py-2">
          {draftImages.map((img) => (
            <li key={img.draftId} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt=""
                className="h-14 w-14 rounded-md object-cover"
              />
              <button
                type="button"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-[10px] text-zinc-200"
                aria-label={`Remove ${img.filename}`}
                onClick={() => removeDraft(img.draftId)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-zinc-800/80 px-3 py-2">
        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onFilePicked}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-9 rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 text-xs font-medium text-zinc-200 hover:border-zinc-500"
        >
          + Add image
        </button>
        {draftImages.length > 0 ? (
          <span className={`text-[11px] ${AF_TEXT.metadata}`}>
            {draftImages.length} image{draftImages.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {!fullscreen ? (
          <button
            type="button"
            aria-label="Expand editor fullscreen"
            title="Expand"
            onClick={() => setExpanded(true)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/90 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <ExpandIcon />
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <section
      aria-labelledby={`${formId}-heading`}
      className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3
          id={`${formId}-heading`}
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${AF_TEXT.metadata}`}
        >
          Capture into this Deck
        </h3>
        <span className={`truncate text-[11px] ${AF_TEXT.disabled}`}>{deckTitle}</span>
      </div>

      {expanded ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-xs text-zinc-500">
          Editing in fullscreen — draft stays here.
        </p>
      ) : (
        editor(false)
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-rose-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void onSave()}
        className="flex min-h-11 w-full items-center justify-center rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        {busy ? "Saving…" : "Save"}
      </button>

      {savedFlash ? (
        <p role="status" className="text-center text-xs font-medium text-emerald-400">
          Saved to this Deck
        </p>
      ) : null}

      <p className={`text-[11px] ${AF_TEXT.disabled}`}>
        Title is optional — first useful line is used. Rename later from •••.
      </p>

      {mounted && expanded
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex flex-col bg-zinc-950"
              role="dialog"
              aria-modal="true"
              aria-label="Fullscreen Deck capture"
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
                      Back to Deck
                    </span>
                    <span className={`block text-[11px] ${AF_TEXT.metadata}`}>
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
                  <span className={`block text-[11px] ${AF_TEXT.metadata}`}>
                    Collapse &amp; return
                  </span>
                </button>
              </header>
              <div className="flex min-h-0 flex-1 flex-col px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <p className={`mb-2 text-xs ${AF_TEXT.metadata}`}>
                  Save to: <span className={AF_TEXT.secondary}>{deckTitle}</span>
                </p>
                {editor(true)}
                {error ? (
                  <p role="alert" className="mt-2 text-sm font-medium text-rose-300">
                    {error}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSave()}
                  className="mt-3 flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-zinc-100 px-4 text-base font-semibold text-zinc-950 disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
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
