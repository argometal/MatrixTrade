"use client";

import { useState } from "react";
import { buildPacket } from "@/lib/snapshot";

interface ChatGptHandoffProps {
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

export function ChatGptHandoff({
  fullContext,
  fullContextAllClosed,
  unreviewedContext,
  suggestedQuestion,
}: ChatGptHandoffProps) {
  const [question, setQuestion] = useState(suggestedQuestion);
  const [scope, setScope] = useState<Scope>("current");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [screenshots, setScreenshots] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const contextByScope: Record<Scope, string> = {
    current: fullContext,
    all: fullContextAllClosed,
    unreviewed: unreviewedContext,
  };

  const activeContext = contextByScope[scope];

  async function handleCopy(text: string, kind: string) {
    const ok = await copyText(text);
    if (ok) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  function handleCopyPacket() {
    const names = screenshots
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    handleCopy(buildPacket(activeContext, question, names), "packet");
  }

  const copyLabel = (kind: string, defaultLabel: string) =>
    copied === kind ? "Copied!" : defaultLabel;

  return (
    <section className="space-y-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">ChatGPT Handoff</h2>
        <p className="mt-1 text-sm text-zinc-500">
          One tap copies numbers + review metadata + Obsidian analysis. Write long-form notes in
          Obsidian — the app pulls them automatically.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Export scope</p>
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
              className={`rounded-full px-3 py-1 text-sm ${
                scope === value
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleCopy(activeContext, "context")}
          className="w-full rounded-md bg-emerald-700 px-4 py-3.5 text-sm font-medium text-white hover:bg-emerald-600 sm:w-auto"
        >
          {copyLabel("context", "Copy Full Context for ChatGPT")}
        </button>
        <details className="rounded-md border border-zinc-200 bg-zinc-50">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700">
            Preview what will be copied
          </summary>
          <pre className="max-h-64 overflow-auto border-t border-zinc-200 p-3 text-xs leading-relaxed text-zinc-700">
            {activeContext}
          </pre>
        </details>
      </div>

      <div className="space-y-3 border-t border-zinc-100 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Optional: add a question
        </h3>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="Suggested question based on your cycle state..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCopyPacket}
          className="rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {copyLabel("packet", "Copy Context + Question")}
        </button>
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          {showAdvanced ? "Hide advanced options" : "Advanced options"}
        </button>
        {showAdvanced && (
          <label className="mt-3 block space-y-1">
            <span className="text-sm font-medium text-zinc-700">
              Screenshot filenames (optional)
            </span>
            <textarea
              value={screenshots}
              onChange={(e) => setScreenshots(e.target.value)}
              rows={2}
              placeholder={"chart-amzn-1h.png"}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </label>
        )}
      </div>
    </section>
  );
}
