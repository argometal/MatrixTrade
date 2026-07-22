"use client";

import Link from "next/link";
import { useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import type { AttentionItem } from "@/lib/dashboard-attention";

/** One Needs Attention row: Copy for AI · Apply · Go */
export function NeedsAttentionRow({ item }: { item: AttentionItem }) {
  const { openPanel } = useControlPanel();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!item.taskSnapshotText) return;
    const ok = await copyText(item.taskSnapshotText);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200">{item.label}</p>
        {item.taskId ? (
          <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{item.taskId}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {item.taskSnapshotText ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-600/25"
          >
            {copied ? "Copied ✓" : "Copy for AI"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => openPanel({ step: "apply" })}
          className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-600/25"
        >
          Apply
        </button>
        <Link
          href={item.href}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
        >
          Go →
        </Link>
      </div>
    </li>
  );
}
