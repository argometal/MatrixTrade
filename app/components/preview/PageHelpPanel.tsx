"use client";

import { useState } from "react";
import { getPageHelp, type PageHelpId } from "@/lib/page-help";

export function PageHelpPanel({
  pageId,
  children,
}: {
  pageId: PageHelpId;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const help = getPageHelp(pageId);

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-lg border border-r-0 border-zinc-700 bg-zinc-900/95 px-2 py-4 text-xs font-medium text-zinc-400 shadow-lg hover:border-violet-500/40 hover:text-violet-300"
          aria-label={help.panelLabel ? `Open ${help.panelLabel.toLowerCase()}` : "Abrir ayuda"}
        >
          <span className="[writing-mode:vertical-rl] rotate-180">
            {help.panelLabel ?? "Ayuda"}
          </span>
        </button>
      )}

      {expanded && (
        <aside className="flex w-[300px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/95">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-100">{help.title}</h2>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Cerrar ayuda"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
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
                    <div key={row.button} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                      <dt className="font-medium text-violet-300">{row.button}</dt>
                      <dd className="mt-1 text-zinc-400">{row.copies}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {help.workflowTitle ?? "Flujo de trabajo"}
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-zinc-300">
              {help.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
