"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { getHelpTopic } from "@/lib/argus/v2/help-topics";

/**
 * Contextual ? — opens help for the UI you’re looking at.
 * Footer links to the full Help index for broader topics.
 */
export function V2IntelHelpLink({
  topic,
  label = "Help",
  className = "",
}: {
  topic: string;
  /** Accessible name; button shows “?” only to save chrome. */
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const section = getHelpTopic(topic);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-zinc-400 ring-1 ring-zinc-700/80 transition hover:bg-zinc-900 hover:text-violet-200 hover:ring-violet-500/40 ${className}`}
        title={`${label} — about this view`}
        aria-label={`${label} — about this view`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ?
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[10040] flex items-end justify-center bg-black/55 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[min(88dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">Help</p>
                <h2 id={titleId} className="mt-0.5 text-base font-semibold text-zinc-50">
                  {section?.title ?? label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Close help"
              >
                ✕
              </button>
            </header>

            <div className="argus-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {section ? (
                <>
                  {section.intro ? (
                    <p className="text-sm leading-relaxed text-zinc-400">{section.intro}</p>
                  ) : null}
                  <ul className={`space-y-3 ${section.intro ? "mt-4" : ""}`}>
                    {section.items.map((item) => (
                      <li key={item.title}>
                        <p className="text-sm font-medium text-violet-300">{item.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">{item.body}</p>
                      </li>
                    ))}
                  </ul>
                  {section.tip ? (
                    <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                      Tip: {section.tip}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-zinc-500">
                  No dedicated tip for this view yet. Open the Help index for the full guide.
                </p>
              )}
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 px-4 py-3">
              <Link
                href="/argus/v2/help"
                className="text-xs font-semibold text-zinc-400 hover:text-violet-300"
                onClick={() => setOpen(false)}
              >
                Help index →
              </Link>
              {section ? (
                <Link
                  href={`/argus/v2/help?topic=${encodeURIComponent(section.id)}`}
                  className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                  onClick={() => setOpen(false)}
                >
                  Open in index
                </Link>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
