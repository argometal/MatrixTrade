"use client";

import { useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { useControlPanel } from "./MatrixControlPanelProvider";

/**
 * Global MXT chrome — product map + intent router (NOT inside Control).
 * Copy once into a new AI chat; AI then guides the next UI action.
 */
export function StartHereButton({
  className = "",
}: {
  className?: string;
}) {
  const { data } = useControlPanel();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(data.startHere.brief);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`inline-flex h-9 shrink-0 items-center rounded-xl border border-zinc-600 bg-zinc-900 px-3.5 text-sm font-semibold text-zinc-100 transition hover:border-violet-500/50 hover:bg-zinc-800 active:scale-[0.98] ${className}`}
      title="Start Here — copy product map + intent router for a new AI chat"
      data-testid="start-here-button"
    >
      {copied ? "Copied ✓" : "Start Here"}
    </button>
  );
}
