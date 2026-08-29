"use client";

import { useEffect, useId, useRef, useState } from "react";
import { argusHref, matrixTradeHref } from "@/lib/ecosystem-urls";

type SystemLink = {
  id: string;
  name: string;
  description: string;
  href: string;
  external: boolean;
};

/**
 * Minimal Forge-owned systems menu (F3).
 * Replaces F2 AppExchangeActions stub. Not the full /apps portal.
 * Cross-product targets are absolute URLs (no module imports).
 */
export function AppExchangeActions({
  className = "",
}: {
  app: "matrix" | "argus" | "forge";
  inboxCount?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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

  const systems: SystemLink[] = [
    {
      id: "argusforge",
      name: "Argus Forge",
      description: "This app · Explorer · Chaos",
      href: "/forge",
      external: false,
    },
    {
      id: "vault",
      name: "Vault",
      description: "Prepared output",
      href: "/forge/vault",
      external: false,
    },
    {
      id: "argus",
      name: "ARGUS",
      description: "Intelligence (external)",
      href: argusHref("/argus/v2"),
      external: true,
    },
    {
      id: "matrixtrade",
      name: "MatriXTrade",
      description: "Trading (external)",
      href: matrixTradeHref("/home-preview"),
      external: true,
    },
  ];

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Systems"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
      >
        A
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl"
        >
          <ul className="py-1">
            {systems.map((s) => (
              <li key={s.id} role="none">
                <a
                  role="menuitem"
                  href={s.href}
                  {...(s.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 hover:bg-zinc-900"
                >
                  <span className="block text-sm font-medium text-zinc-100">{s.name}</span>
                  <span className="block text-[11px] text-zinc-500">{s.description}</span>
                </a>
              </li>
            ))}
          </ul>
          <form action="/api/auth/logout" method="post" className="border-t border-zinc-800 p-2">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
