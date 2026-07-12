"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { SignOutButton } from "@/app/components/SignOutButton";
import {
  isPreviewNavActive,
  PREVIEW_NAV_SECTIONS,
  type PreviewNavContext,
} from "@/lib/preview-nav";

export function PreviewSidebar({ nav }: { nav: PreviewNavContext }) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    isPreviewNavActive(pathname, href)
      ? "bg-violet-600/20 font-medium text-violet-300"
      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200";

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4 lg:flex xl:w-60">
      <Link href="/home-preview" className="mb-8 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
          M
        </span>
        <span className="font-semibold">MatrixTrade</span>
      </Link>

      {PREVIEW_NAV_SECTIONS.map((section) => (
        <nav key={section.id} className={section.id === "system" ? "mt-6 space-y-1" : "space-y-1"}>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            {section.label}
          </p>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${linkClass(item.href)}`}
            >
              {item.label}
              {"badge" in item && item.badge === "inbox" && nav.pendingInboxCount > 0 && (
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  {nav.pendingInboxCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      ))}

      <div className="mt-auto space-y-4 border-t border-zinc-800 pt-4">
        <div>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Apps</p>
          <AppExchangeActions app="matrix" inboxCount={nav.pendingInboxCount} className="px-1" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">Trading lab</p>
          <p className="mt-1 text-sm font-medium">{nav.cycleLabel}</p>
          <p className="text-xs text-zinc-500">{nav.closedTrades} closed trades</p>
          <p className="mt-2 text-xs text-zinc-500">Monthly room {nav.monthlyLossRoomLabel}</p>
        </div>

        <SignOutButton className="text-xs text-zinc-500 transition hover:text-zinc-300" />
      </div>
    </aside>
  );
}
