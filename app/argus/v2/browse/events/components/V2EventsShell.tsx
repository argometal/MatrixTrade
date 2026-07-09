"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import {
  buildV2EventTabCounts,
  filterV2EventRows,
  groupV2EventRows,
  parseV2EventTab,
  type V2EventDetail,
  type V2EventInboxOption,
  type V2EventRow,
  type V2EventTab,
} from "@/lib/argus/v2/event-browse-utils";
import { resolveV2SelectedId, v2ActiveListItemClass } from "@/lib/argus/v2/selection";
import { useScrollToSelected } from "@/lib/argus/v2/use-scroll-to-selected";
import { V2EventDetailPanel } from "./V2EventDetailPanel";

const TABS: { id: V2EventTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

export function V2EventsShell({
  rows,
  details,
  inboxOptionsByEvent,
  initialSelectedId,
  initialTab,
}: {
  rows: V2EventRow[];
  details: V2EventDetail[];
  inboxOptionsByEvent: Record<string, V2EventInboxOption[]>;
  initialSelectedId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2EventTab(searchParams.get("tab") ?? initialTab);
  const selectedId = resolveV2SelectedId(searchParams.get("selected"), initialSelectedId);
  const counts = useMemo(() => buildV2EventTabCounts(rows), [rows]);
  const filtered = useMemo(() => filterV2EventRows(rows, tab), [rows, tab]);
  const groups = useMemo(() => groupV2EventRows(filtered), [filtered]);
  const selected = selectedId ? details.find((d) => d.id === selectedId) : undefined;

  useScrollToSelected(selectedId);

  function setTab(next: V2EventTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/argus/v2/browse/events?${params.toString()}`);
  }

  function selectItem(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", id);
    router.replace(`/argus/v2/browse/events?${params.toString()}`);
  }

  return (
    <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      <section className="flex min-h-0 w-full flex-col border-b border-zinc-800/80 lg:w-[min(480px,44%)] lg:flex-none lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Events</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Meetings, calls, milestones and occurrences</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <V2CreateEntityButton
                kind="event"
                label="+ Event"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
              <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400">
                Filters
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                  tab === t.id ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t.label} {counts[t.id]}
              </button>
            ))}
          </div>
        </div>

        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 lg:px-5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-500">No events yet.</p>
              <p className="mt-1 text-xs text-zinc-600">Capture an event and link it to projects, orgs, people, or topics.</p>
              <div className="mt-4">
                <V2CreateEntityButton
                  kind="event"
                  label="+ Event"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                />
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{group.label}</p>
                <ul className="space-y-2">
                  {group.rows.map((row) => (
                    <li key={row.id} data-v2-selected-id={row.id}>
                      <button
                        type="button"
                        onClick={() => selectItem(row.id)}
                        className={`flex w-full gap-3 rounded-xl border px-3 py-3 text-left transition hover:border-zinc-700 ${v2ActiveListItemClass(
                          selectedId === row.id
                        )}`}
                      >
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-[10px] font-bold tracking-wide text-violet-400">{row.dateLabel}</p>
                          <p className="text-[10px] text-zinc-600">{row.timeLabel}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-100">{row.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                            {row.meetingUrl ? <span>Webex</span> : null}
                            {row.projectName ? <span>{row.projectName}</span> : null}
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                              {row.typeLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 -space-x-1">
                          {row.attendeeInitials.slice(0, 3).map((initials, i) => (
                            <span
                              key={`${row.id}-${initials}-${i}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-700 text-[9px] font-bold text-zinc-200"
                            >
                              {initials}
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950/50">
        {selected ? (
          <V2EventDetailPanel
            selected={selected}
            inboxOptions={inboxOptionsByEvent[selected.id] ?? []}
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-sm text-zinc-500">
            Select an event to document and review evidence.
          </div>
        )}
      </section>
    </div>
  );
}
