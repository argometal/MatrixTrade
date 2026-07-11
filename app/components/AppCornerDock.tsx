"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type CornerDockPlacement = "matrix" | "argus" | "floating";

function dockPositionClass(placement: CornerDockPlacement, mobileOffset: boolean): string {
  if (placement === "matrix") {
    return "max-lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-lg:top-auto lg:top-6";
  }
  if (placement === "argus") {
    // Below Argus v2 top bar on desktop — avoids overlapping + / bell / Matrix icons.
    return "max-lg:bottom-[calc(1rem+env(safe-area-inset-bottom))] max-lg:top-auto lg:top-[4.5rem]";
  }
  return mobileOffset
    ? "top-[calc(7rem+env(safe-area-inset-top))] sm:top-28 lg:top-6"
    : "top-20 sm:top-6";
}

/** Fixed corner cluster: inbox bell + cross-app switch icon. */
export function AppCornerDock({
  bellHref,
  bellLabel,
  bellCount = 0,
  placement = "floating",
  mobileOffset = true,
  children,
}: {
  bellHref: string;
  bellLabel: string;
  bellCount?: number;
  /** matrix = above MT bottom tabs; argus = bottom-right on phone; floating = legacy top offset */
  placement?: CornerDockPlacement;
  /** Used only when placement is floating */
  mobileOffset?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`fixed right-[max(0.75rem,env(safe-area-inset-right))] z-[45] flex items-center gap-2 sm:right-4 lg:right-6 ${dockPositionClass(placement, mobileOffset)}`}
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
