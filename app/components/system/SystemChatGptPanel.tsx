"use client";

import { useState } from "react";
import { buildPacket } from "@/lib/snapshot";
import { CopyUrlButton } from "@/app/components/CopyUrlButton";
import { ShowQrPanel } from "@/app/components/system/ShowQrPanel";

interface SystemChatGptPanelProps {
  snapshotUrl: string | null;
  snapshotQrDataUrl: string | null;
  snapshotRevision: number | null;
  snapshotUpdatedAt: string | null;
  fullContext: string;
  fullContextAllClosed: string;
  unreviewedContext: string;
  suggestedQuestion: string;
}

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

type Scope = "current" | "all" | "unreviewed";

export function SystemChatGptPanel({
  snapshotUrl,
  snapshotQrDataUrl,
  snapshotRevision,
  snapshotUpdatedAt,
  fullContext,
  fullContextAllClosed,
  unreviewedContext,
  suggestedQuestion,
}: SystemChatGptPanelProps) {
  const [question, setQuestion] = useState(suggestedQuestion);
  const [scope, setScope] = useState<Scope>("current");
  const [copiedHandoff, setCopiedHandoff] = useState(false);

  const contextByScope: Record<Scope, string> = {
    current: fullContext,
    all: fullContextAllClosed,
    unreviewed: unreviewedContext,
  };

  const activeContext = contextByScope[scope];

  async function handleCopyHandoff() {
    const ok = await copyText(buildPacket(activeContext, question, []));
    if (ok) {
      setCopiedHandoff(true);
      setTimeout(() => setCopiedHandoff(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <dl className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
          <dt className="text-xs font-medium uppercase text-zinc-400">Current snapshot</dt>
          <dd>
            {snapshotRevision !== null ? `#${snapshotRevision}` : "Not synced"}
            {snapshotUpdatedAt && (
              <span className="ml-2 text-zinc-500">· {snapshotUpdatedAt}</span>
            )}
          </dd>
        </div>
      </dl>

      {snapshotUrl ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={snapshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Open snapshot
          </a>
          <CopyUrlButton url={snapshotUrl} label="Copy snapshot URL" />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Configure bridge tokens and sync to enable cloud snapshot URL.
        </p>
      )}

      {snapshotUrl && snapshotQrDataUrl && (
        <ShowQrPanel
          qrDataUrl={snapshotQrDataUrl}
          caption="Cloud snapshot — read-only JSON for ChatGPT or phone"
          url={snapshotUrl}
        />
      )}

      <div className="border-t border-zinc-100 pt-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Question for ChatGPT</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={handleCopyHandoff}
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {copiedHandoff ? "✓ Handoff copied" : "Copy handoff"}
        </button>
      </div>

      <details className="rounded-md border border-zinc-200 bg-zinc-50">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-600">
          Advanced handoff options
        </summary>
        <div className="space-y-3 border-t border-zinc-200 p-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["current", "Current state"],
                ["unreviewed", "Unreviewed only"],
                ["all", "Full cycle"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`rounded-full px-3 py-1 text-xs ${
                  scope === value
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 text-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-xs text-zinc-500">Preview context</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded border border-zinc-200 bg-white p-2 text-xs">
              {activeContext}
            </pre>
          </details>
        </div>
      </details>
    </div>
  );
}
