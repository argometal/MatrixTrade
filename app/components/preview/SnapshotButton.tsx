"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { withLeadingAggregateSnapshot } from "@/lib/snapshot-aggregate";

const MENU_WIDTH_PX = 288; // w-72
const VIEWPORT_PAD_PX = 12;

export function SnapshotButton({
  title,
  description,
  items,
  className = "",
}: {
  title: string;
  description: string;
  items: SnapshotMenuItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  /** Prefer left edge of trigger; flip to right when the menu would clip off-screen. */
  const [align, setAlign] = useState<"left" | "right">("left");
  const rootRef = useRef<HTMLDivElement>(null);

  /** Snapshot general first — read-only projection; children unchanged (Prompt ID 24-30). */
  const menuItems = useMemo(
    () => withLeadingAggregateSnapshot("menu", title, items),
    [title, items]
  );

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;

    function placeMenu() {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const vw = window.innerWidth;
      const maxMenu = Math.min(MENU_WIDTH_PX, vw - VIEWPORT_PAD_PX * 2);
      const spaceRight = vw - rect.left - VIEWPORT_PAD_PX;
      const spaceLeft = rect.right - VIEWPORT_PAD_PX;

      // Grow right from left edge when it fits; otherwise grow left from right edge.
      if (spaceRight >= maxMenu) {
        setAlign("left");
      } else if (spaceLeft >= maxMenu) {
        setAlign("right");
      } else {
        // Neither side fits fully — pick the side with more room; max-width keeps it in view.
        setAlign(spaceRight >= spaceLeft ? "left" : "right");
      }
    }

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

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

  const single = menuItems.length === 1;

  if (single) {
    const item = menuItems[0]!;
    return (
      <button
        type="button"
        onClick={() => copyItem(item)}
        className={`rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-left hover:bg-violet-500/20 ${className}`}
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
        className={`rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-left hover:bg-violet-500/20 ${className}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-violet-200">
          {title}
          <span className="text-zinc-500">▾</span>
        </span>
        <span className="mt-0.5 block text-[11px] text-zinc-500">{description}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute z-40 mt-1 max-h-[min(24rem,calc(100dvh-6rem))] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
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
