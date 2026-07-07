"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/app/components/SignOutButton";
import {
  isPreviewNavActive,
  PREVIEW_NAV_MAIN,
  PREVIEW_NAV_SYSTEM,
  type PreviewNavContext,
} from "@/lib/preview-nav";

export function PreviewSidebar({ nav }: { nav: PreviewNavContext }) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    isPreviewNavActive(pathname, href)
      ? "bg-violet-600/20 font-medium text-violet-300"
      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200";

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3 lg:hidden">
        <Link href="/home-preview" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
            M
          </span>
          <span className="font-semibold">MatrixTrade</span>
        </Link>
        <span className="text-xs text-zinc-600">Dashboard</span>
      </div>

      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4 lg:flex xl:w-60">
        <Link href="/home-preview" className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
            M
          </span>
          <span className="font-semibold">MatrixTrade</span>
        </Link>

        <nav className="space-y-1">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Main
          </p>
          {PREVIEW_NAV_MAIN.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${linkClass(item.href)}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="mt-6 space-y-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            System
          </p>
          {PREVIEW_NAV_SYSTEM.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${linkClass(item.href)}`}
            >
              {item.label}
              {item.href === "/inbox" && nav.pendingInboxCount > 0 && (
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  {nav.pendingInboxCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-4 border-t border-zinc-800 pt-4">
          <Link
            href="/trades/new"
            className="block rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-500"
          >
            New trade
          </Link>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Current cycle</p>
            <p className="mt-1 text-sm font-medium">{nav.cycleLabel}</p>
            <p className="text-xs text-zinc-500">
              {nav.tradesUsed} / {nav.tradesMax} trades
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{
                  width: `${Math.min(100, (nav.tradesUsed / nav.tradesMax) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Loss budget {nav.lossBudgetLabel} left
            </p>
          </div>

          <SignOutButton className="text-xs text-zinc-500 transition hover:text-zinc-300" />
        </div>
      </aside>
    </>
  );
}
