"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { withLeadingAggregateSnapshot } from "@/lib/snapshot-aggregate";

const MENU_WIDTH_PX = 288; // w-72
const VIEWPORT_PAD_PX = 12;

type MenuBox = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

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
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Snapshot general first — read-only projection; children unchanged (Prompt ID 24-30). */
  const menuItems = useMemo(
    () => withLeadingAggregateSnapshot("menu", title, items),
    [title, items]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function placeMenu() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(MENU_WIDTH_PX, vw - VIEWPORT_PAD_PX * 2);

      // Prefer aligning to trigger left; clamp so the full menu stays on-screen.
      let left = rect.left;
      if (left + width > vw - VIEWPORT_PAD_PX) {
        left = vw - VIEWPORT_PAD_PX - width;
      }
      if (left < VIEWPORT_PAD_PX) left = VIEWPORT_PAD_PX;

      const maxHeight = Math.min(384, vh - VIEWPORT_PAD_PX * 2 - 48);
      const spaceBelow = vh - rect.bottom - VIEWPORT_PAD_PX;
      const spaceAbove = rect.top - VIEWPORT_PAD_PX;
      let top = rect.bottom + 4;
      if (spaceBelow < Math.min(maxHeight, 160) && spaceAbove > spaceBelow) {
        top = Math.max(VIEWPORT_PAD_PX, rect.top - maxHeight - 4);
      }
      if (top + maxHeight > vh - VIEWPORT_PAD_PX) {
        top = Math.max(VIEWPORT_PAD_PX, vh - VIEWPORT_PAD_PX - maxHeight);
      }

      setMenuBox({ left, top, width, maxHeight });
    }

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, menuItems.length]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
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

  const menu =
    open && mounted && menuBox
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              left: menuBox.left,
              top: menuBox.top,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
              zIndex: 80,
            }}
            className="overflow-y-auto overscroll-contain rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
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
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
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
      {menu}
    </div>
  );
}
