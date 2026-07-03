"use client";

import { useState } from "react";
import { buildPacket } from "@/lib/snapshot";

interface ChatGptPanelProps {
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

export function ChatGptPanel({
  fullContext,
  fullContextAllClosed,
  unreviewedContext,
  suggestedQuestion,
}: ChatGptPanelProps) {
  const [question, setQuestion] = useState(suggestedQuestion);
  const [scope, setScope] = useState<Scope>("current");
  const [screenshots, setScreenshots] = useState("");
  const [copied, setCopied] = useState(false);

  const contextByScope: Record<Scope, string> = {
    current: fullContext,
    all: fullContextAllClosed,
    unreviewed: unreviewedContext,
  };

  const activeContext = contextByScope[scope];

  async function handleCopyPacket() {
    const names = screenshots
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const ok = await copyText(buildPacket(activeContext, question, names));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">ChatGPT</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Write a question, copy context + question, paste in ChatGPT.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Question</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="What should I focus on next?"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={handleCopyPacket}
        className="w-full rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 sm:w-auto"
      >
        {copied ? "✓ Copied" : "Copy Context + Question"}
      </button>

      <details className="rounded-md border border-zinc-200 bg-zinc-50">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-600">
          Advanced options
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
                    : "border border-zinc-200 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">Screenshot filenames (optional)</span>
            <textarea
              value={screenshots}
              onChange={(e) => setScreenshots(e.target.value)}
              rows={2}
              placeholder="chart-amzn-1h.png"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-500 focus:outline-none"
            />
          </label>
          <details>
            <summary className="cursor-pointer text-xs text-zinc-500">Preview context</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded border border-zinc-200 bg-white p-2 text-xs leading-relaxed text-zinc-700">
              {activeContext}
            </pre>
          </details>
        </div>
      </details>
    </section>
  );
}
