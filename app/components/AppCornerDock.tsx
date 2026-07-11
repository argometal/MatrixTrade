"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Fixed top-right cluster: inbox bell + cross-app switch icon. */
export function AppCornerDock({
  bellHref,
  bellLabel,
  bellCount = 0,
  mobileOffset = true,
  children,
}: {
  bellHref: string;
  bellLabel: string;
  bellCount?: number;
  /** Drop below fixed mobile headers and first action rows. */
  mobileOffset?: boolean;
  children: ReactNode;
}) {
  const topClass = mobileOffset
    ? "top-[calc(7rem+env(safe-area-inset-top))] sm:top-28 lg:top-6"
    : "top-20 sm:top-6";

  return (
    <div
      className={`fixed right-3 z-[60] flex items-center gap-2 sm:right-4 lg:right-6 ${topClass}`}
    >
      <Link
        href={bellHref}
        aria-label={bellLabel}
        title={bellLabel}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/95 text-base text-zinc-300 shadow-lg shadow-black/30 backdrop-blur-sm transition hover:scale-105 hover:border-zinc-600 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        🔔
        {bellCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {bellCount > 99 ? "99+" : bellCount}
          </span>
        ) : null}
      </Link>
      {children}
    </div>
  );
}
