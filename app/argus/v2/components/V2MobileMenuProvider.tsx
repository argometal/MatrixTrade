"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";
import {
  buildV2NavSections,
  isV2NavItemActive,
  type V2NavLinkItem,
} from "@/lib/argus/v2/nav-items";
import { useOverlayLock } from "@/lib/argus/use-overlay-lock";

type V2MobileMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const V2MobileMenuContext = createContext<V2MobileMenuContextValue | null>(null);

export function useV2MobileMenu() {
  const value = useContext(V2MobileMenuContext);
  if (!value) {
    throw new Error("useV2MobileMenu must be used within V2MobileMenuProvider");
  }
  return value;
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: V2NavLinkItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${
        active ? "bg-violet-500/15 text-violet-200" : "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
      }`}
    >
      <span className="flex items-center gap-2">
        <span>{item.label}</span>
        {item.badge ? (
          <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-300">
            {item.badge}
          </span>
        ) : null}
      </span>
      {item.count !== undefined ? (
        <span className={`text-xs tabular-nums ${active ? "text-violet-300/80" : "text-zinc-600"}`}>
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}

function V2MobileMenuDrawer({ counts, open, onClose }: { counts: V2NavCounts; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const sections = buildV2NavSections(counts);

  useOverlayLock(open);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-[200] bg-black/60 lg:hidden"
        onClick={onClose}
      />
      <aside
        id="v2-mobile-menu"
        className="fixed inset-y-0 left-0 z-[210] flex w-[min(100%,18.5rem)] flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Argus navigation"
      >
        <div className="border-b border-zinc-800/80 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold tracking-tight text-zinc-50">Argus</p>
              <p className="mt-0.5 text-xs text-zinc-500">Your knowledge. Connected.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4">
          {sections.map((section) => (
            <nav key={section.title} className="mb-5">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={`${section.title}-${item.href}-${item.label}`}>
                    <NavRow
                      item={item}
                      active={isV2NavItemActive(pathname, item)}
                      onNavigate={onClose}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-t border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live data · v2
          </div>
        </div>
      </aside>
    </>
  );
}

export function V2MobileMenuProvider({
  children,
  counts,
}: {
  children: ReactNode;
  counts: V2NavCounts;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <V2MobileMenuContext.Provider
      value={{
        open,
        setOpen,
        toggle: () => setOpen((value) => !value),
      }}
    >
      {children}
      <V2MobileMenuDrawer counts={counts} open={open} onClose={() => setOpen(false)} />
    </V2MobileMenuContext.Provider>
  );
}
