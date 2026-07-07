"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/app/components/SignOutButton";
import {
  isPreviewNavActive,
  PREVIEW_NAV_MAIN,
  PREVIEW_NAV_SYSTEM,
  type PreviewNavContext,
} from "@/lib/preview-nav";

const MOBILE_TABS = [
  { href: "/home-preview", label: "Home" },
  { href: "/trades-preview", label: "Trades" },
  { href: "/exchange", label: "Assist" },
  { href: "/inbox", label: "Inbox" },
] as const;

export function PreviewMobileNav({ nav }: { nav: PreviewNavContext }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabClass = (href: string) =>
    isPreviewNavActive(pathname, href)
      ? "text-violet-300"
      : "text-zinc-500 hover:text-zinc-300";

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur lg:hidden ${
          moreOpen ? "max-h-[70vh] overflow-y-auto" : ""
        }`}
      >
        {moreOpen && (
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">More</p>
            <nav className="mt-2 space-y-1">
              {PREVIEW_NAV_MAIN.filter((item) => !MOBILE_TABS.some((t) => t.href === item.href)).map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm ${tabClass(item.href)}`}
                  >
                    {item.label}
                  </Link>
                )
              )}
              {PREVIEW_NAV_SYSTEM.filter((item) => item.href !== "/exchange" && item.href !== "/inbox").map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm ${tabClass(item.href)}`}
                  >
                    {item.label}
                  </Link>
                )
              )}
              <Link
                href="/trades/new"
                onClick={() => setMoreOpen(false)}
                className="block rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-medium text-white"
              >
                New trade
              </Link>
              <p className="px-3 pt-2 text-xs text-zinc-500">
                {nav.cycleLabel} · {nav.tradesUsed}/{nav.tradesMax} trades · {nav.lossBudgetLabel}{" "}
                left
              </p>
              <SignOutButton className="px-3 py-2 text-left text-sm text-zinc-500" />
            </nav>
          </div>
        )}

        <nav
          className="grid grid-cols-5 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
          aria-label="Mobile dashboard"
        >
          {MOBILE_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium ${tabClass(tab.href)}`}
            >
              {tab.label}
              {tab.href === "/inbox" && nav.pendingInboxCount > 0 && (
                <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] text-white">
                  {nav.pendingInboxCount}
                </span>
              )}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium ${
              moreOpen ? "text-violet-300" : "text-zinc-500"
            }`}
          >
            More
          </button>
        </nav>
      </div>
    </>
  );
}
