"use client";

import { useState, useTransition } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { sampleTradeAiBlock } from "@/lib/ai-block";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

export function AiBlockPanel({
  snapshotText,
  importAction,
}: {
  snapshotText: string;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCopySnapshot() {
    const ok = await copyText(snapshotText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleImport(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await importAction(formData);
      if ("error" in result) {
        setError(
          result.details?.length
            ? `${result.error}: ${result.details.join("; ")}`
            : result.error
        );
        return;
      }
      setSuccess(`Imported to Inbox (${result.origin}). Open Inbox to review and Apply.`);
      setPasteValue("");
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600">
        Copy Snapshot → paste in your AI assistant → paste the returned AI Block here → Import →
        review in Inbox → Apply.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopySnapshot}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {copied ? "✓ Snapshot copied" : "Copy Snapshot"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </p>
      )}

      <form action={handleImport} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Paste AI Block</span>
          <textarea
            name="aiBlock"
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            rows={14}
            placeholder='{ "type": "trade-proposal", "proposal": { "id": "H00X", "ticker": "...", "entry": 0, "stop": 0, "shares": 0 } }'
            className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-zinc-500 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending || !pasteValue.trim()}
            className="rounded-md border border-zinc-900 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import AI Block"}
          </button>
          <button
            type="button"
            onClick={() => setPasteValue(sampleTradeAiBlock())}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Load trade
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Supports plain JSON or a ```json fenced block. Types: trade-proposal, trade-close,
          trade-review, analysis. Not applied automatically.
        </p>
      </form>
    </div>
  );
}
