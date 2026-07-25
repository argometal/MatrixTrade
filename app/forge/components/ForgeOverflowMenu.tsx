"use client";

/**
 * Overflow ⋯ menu via portal + fixed position.
 * Avoids clipping by parent overflow-hidden (same class of bug as MTA SnapshotButton).
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const DEFAULT_MENU_WIDTH_PX = 192; // w-48
const VIEWPORT_PAD_PX = 12;
/** ForgeShell fixed bottom nav ≈ 5.5rem + safe area — keep menus above it. */
const BOTTOM_CHROME_PX = 96;

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
    if (!open || !buttonRef.current) return;

    function placeMenu() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(menuWidthPx, vw - VIEWPORT_PAD_PX * 2);

      let left = align === "end" ? rect.right - width : rect.left;
      if (left + width > vw - VIEWPORT_PAD_PX) {
        left = vw - VIEWPORT_PAD_PX - width;
      }
      if (left < VIEWPORT_PAD_PX) left = VIEWPORT_PAD_PX;

      const bottomPad = VIEWPORT_PAD_PX + BOTTOM_CHROME_PX;
      const maxHeight = Math.min(360, vh - VIEWPORT_PAD_PX - bottomPad - 24);
      const spaceBelow = vh - rect.bottom - bottomPad;
      const spaceAbove = rect.top - VIEWPORT_PAD_PX;
      let top = rect.bottom + 4;
      if (spaceBelow < Math.min(maxHeight, 140) && spaceAbove > spaceBelow) {
        top = Math.max(VIEWPORT_PAD_PX, rect.top - maxHeight - 4);
      }
      if (top + maxHeight > vh - bottomPad) {
        top = Math.max(VIEWPORT_PAD_PX, vh - bottomPad - maxHeight);
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
              zIndex: 60,
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
