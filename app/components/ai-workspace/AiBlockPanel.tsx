"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { AI_BRIDGE_CAPABILITIES, AI_BRIDGE_FLOW } from "@/lib/ai-bridge-types";
import { sampleTradeAiBlock } from "@/lib/ai-block";

const FLOW_STEPS = [
  "Copy Snapshot",
  "Your AI",
  "Paste AI Block",
  "Import",
  "Inbox",
  "Review",
  "Apply",
  "Confirm persisted",
] as const;

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
  const [importResult, setImportResult] = useState<{ inboxItemId: string; origin: string } | null>(
    null
  );

  async function handleCopySnapshot() {
    const ok = await copyText(snapshotText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleImport(formData: FormData) {
    setError(null);
    setImportResult(null);
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
      setImportResult({ inboxItemId: result.inboxItemId, origin: result.origin });
      setPasteValue("");
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600">
        AI Bridge is not an AI — it is the structured bridge between MatrixTrade and your external
        assistant. {AI_BRIDGE_CAPABILITIES}
      </p>
      <p className="text-xs text-zinc-500">{AI_BRIDGE_FLOW}</p>

      <ol className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-zinc-700">
        {FLOW_STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700">
              {index + 1}
            </span>
            <span>{step}</span>
            {index < FLOW_STEPS.length - 1 && <span className="text-zinc-400">→</span>}
          </li>
        ))}
      </ol>

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

      {importResult && (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-medium">Imported to Inbox — next: Review → Apply</p>
          <dl className="grid gap-2 font-mono text-xs sm:grid-cols-2">
            <div>
              <dt className="text-emerald-800">inboxItemId</dt>
              <dd className="break-all">{importResult.inboxItemId}</dd>
            </div>
            <div>
              <dt className="text-emerald-800">origin</dt>
              <dd>{importResult.origin}</dd>
            </div>
          </dl>
          <Link
            href={`/inbox/${importResult.inboxItemId}?origin=${importResult.origin}`}
            className="inline-block rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Open Inbox to Apply
          </Link>
        </div>
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
            Load sample trade-proposal
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Types with Apply today: trade-proposal, trade-close, trade-review, analysis, trade-update,
          playbook-create, playbook-update. Never auto-applied.
        </p>
      </form>
    </div>
  );
}
