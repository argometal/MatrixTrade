"use client";

import { useState } from "react";
import { buildSectionedPacket } from "@/lib/sectioned-snapshot";

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

export function SectionedSnapshotPanel({
  sectionedCurrent,
  sectionedAll,
  sectionedUnreviewed,
  suggestedQuestion,
}: {
  sectionedCurrent: string;
  sectionedAll: string;
  sectionedUnreviewed: string;
  suggestedQuestion: string;
}) {
  const [question, setQuestion] = useState(suggestedQuestion);
  const [scope, setScope] = useState<Scope>("current");
  const [copied, setCopied] = useState(false);

  const byScope: Record<Scope, string> = {
    current: sectionedCurrent,
    all: sectionedAll,
    unreviewed: sectionedUnreviewed,
  };

  async function handleCopy() {
    const ok = await copyText(buildSectionedPacket(byScope[scope], question));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Compact sectioned context for your AI assistant — includes prior AI notes for comparison.
        Paste the response back in Paste AI Notes below.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Question (optional)</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
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
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {copied ? "✓ Sectioned snapshot copied" : "Copy Sectioned Snapshot"}
        </button>
      </div>
    </div>
  );
}
