"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getPageHelp, type PageHelpId } from "@/lib/page-help";

/**
 * Page help shell.
 * - trigger="rail": legacy vertical side tab (default for non-Scout pages)
 * - trigger="icon": compact header-corner control (Scout / mobile-first)
 */
export function PageHelpPanel({
  pageId,
  children,
  trigger = "rail",
}: {
  pageId: PageHelpId;
  children: React.ReactNode;
  trigger?: "rail" | "icon";
}) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const help = getPageHelp(pageId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  const panelBody = (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 id={titleId} className="text-sm font-semibold text-zinc-100">
          {help.title}
        </h2>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="min-h-9 min-w-9 rounded-md px-2 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          aria-label="Close help"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-sm leading-relaxed text-zinc-400">{help.summary}</p>

        {help.principles && help.principles.length > 0 ? (
          <>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Principles
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-zinc-300">
              {help.principles.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}

        {help.copyButtons && help.copyButtons.length > 0 ? (
          <>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Snapshot buttons
            </h3>
            <dl className="mt-2 space-y-3 text-sm">
              {help.copyButtons.map((row) => (
                <div
                  key={row.button}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <dt className="font-medium text-violet-300">{row.button}</dt>
                  <dd className="mt-1 text-zinc-400">{row.copies}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {help.workflowTitle ?? "Workflow"}
        </h3>
        <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-zinc-300">
          {help.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </>
  );

  if (trigger === "icon") {
    const overlay =
      expanded && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              data-page-help-overlay="open"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Dismiss help"
                onClick={() => setExpanded(false)}
              />
              <aside className="relative z-10 ml-auto flex h-full w-full max-w-sm flex-col border-l border-zinc-800 bg-zinc-950 shadow-xl sm:w-[300px]">
                {panelBody}
              </aside>
            </div>,
            document.body
          )
        : null;

    return (
      <div className="relative flex h-full min-h-0 w-full overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/90 text-xs font-semibold text-zinc-400 shadow-sm hover:border-violet-500/40 hover:text-violet-300 lg:right-3 lg:top-3"
          aria-label={
            help.panelLabel
              ? `Open ${help.panelLabel.toLowerCase()}`
              : "Open help"
          }
          aria-expanded={expanded}
          data-page-help-trigger="icon"
        >
          ?
        </button>
        {overlay}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-lg border border-r-0 border-zinc-700 bg-zinc-900/95 px-2 py-4 text-xs font-medium text-zinc-400 shadow-lg hover:border-violet-500/40 hover:text-violet-300"
          aria-label={
            help.panelLabel
              ? `Open ${help.panelLabel.toLowerCase()}`
              : "Abrir ayuda"
          }
          data-page-help-trigger="rail"
        >
          <span className="[writing-mode:vertical-rl] rotate-180">
            {help.panelLabel ?? "Ayuda"}
          </span>
        </button>
      )}

      {expanded && (
        <aside className="flex w-[300px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/95">
          {panelBody}
        </aside>
      )}
    </div>
  );
}
