"use client";

import Link from "next/link";
import { ArgusMark } from "@/app/components/ArgusMark";
import { MobileMenuButton } from "@/app/components/preview/MobileMenuButton";
import { useMobileMenu } from "@/app/components/preview/MobileMenuContext";

export function PreviewMobileHeader({ pendingInboxCount = 0 }: { pendingInboxCount?: number }) {
  const { open, toggle } = useMobileMenu();

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur lg:hidden">
      <Link href="/home-preview" className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          M
        </span>
        <span className="truncate font-semibold text-zinc-100">MatrixTrade</span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href="/inbox"
          aria-label="Proposal history"
          title="Proposal history"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-sm text-zinc-400"
        >
          🔔
          {pendingInboxCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {pendingInboxCount > 99 ? "99+" : pendingInboxCount}
            </span>
          ) : null}
        </Link>
        <Link
          href="/argus/v2"
          aria-label="Open ARGUS"
          title="ARGUS"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80"
        >
          <ArgusMark size={28} />
        </Link>
        <MobileMenuButton open={open} onClick={toggle} />
      </div>
    </header>
  );
}
