"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function V2ProjectScopeToggle({
  projectId,
  respectDates,
}: {
  projectId: string;
  respectDates: boolean;
}) {
  const searchParams = useSearchParams();
  const base = `/argus/v2/projects/${projectId}`;

  function hrefForScope(allDates: boolean): string {
    const params = new URLSearchParams(searchParams.toString());
    if (allDates) params.set("scope", "all");
    else params.delete("scope");
    // Scope toggle lives on Timeline — keep that tab selected.
    params.set("tab", "Timeline");
    params.delete("runbook");
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  return (
    <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs">
      <Link
        href={hrefForScope(false)}
        className={`rounded-md px-3 py-1.5 font-medium transition ${
          respectDates ? "bg-violet-600/25 text-violet-200" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        In project dates
      </Link>
      <Link
        href={hrefForScope(true)}
        className={`rounded-md px-3 py-1.5 font-medium transition ${
          !respectDates ? "bg-violet-600/25 text-violet-200" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        All dates
      </Link>
    </div>
  );
}
