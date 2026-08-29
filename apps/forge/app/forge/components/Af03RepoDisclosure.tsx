"use client";

import { useState } from "react";

const DISCLOSURE_BODY =
  "AF03 prototype — browser localStorage (repo + vault prep queue). Not server persistence; data can be lost. Viewer/editor/Vault prep are local-only. Dual Active/Archive roots remain interim (DEBT-AF03-01). Not Alexandria. Focus triggers not implemented.";

/** AF03 prototype disclosure — collapsed by default on operational surfaces (24-47). */
export function Af03RepoDisclosure({ compact = true }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  if (!compact) {
    return (
      <p
        role="status"
        className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100/90"
      >
        AF03 prototype — browser <code className="text-amber-50/80">localStorage</code> (repo + vault
        prep queue). Not server persistence; data can be lost. Viewer/editor/Vault prep are
        local-only. Dual Active/Archive roots remain interim (DEBT-AF03-01). Not Alexandria. Focus
        triggers not implemented.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-9 w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500"
      >
        <span>
          Local prototype ·{" "}
          <span className="text-zinc-400 underline-offset-2">{open ? "Hide" : "Details"}</span>
        </span>
        <span aria-hidden className="text-zinc-600">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <p role="status" className="border-t border-zinc-800/80 px-2.5 py-2 text-xs leading-relaxed text-zinc-500">
          {DISCLOSURE_BODY}
        </p>
      ) : null}
    </div>
  );
}
