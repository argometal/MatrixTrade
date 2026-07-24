"use client";

/**
 * Chaos capture surface — raw ingest into a Chaos Deck fragment.
 * Typography: Lexend 18px / ~1.55 lh (fluency + screen reading research).
 * No headings toolbar, no decorative chrome.
 */

import { Lexend } from "next/font/google";
import { useEffect, useRef, useState } from "react";

const captureFont = Lexend({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-chaos-capture",
  display: "swap",
});

type Props = {
  deckTitle: string;
  initialTitle?: string;
  initialBody?: string;
  onCancel: () => void;
  onSave: (payload: { title: string; body: string }) => void;
};

export function ChaosCaptureSurface({
  deckTitle,
  initialTitle = "",
  initialBody = "",
  onCancel,
  onSave,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSave({
          title: title.trim() || "Untitled fragment",
          body,
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [title, body, onCancel, onSave]);

  return (
    <div
      className={`${captureFont.variable} fixed inset-0 z-50 flex flex-col bg-zinc-950`}
      role="dialog"
      aria-modal="true"
      aria-label="Chaos capture"
      style={{ fontFamily: "var(--font-chaos-capture), system-ui, sans-serif" }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-wide text-zinc-500">
            Chaos Deck · Fragment
          </p>
          <p className="truncate text-sm text-zinc-300">{deckTitle}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                title: title.trim() || "Untitled fragment",
                body,
              })
            }
            className="min-h-11 rounded-lg border border-zinc-600 bg-zinc-100 px-4 text-sm font-semibold text-zinc-900"
          >
            Save Fragment
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Title optional"
          className="w-full border-0 border-b border-zinc-800 bg-transparent pb-2 text-lg font-medium text-zinc-200 outline-none placeholder:text-zinc-600 focus-visible:border-zinc-500"
        />
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a fragment — two lines or a whole chapter. No classification."
          aria-label="Fragment body"
          className="min-h-0 w-full flex-1 resize-none border-0 bg-transparent text-[18px] leading-[1.55] text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <p className="shrink-0 text-[11px] text-zinc-600">
          ⌘/Ctrl+Enter save · Esc cancel · Lexend 18px · ingest only
        </p>
      </div>
    </div>
  );
}
