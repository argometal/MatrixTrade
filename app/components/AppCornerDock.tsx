"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type CornerDockPlacement = "matrix" | "argus" | "floating";

function dockPositionClass(placement: CornerDockPlacement, mobileOffset: boolean): string {
  // Below mobile header + page action row so bell/switch do not cover titles or Connect.
  const mobileLower =
    "max-lg:top-[calc(9.5rem+env(safe-area-inset-top))] max-lg:bottom-auto";
  if (placement === "matrix") {
    return `${mobileLower} lg:top-6`;
  }
  if (placement === "argus") {
    return `${mobileLower} lg:top-[4.5rem]`;
  }
  return mobileOffset
    ? `${mobileLower} lg:top-6`
    : "top-20 sm:top-6";
}

/** Fixed corner cluster: optional inbox bell + cross-app switch icon. */
export function AppCornerDock({
  bellHref,
  bellLabel,
  bellCount = 0,
  placement = "floating",
  mobileOffset = true,
  showBell = true,
  children,
}: {
  bellHref: string;
  bellLabel: string;
  bellCount?: number;
  placement?: CornerDockPlacement;
  mobileOffset?: boolean;
  /** Argus hides this — inbox lives in the top bar */
  showBell?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`fixed right-[max(0.75rem,env(safe-area-inset-right))] z-[45] flex items-center gap-3 sm:right-4 lg:right-6 ${dockPositionClass(placement, mobileOffset)}`}
    >
      {showBell ? (
        <Link
          href={bellHref}
          aria-label={bellLabel}
          title={bellLabel}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/95 text-base text-zinc-300 shadow-lg shadow-black/30 backdrop-blur-sm transition hover:scale-105 hover:border-zinc-600 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          🔔
          {bellCount > 0 ? (
            <span className="absolute right-0 top-0 flex h-4 min-w-4 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-zinc-950">
              {bellCount > 99 ? "99+" : bellCount}
            </span>
          ) : null}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
