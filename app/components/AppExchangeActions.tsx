"use client";

import Link from "next/link";
import { ForgeQuickNavMenu, type ForgeSystemId } from "@/app/apps/components/ForgePortalNav";

const actionClass =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200";

/**
 * Inbox (when relevant) + A mark systems menu.
 * No separate A home link and no ··· — the triangular A opens systems (incl. Forge Home).
 */
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
  const currentId: ForgeSystemId =
    app === "matrix" ? "matrixtrade" : app === "argus" ? "argus" : "argusforge";

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

      <ForgeQuickNavMenu currentId={currentId} theme="dark" />
    </div>
  );
}
