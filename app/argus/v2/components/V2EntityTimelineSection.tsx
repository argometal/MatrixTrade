"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import { V2Card } from "./v2-ui";
import { V2OrgTimeline } from "./V2OrgTimeline";

const TIMELINE_FILTERS = ["All", "Notes", "Email", "Events"] as const;
type TimelineFilter = (typeof TIMELINE_FILTERS)[number];

function filterEntries(entries: V2TimelineEntry[], filter: TimelineFilter): V2TimelineEntry[] {
  if (filter === "All") return entries;
  if (filter === "Notes") return entries.filter((e) => e.kind === "journal");
  if (filter === "Email") return entries.filter((e) => e.kind === "email");
  return entries.filter((e) => e.kind === "event" || e.kind === "meeting");
}

/** Org/project activity — compact chronological view (not full Chronicle). */
export function V2EntityTimelineSection({
  entries,
  subtitle,
  headerExtra,
  compact = false,
}: {
  entries: V2TimelineEntry[];
  subtitle?: string;
  headerExtra?: ReactNode;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<TimelineFilter>("All");
  const filtered = useMemo(() => filterEntries(entries, filter), [entries, filter]);

  return (
    <V2Card className={compact ? "p-4" : "p-5 sm:p-6"}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`font-semibold text-zinc-100 ${compact ? "text-sm" : "text-base"}`}>Timeline</h2>
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerExtra}
          <div className="flex flex-wrap gap-1.5">
            {TIMELINE_FILTERS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setFilter(entry)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  filter === entry
                    ? "bg-violet-500/15 text-violet-300"
                    : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">Nothing on the timeline yet.</p>
      ) : (
        <V2OrgTimeline entries={filtered} limit={compact ? 6 : undefined} />
      )}
    </V2Card>
  );
}
