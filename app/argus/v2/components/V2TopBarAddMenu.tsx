"use client";

import { useEffect, useRef, useState } from "react";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { REGISTER } from "@/lib/argus/ux-copy";

/** Single top-bar entry — Register and Add context live inside the menu. */
export function V2TopBarAddMenu({ className = "" }: { className?: string }) {
  const { openCapture, openAddContext } = useArgusAdd();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 active:scale-[0.98]"
        title="Add — register evidence or new context"
      >
        +
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openCapture();
            }}
            className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-teal-200 transition hover:bg-teal-500/10"
          >
            {REGISTER.action}
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">Quick note on what happened</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openAddContext();
            }}
            className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-violet-200 transition hover:bg-violet-500/10"
          >
            {REGISTER.entityCapture}
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">{REGISTER.entityCaptureHint}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
