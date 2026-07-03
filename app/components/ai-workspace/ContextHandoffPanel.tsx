"use client";

import { useState } from "react";
import { buildPacket } from "@/lib/snapshot";

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

export function ContextHandoffPanel({
  fullContext,
  fullContextAllClosed,
  unreviewedContext,
  suggestedQuestion,
  templates,
}: {
  fullContext: string;
  fullContextAllClosed: string;
  unreviewedContext: string;
  suggestedQuestion: string;
  templates: readonly string[];
}) {
  const [question, setQuestion] = useState(suggestedQuestion);
  const [scope, setScope] = useState<Scope>("current");
  const [copied, setCopied] = useState(false);

  const contextByScope: Record<Scope, string> = {
    current: fullContext,
    all: fullContextAllClosed,
    unreviewed: unreviewedContext,
  };

  async function handleCopyContext() {
    const ok = await copyText(buildPacket(contextByScope[scope], question, []));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Fallback when your assistant cannot fetch the Worker snapshot — paste this packet manually.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Question</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setQuestion(t)}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-400"
          >
            {t.length > 48 ? `${t.slice(0, 48)}…` : t}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCopyContext}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        {copied ? "✓ Context copied" : "Copy Context"}
      </button>

      <details className="rounded-md border border-zinc-200 bg-zinc-50">
        <summary className="cursor-pointer px-3 py-2 text-sm text-zinc-600">Advanced</summary>
        <div className="space-y-2 border-t border-zinc-200 p-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["current", "Current"],
                ["unreviewed", "Unreviewed"],
                ["all", "Full cycle"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`rounded-full px-3 py-1 text-xs ${
                  scope === value ? "bg-zinc-900 text-white" : "border border-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
