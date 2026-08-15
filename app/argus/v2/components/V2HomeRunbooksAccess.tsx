"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { V2HomeRunbookLink } from "@/lib/argus/v2/home-runbook-access";
import {
  readRecentEntities,
  V2_RECENT_ENTITIES_EVENT,
} from "@/lib/argus/v2/recent-entities";

type Mode = "recent" | "frequent";

/**
 * Home Intelligence — easy access to recent / most-used runbooks.
 * Merges server ranking with local visit history (sidebar Recent).
 */
export function V2HomeRunbooksAccess({
  recent,
  frequent,
}: {
  recent: V2HomeRunbookLink[];
  frequent: V2HomeRunbookLink[];
}) {
  const [mode, setMode] = useState<Mode>("recent");
  const [visitedIds, setVisitedIds] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => {
      setVisitedIds(
        readRecentEntities()
          .filter((item) => item.kind === "runbook")
          .map((item) => item.id)
      );
    };
    refresh();
    window.addEventListener(V2_RECENT_ENTITIES_EVENT, refresh);
    return () => window.removeEventListener(V2_RECENT_ENTITIES_EVENT, refresh);
  }, []);

  const rows = useMemo(() => {
    const base = mode === "recent" ? recent : frequent;
    if (mode !== "recent" || visitedIds.length === 0) return base;
    // Promote locally visited runbooks to the front while keeping server meta when available.
    const byId = new Map(base.map((row) => [row.id, row]));
    const promoted: V2HomeRunbookLink[] = [];
    for (const id of visitedIds) {
      const hit = byId.get(id);
      if (hit) {
        promoted.push(hit);
        byId.delete(id);
      }
    }
    return [...promoted, ...byId.values()].slice(0, 5);
  }, [mode, recent, frequent, visitedIds]);

  if (recent.length === 0 && frequent.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Runbooks</p>
          <Link href="/argus/v2/runbooks" className="text-[11px] text-violet-400 hover:text-violet-300">
            Browse →
          </Link>
        </div>
        <p className="mt-1.5 text-xs text-zinc-600">No runbooks yet — create one from a Project or Topic.</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-3" aria-label="Runbooks quick access">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Runbooks</p>
          <div className="flex rounded-lg border border-zinc-800 p-0.5" role="tablist" aria-label="Runbook ranking">
            {(
              [
                { id: "recent" as const, label: "Recent" },
                { id: "frequent" as const, label: "Most used" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => setMode(tab.id)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                  mode === tab.id
                    ? "bg-violet-600/25 text-violet-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <Link href="/argus/v2/runbooks" className="text-[11px] text-violet-400 hover:text-violet-300">
          All runbooks →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-600">
          {mode === "frequent" ? "No scoped runbook progress yet — try Recent." : "No recent runbooks."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-800/70">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className="flex items-center gap-2.5 py-2 transition hover:bg-zinc-900/60"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-500/15 text-sm text-lime-300"
                  aria-hidden
                >
                  📋
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-200">{row.title}</span>
                  <span className="block truncate text-[11px] text-zinc-500">{row.meta}</span>
                </span>
                <span className="shrink-0 text-[11px] text-zinc-600" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
