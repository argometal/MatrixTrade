"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

export function SnapshotButton({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: SnapshotMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function copyItem(item: SnapshotMenuItem) {
    const ok = await copyText(item.text);
    if (ok) {
      setCopiedId(item.id);
      setOpen(false);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  const single = items.length === 1;

  if (single) {
    const item = items[0]!;
    return (
      <button
        type="button"
        onClick={() => copyItem(item)}
        className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-left hover:bg-violet-500/20"
      >
        <span className="block text-xs font-medium text-violet-200">
          {copiedId === item.id ? "Copied ✓" : title}
        </span>
        <span className="mt-0.5 block text-[11px] text-zinc-500">{description}</span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-left hover:bg-violet-500/20"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-violet-200">
          {title}
          <span className="text-zinc-500">▾</span>
        </span>
        <span className="mt-0.5 block text-[11px] text-zinc-500">{description}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => copyItem(item)}
              className="block w-full px-3 py-2.5 text-left hover:bg-zinc-800"
            >
              <span className="text-xs font-medium text-zinc-200">
                {copiedId === item.id ? "Copied ✓" : item.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                {item.description}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
