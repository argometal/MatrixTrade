"use client";

import Link from "next/link";
import { ArgusMark } from "@/app/components/ArgusMark";
import { TradingMark } from "@/app/components/TradingMark";

const actionClass =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200";

function AfMark({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[10px] font-bold tracking-wide text-zinc-300 ${className}`} aria-hidden>
      AF
    </span>
  );
}

/** Inbox (when relevant) + switches to the other product apps. */
export function AppExchangeActions({
  app,
  inboxCount = 0,
  className = "",
}: {
  app: "matrix" | "argus" | "forge";
  inboxCount?: number;
  className?: string;
}) {
  const showInbox = app === "matrix" || app === "argus";
  const inboxHref = app === "matrix" ? "/inbox" : "/argus/v2/inbox";
  const inboxLabel = app === "matrix" ? "History" : "Inbox";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showInbox ? (
        <Link href={inboxHref} aria-label={inboxLabel} title={inboxLabel} className={actionClass}>
          <span className="text-base leading-none" aria-hidden>
            🔔
          </span>
          {inboxCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {inboxCount > 99 ? "99+" : inboxCount}
            </span>
          ) : null}
        </Link>
      ) : null}

      {app !== "matrix" ? (
        <Link href="/home-preview" aria-label="Open MTA" title="MTA" className={actionClass}>
          <TradingMark size={28} />
        </Link>
      ) : null}

      {app !== "argus" ? (
        <Link href="/argus/v2" aria-label="Open ARGUS" title="ARGUS" className={`${actionClass} p-0.5`}>
          <ArgusMark size={32} className="block h-full w-full" />
        </Link>
      ) : null}

      {app !== "forge" ? (
        <Link href="/forge" aria-label="Open ArgusForge" title="ArgusForge" className={actionClass}>
          <AfMark />
        </Link>
      ) : null}

      <Link
        href="/apps"
        aria-label="All apps"
        title="All apps"
        className={`${actionClass} text-[10px] font-semibold tracking-wide`}
      >
        ···
      </Link>
    </div>
  );
}
