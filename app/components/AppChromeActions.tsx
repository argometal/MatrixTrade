"use client";

import Link from "next/link";
import { ForgeQuickNavMenu, type ForgeSystemId } from "@/app/apps/components/ForgePortalNav";

const iconBtn =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200";

/** MTA chrome: inbox + Forge Home + ··· quick-nav (no flat app icons). */
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
      <Link href="/apps" aria-label="ARGUS FORGE Home" title="Forge Home" className={iconBtn}>
        <span className="text-[11px] font-bold tracking-tight text-zinc-200" aria-hidden>
          A
        </span>
      </Link>
      <ForgeQuickNavMenu currentId={"matrixtrade" satisfies ForgeSystemId} theme="dark" />
    </>
  );
}

/** Argus chrome: inbox + Forge Home + ··· quick-nav (no flat app icons). */
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
      <Link href="/apps" aria-label="ARGUS FORGE Home" title="Forge Home" className={iconBtn}>
        <span className="text-[11px] font-bold tracking-tight text-zinc-200" aria-hidden>
          A
        </span>
      </Link>
      <ForgeQuickNavMenu currentId={"argus" satisfies ForgeSystemId} theme="dark" />
    </>
  );
}
