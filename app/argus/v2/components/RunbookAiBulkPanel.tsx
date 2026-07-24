"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  appendRunbookCardsFromTextAction,
  rebuildRunbookFromTextAction,
} from "@/app/argus/actions";
import {
  parseRunbookBulkText,
  runbookBulkPreviewToText,
  type RunbookBulkPreviewLine,
} from "@/lib/argus/runbook-ai-bulk";
import { formatArgusError } from "@/lib/argus/persistence/errors";

export function RunbookAiBulkPanel({ runbookId }: { runbookId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [preview, setPreview] = useState<RunbookBulkPreviewLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cardCount = useMemo(
    () => (preview ?? []).filter((line) => line.type === "item").length,
    [preview]
  );

  function handlePreview() {
    setError(null);
    setMessage(null);
    const lines = parseRunbookBulkText(pasteValue);
    if (lines.filter((line) => line.type === "item").length === 0) {
      setPreview(null);
      setError("No cards found — paste one item per line.");
      return;
    }
    setPreview(lines);
  }

  function handleApply(mode: "append" | "replace") {
    if (!preview) return;
    const text = runbookBulkPreviewToText(preview);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        if (mode === "append") {
          await appendRunbookCardsFromTextAction(runbookId, text);
          setMessage(`Appended ${cardCount} card${cardCount === 1 ? "" : "s"}.`);
        } else {
          if (!window.confirm("Replace all cards? This resets checkmarks.")) return;
          await rebuildRunbookFromTextAction(runbookId, text);
          setMessage(`Rebuilt with ${cardCount} card${cardCount === 1 ? "" : "s"}.`);
        }
        setPreview(null);
        setPasteValue("");
        router.refresh();
      } catch (err) {
        const { layer, message: errMsg } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${errMsg}`);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-lime-500/30 bg-lime-500/10 px-3 py-2 text-xs font-medium text-lime-300 hover:bg-lime-500/20"
        aria-expanded={open}
      >
        {open ? "▲" : "▼"} AI bulk import
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
          <p className="mb-3 text-xs text-zinc-500">
            Paste AI-generated list output (one line per check; <code className="text-zinc-400"># Title</code> for
            sections). Preview all lines, then append or replace — nothing writes until you confirm.
          </p>

          {error ? (
            <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mb-3 rounded-lg border border-lime-500/30 bg-lime-950/40 px-3 py-2 text-xs text-lime-200">
              {message}
            </p>
          ) : null}

          <textarea
            value={pasteValue}
            onChange={(event) => {
              setPasteValue(event.target.value);
              setPreview(null);
              setError(null);
              setMessage(null);
            }}
            rows={8}
            placeholder={"• Confirm stakeholders\n• Review scope\n\n# Follow-up\n• Send summary"}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={pending || !pasteValue.trim()}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-lime-500/30 hover:text-lime-300 disabled:opacity-40"
            >
              Preview
            </button>
            {preview ? (
              <>
                <button
                  type="button"
                  onClick={() => handleApply("append")}
                  disabled={pending}
                  className="rounded-lg bg-lime-500/15 px-3 py-1.5 text-xs font-medium text-lime-300 ring-1 ring-lime-500/30 hover:bg-lime-500/25 disabled:opacity-40"
                >
                  Append all ({cardCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleApply("replace")}
                  disabled={pending}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
                >
                  Replace all ({cardCount})
                </button>
              </>
            ) : null}
          </div>

          {preview ? (
            <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              {preview.map((line, index) =>
                line.type === "sep" ? (
                  <li key={`sep-${index}`} className="border-t border-zinc-700/70 pt-1" aria-hidden />
                ) : line.type === "section" ? (
                  <li
                    key={`sec-${index}`}
                    className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    {line.text}
                  </li>
                ) : (
                  <li key={`item-${index}`} className="text-xs text-zinc-300">
                    {line.text}
                  </li>
                )
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
