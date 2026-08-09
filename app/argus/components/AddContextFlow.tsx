"use client";

import { useEffect, useState, useTransition } from "react";
import { createEntityInlineAction, type CreatedEntityResult } from "@/app/argus/actions";
import { KindIcon } from "@/app/argus/components/create-link-shared";
import { inputClass, textareaClass } from "@/app/argus/components/ui";
import { CREATE_ITEM_HINTS } from "@/lib/argus/create-flow-types";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { useOverlayLock } from "@/lib/argus/use-overlay-lock";
import {
  REFERENCE_KIND_LABELS,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { ADD_CONTEXT, CAPTURE } from "@/lib/argus/ux-copy";

const CONTEXT_KINDS: ReferenceKind[] = [
  "person",
  "organization",
  "project",
  "topic",
  "event",
];

type Step = "pick" | "form";

export function AddContextFlow({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: CreatedEntityResult) => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [kind, setKind] = useState<ReferenceKind>("topic");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useOverlayLock(open);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setKind("topic");
    setName("");
    setNotes("");
    setEventDate(today);
    setError(null);
  }, [open, today]);

  if (!open) return null;

  function pickKind(next: ReferenceKind) {
    setKind(next);
    setStep("form");
    setError(null);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEntityInlineAction(
          kind,
          trimmed,
          notes.trim(),
          [],
          kind === "event" ? { startDate: (eventDate || today).slice(0, 10) } : undefined
        );
        onCreated(result);
        onClose();
      } catch (err) {
        const { message } = formatArgusError(err);
        setError(message);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ADD_CONTEXT.title}
    >
      <div
        className={`flex w-full max-w-lg flex-col rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-2xl ${
          step === "pick"
            ? "max-h-[min(94dvh,720px)]"
            : "max-h-[min(88dvh,640px)]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-2 shrink-0 sm:mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
            {ADD_CONTEXT.title}
          </p>
          <h2 className="text-base font-bold text-zinc-50 sm:text-lg">
            {step === "pick" ? ADD_CONTEXT.pickKind : REFERENCE_KIND_LABELS[kind]}
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 sm:mt-1">
            {step === "pick" ? ADD_CONTEXT.hint : CREATE_ITEM_HINTS[kind]}
          </p>
        </header>

        {error ? (
          <p className="mb-2 rounded-lg bg-amber-950/40 px-3 py-2 text-sm text-amber-300 sm:mb-3">{error}</p>
        ) : null}

        {step === "pick" ? (
          <nav className="argus-overlay-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain sm:space-y-2">
            {CONTEXT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => pickKind(k)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 text-left transition hover:border-violet-500/30 hover:bg-zinc-900 sm:px-4 sm:py-3"
              >
                <KindIcon kind={k} className="!h-10 !w-10 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-100">
                    {REFERENCE_KIND_LABELS[k]}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
                    {CREATE_ITEM_HINTS[k]}
                  </span>
                </span>
              </button>
            ))}
          </nav>
        ) : (
          <div className="argus-overlay-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Name</span>
              <input
                className={`${inputClass} mt-1`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder={`New ${REFERENCE_KIND_LABELS[kind].toLowerCase()}`}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Notes (optional)</span>
              <textarea
                className={`${textareaClass} mt-1 min-h-[72px]`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </label>
            {kind === "event" ? (
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">{CAPTURE.date}</span>
                <input
                  type="date"
                  className={`${inputClass} mt-1`}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </label>
            ) : null}
          </div>
        )}

        <footer className="mt-3 flex shrink-0 gap-3 border-t border-zinc-800 pt-3 sm:mt-4 sm:pt-4">
          <button
            type="button"
            onClick={() => {
              if (step === "form") {
                setStep("pick");
                setError(null);
              } else {
                onClose();
              }
            }}
            className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            {step === "form" ? "Back" : CAPTURE.cancel}
          </button>
          {step === "form" ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !name.trim()}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save & Link"}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
