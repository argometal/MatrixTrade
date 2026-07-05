"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Log } from "@/lib/argus/types";
import {
  canConvertNoteToLog,
  canExtractLogToNote,
  journalEntryType,
} from "@/lib/argus/journal-behavior";
import { JOURNAL_BEHAVIOR } from "@/lib/argus/ux-copy";
import { convertNoteToLogAction, extractLogToNoteAction } from "@/app/argus/actions";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { inputClass } from "./ui";

export function JournalKindActions({ log }: { log: Log }) {
  const router = useRouter();
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertDate, setConvertDate] = useState(log.date.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const entryType = journalEntryType(log);
  const showConvert = canConvertNoteToLog(log);
  const showExtract = canExtractLogToNote(log);

  if (!showConvert && !showExtract) return null;

  function runExtract() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("logId", log.id);
        await extractLogToNoteAction(formData);
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  function runConvert() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("logId", log.id);
        formData.set("date", convertDate);
        await convertNoteToLogAction(formData);
        setConvertOpen(false);
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{JOURNAL_BEHAVIOR.title}</p>
      <p className="mt-1 text-[13px] text-zinc-500">
        {entryType === "note" ? JOURNAL_BEHAVIOR.noteHint : JOURNAL_BEHAVIOR.logHint}
      </p>

      {error ? <p className="mt-2 text-sm text-amber-400">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {showExtract ? (
          <button
            type="button"
            onClick={runExtract}
            disabled={isPending}
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {isPending ? JOURNAL_BEHAVIOR.extractPending : JOURNAL_BEHAVIOR.extractToNote}
          </button>
        ) : null}

        {showConvert ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConvertDate(log.date.slice(0, 10));
              setConvertOpen(true);
            }}
            disabled={isPending}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {JOURNAL_BEHAVIOR.convertToLog}
          </button>
        ) : null}
      </div>

      {convertOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="convert-note-title"
          >
            <h2 id="convert-note-title" className="text-lg font-semibold text-zinc-100">
              {JOURNAL_BEHAVIOR.convertModalTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{log.title || JOURNAL_BEHAVIOR.untitled}</p>
            <label className="mt-4 block">
              <span className="text-xs font-medium text-zinc-500">{JOURNAL_BEHAVIOR.convertDate}</span>
              <input
                type="date"
                value={convertDate}
                onChange={(e) => setConvertDate(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{JOURNAL_BEHAVIOR.convertModalHint}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConvertOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                {JOURNAL_BEHAVIOR.cancel}
              </button>
              <button
                type="button"
                onClick={runConvert}
                disabled={isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {isPending ? JOURNAL_BEHAVIOR.convertPending : JOURNAL_BEHAVIOR.convertConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
