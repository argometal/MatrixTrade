"use client";

import { usePathname } from "next/navigation";
import { resolveUiWindowId } from "@/lib/ui-window-ids";

/**
 * Persistent screen id for human debugging — every MTA trading window.
 * Sits above the mobile tab bar; desktop bottom-left.
 */
export function UiWindowIdBadge() {
  const pathname = usePathname();
  const id = resolveUiWindowId(pathname);
  if (!id) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-2 z-[70] lg:bottom-3 lg:left-3"
      data-ui-window-id={id}
      aria-hidden="true"
    >
      <span className="rounded border border-zinc-700/70 bg-zinc-950/90 px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-wide text-zinc-500 shadow-sm">
        {id}
      </span>
    </div>
  );
}
