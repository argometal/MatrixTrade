"use client";

/**
 * CHANGE 24-39 — Classic Chaos capture inside a Deck.
 * Same draft pattern as Chaos Dumping: content first, optional image, Save, Expand.
 * Destination is fixed to the current Deck (no picker).
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { addImageBlockFromFile } from "@/lib/argusforge/af03-builder-store";
import {
  looksLikeUrl,
  titleFromDump,
} from "@/lib/argusforge/af03-chaos-dump";
import { createContent } from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";

const PLACEHOLDER =
  "Paste an idea, conversation, error, instruction, link, or raw material...";

type Props = {
  state: Af03RepoState;
  deckId: string;
  deckTitle: string;
  onSaved: (next: Af03RepoState, itemId: string) => void;
};

type DraftImage = {
  file: File;
  previewUrl: string;
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

  const [content, setContent] = useState("");
  const [draftImage, setDraftImage] = useState<DraftImage | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const t = window.setTimeout(() => expandedRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [expanded]);

  useEffect(() => {
    return () => {
      if (draftImage) {
        try {
          URL.revokeObjectURL(draftImage.previewUrl);
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  function clearDraftImage() {
    setDraftImage((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return null;
    });
  }

  function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files can be attached.");
      return;
    }
    clearDraftImage();
    setDraftImage({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    setError(null);
  }

  async function onSave() {
    const trimmed = content.trim();
    if (!trimmed && !draftImage) {
      setError("Add text or an image before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const isLink = Boolean(trimmed && looksLikeUrl(trimmed) && !draftImage);
      const title = trimmed
        ? titleFromDump(trimmed)
        : draftImage?.file.name || "Untitled note";
      // titleFromDump uses "Untitled dump" for empty — never reached when trimmed is set.
      const resolvedTitle =
        title === "Untitled dump" ? "Untitled note" : title;

      let { state: next, item } = createContent(state, {
        deckId,
        kind: isLink ? "link" : draftImage && !trimmed ? "image" : "text",
        title: resolvedTitle,
        body: trimmed,
        sourceRef: isLink ? trimmed : null,
      });

      if (draftImage) {
        const result = await addImageBlockFromFile(next, item.id, draftImage.file);
        if ("error" in result) {
          setError(result.error);
          onSaved(next, item.id);
          clearDraftImage();
          setContent("");
          setExpanded(false);
          setBusy(false);
          return;
        }
        next = result.state;
      }

      clearDraftImage();
      setContent("");
      setExpanded(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
      onSaved(next, item.id);
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
        placeholder={PLACEHOLDER}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full resize-none bg-transparent px-4 py-3.5 text-base leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500 ${
          fullscreen ? "min-h-0 flex-1" : "min-h-[8.5rem]"
        }`}
      />
      {draftImage ? (
        <div className="flex items-center gap-2 border-t border-zinc-800 px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draftImage.previewUrl}
            alt=""
            className="h-12 w-12 rounded-md object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
            {draftImage.file.name}
          </span>
          <button
            type="button"
            className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
            onClick={clearDraftImage}
          >
            Remove
          </button>
        </div>
      ) : null}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-zinc-800/80 px-3 py-2">
        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept="image/*"
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
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
        >
          Capture into this Deck
        </h3>
        <span className="truncate text-[11px] text-zinc-600">{deckTitle}</span>
      </div>

      {expanded ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-xs text-zinc-600">
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

      <p className="text-[11px] text-zinc-600">
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
                  Save to: <span className="text-zinc-300">{deckTitle}</span>
                </p>
                {editor(true)}
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
