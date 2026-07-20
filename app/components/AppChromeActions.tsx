"use client";

import Link from "next/link";
import { ArgusMark } from "@/app/components/ArgusMark";
import { TradingMark } from "@/app/components/TradingMark";

const iconBtn =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200";

/** MatrixTrade chrome: inbox + switch to Argus (never Matrix). */
export function MatrixAppChromeActions({ pendingInboxCount = 0 }: { pendingInboxCount?: number }) {
  return (
    <>
      <Link href="/inbox" aria-label="History" title="History" className={iconBtn}>
        🔔
        {pendingInboxCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {pendingInboxCount > 99 ? "99+" : pendingInboxCount}
          </span>
        ) : null}
      </Link>
      <Link href="/argus/v2" aria-label="Open ARGUS" title="ARGUS" className={`${iconBtn} p-0`}>
        <ArgusMark size={28} />
      </Link>
    </>
  );
}

/** Argus chrome: inbox + switch to MatrixTrade (never Argus). */
export function ArgusAppChromeActions({ inboxCount = 0 }: { inboxCount?: number }) {
  return (
    <>
      <Link href="/argus/v2/inbox" aria-label="Inbox" title="Inbox" className={`${iconBtn} text-base`}>
        🔔
        {inboxCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {inboxCount > 99 ? "99+" : inboxCount}
          </span>
        ) : null}
      </Link>
      <Link href="/home-preview" aria-label="MatrixTrade" title="MatrixTrade" className={`${iconBtn} p-0`}>
        <TradingMark size={28} />
      </Link>
    </>
  );
}
