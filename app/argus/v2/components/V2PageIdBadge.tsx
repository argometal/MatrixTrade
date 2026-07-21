"use client";

import { usePathname } from "next/navigation";
import { formatV2PageId, resolveV2PageId } from "@/lib/argus/v2/page-ids";

/** Always-visible page identity chip for bug reports (phone + desktop). */
export function V2PageIdBadge({ className = "" }: { className?: string }) {
  const pathname = usePathname() || "/argus/v2";
  const id = resolveV2PageId(pathname);
  const text = formatV2PageId(id);

  return (
    <span
      title={`Page ID: ${text} — cite this when reporting UI issues`}
      className={`inline-flex shrink-0 items-center rounded-md border border-zinc-700/70 bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-zinc-500 ${className}`}
    >
      {text}
    </span>
  );
}
