"use client";

/**
 * Overflow ⋯ menu via portal + fixed position.
 * Avoids clipping by parent overflow-hidden (same class of bug as MTA SnapshotButton).
 * Flips above the trigger near the ForgeShell bottom chrome so Delete stays reachable.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const DEFAULT_MENU_WIDTH_PX = 192; // w-48
const VIEWPORT_PAD_PX = 12;
/** Primary nav (~3.5rem) + Focus/Active/Archive (~3.5rem) + cushion. */
const BOTTOM_CHROME_PX = 168;
const ITEM_ESTIMATE_PX = 42;

export type ForgeOverflowMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type MenuBox = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  items: ForgeOverflowMenuItem[];
  /** Prefer menu under the trigger; flip above when needed. */
  align?: "start" | "end";
  menuWidthPx?: number;
  triggerClassName?: string;
  trigger?: ReactNode;
};

function readSafeAreaBottom(): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;bottom:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const pad = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return pad;
}

export function ForgeOverflowMenu({
  open,
  onOpenChange,
  label,
  items,
  align = "end",
  menuWidthPx = DEFAULT_MENU_WIDTH_PX,
  triggerClassName,
  trigger,
}: Props) {
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuBox(null);
      return;
    }

    function placeMenu(measuredHeight?: number) {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(menuWidthPx, vw - VIEWPORT_PAD_PX * 2);
      const bottomPad = VIEWPORT_PAD_PX + BOTTOM_CHROME_PX + readSafeAreaBottom();
      const topPad = VIEWPORT_PAD_PX;

      let left = align === "end" ? rect.right - width : rect.left;
      if (left + width > vw - VIEWPORT_PAD_PX) {
        left = vw - VIEWPORT_PAD_PX - width;
      }
      if (left < VIEWPORT_PAD_PX) left = VIEWPORT_PAD_PX;

      const estimatedH = Math.min(
        360,
        measuredHeight ?? items.length * ITEM_ESTIMATE_PX + 8
      );
      const spaceBelow = vh - bottomPad - rect.bottom - 4;
      const spaceAbove = rect.top - topPad - 4;
      const needsFlip =
        spaceBelow < estimatedH
          ? spaceAbove > spaceBelow
          : spaceBelow < 200 && spaceAbove > spaceBelow;

      const avail = Math.max(96, needsFlip ? spaceAbove : spaceBelow);
      const maxHeight = Math.min(360, avail);
      const height = Math.min(estimatedH, maxHeight);

      let top = needsFlip ? rect.top - 4 - height : rect.bottom + 4;
      if (top < topPad) top = topPad;
      if (top + height > vh - bottomPad) {
        top = Math.max(topPad, vh - bottomPad - height);
      }

      setMenuBox({ left, top, width, maxHeight });
    }

    function onReposition() {
      const el = menuRef.current;
      placeMenu(el?.scrollHeight);
    }

    placeMenu();
    const raf = window.requestAnimationFrame(() => {
      const el = menuRef.current;
      if (el) placeMenu(el.scrollHeight);
    });

    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, items.length, align, menuWidthPx]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const menu =
    open && mounted && menuBox
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            style={{
              position: "fixed",
              left: menuBox.left,
              top: menuBox.top,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
              zIndex: 100,
            }}
            className="overflow-y-auto overscroll-contain rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-800 ${
                  item.danger ? "text-rose-300" : "text-zinc-200"
                }`}
                onClick={() => {
                  onOpenChange(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          triggerClassName ??
          "flex min-h-14 min-w-11 items-center justify-center text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
        }
        onClick={() => onOpenChange(!open)}
      >
        {trigger ?? "⋯"}
      </button>
      {menu}
    </>
  );
}
