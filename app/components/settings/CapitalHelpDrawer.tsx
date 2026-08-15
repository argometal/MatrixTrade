"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildCapitalSetupChecklist,
  CAPITAL_HELP_SECTIONS,
  CAPITAL_HELP_WORKFLOW_STEPS,
  type CapitalSetupChecklistInput,
} from "@/lib/capital-help";

function statusGlyph(status: "ok" | "missing" | "unknown"): string {
  if (status === "ok") return "✓";
  if (status === "missing") return "○";
  return "?";
}

function statusClass(status: "ok" | "missing" | "unknown"): string {
  if (status === "ok") return "text-emerald-400";
  if (status === "missing") return "text-amber-200";
  return "text-zinc-500";
}

export function CapitalHelpDrawer({
  checklistInput,
}: {
  checklistInput: CapitalSetupChecklistInput;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const checklist = buildCapitalSetupChecklist(checklistInput);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const panel = (
    <div className="flex h-full min-h-0 w-full flex-col bg-zinc-950 lg:w-[360px] lg:border-l lg:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 id={titleId} className="text-sm font-semibold text-zinc-100">
          Capital Help
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 min-w-11 rounded-md px-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Close Capital Help"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ol className="mb-4 flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
          {CAPITAL_HELP_WORKFLOW_STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-1">
              {i > 0 ? <span className="text-zinc-600">→</span> : null}
              <span className="rounded border border-zinc-800 bg-zinc-900/80 px-1.5 py-0.5 text-zinc-300">
                {step}
              </span>
            </li>
          ))}
        </ol>

        <div className="space-y-4">
          {CAPITAL_HELP_SECTIONS.map((section) => (
            <section key={section.id} className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {section.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Setup checklist
          </h3>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
              >
                <div className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 font-mono text-xs ${statusClass(item.status)}`}
                    aria-hidden
                  >
                    {statusGlyph(item.status)}
                  </span>
                  <div>
                    <p className="text-zinc-200">{item.label}</p>
                    {item.detail ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{item.detail}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-capital-help-drawer="open"
            data-capital-help-layout="responsive"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60 lg:bg-black/40"
              aria-label="Dismiss Capital Help"
              onClick={() => setOpen(false)}
            />
            {/* Mobile: full-width sheet; desktop: right drawer */}
            <div className="relative z-10 flex h-full w-full lg:ml-auto lg:w-auto">
              {panel}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-capital-help-trigger
      >
        Help
      </button>
      {overlay}
    </>
  );
}
