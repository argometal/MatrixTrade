"use client";

import Link from "next/link";
import {
  clearIntelligenceFocusHref,
  INTELLIGENCE_FROM_LABELS,
  type IntelligenceFrom,
} from "@/lib/argus/v2/intelligence-nav";

export function V2IntelligenceFocusBanner({
  entityName,
  from,
  pathname,
  searchParams,
  browseAllHref,
  browseAllLabel,
}: {
  entityName: string;
  from: IntelligenceFrom | null;
  pathname: string;
  searchParams: URLSearchParams;
  browseAllHref: string;
  browseAllLabel: string;
}) {
  const sourceLabel = from ? INTELLIGENCE_FROM_LABELS[from] : "Intelligence";
  const clearHref = clearIntelligenceFocusHref(pathname, searchParams);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/25 bg-violet-950/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">{sourceLabel}</p>
        <p className="truncate text-sm font-medium text-zinc-100">{entityName}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={browseAllHref}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        >
          {browseAllLabel}
        </Link>
        <Link
          href={clearHref}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
          title="Keep selection, drop focus filter"
        >
          Exit focus
        </Link>
      </div>
    </div>
  );
}
