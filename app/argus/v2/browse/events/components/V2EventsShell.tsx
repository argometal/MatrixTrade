"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
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
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { parseIntelligenceFocus, intelligenceBrowseAllHref } from "@/lib/argus/v2/intelligence-nav";
import { V2IntelligenceFocusBanner } from "@/app/argus/v2/components/V2IntelligenceFocusBanner";
import { resolveV2SelectedId, v2ActiveListItemClass } from "@/lib/argus/v2/selection";
import { useScrollToSelected } from "@/lib/argus/v2/use-scroll-to-selected";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
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
  neighborhood,
  allRunbooks = [],
  allProgress = [],
  privateConfigured = false,
  privateUnlocked = false,
  deleteUnlocked = false,
  deleteAuthUnlocked = false,
  deleteCodeConfigured = false,
  totpConfigured = false,
  deleteAuthConfigured = false,
  deleteError = false,
  deleteAuthError = false,
  totpRequired = false,
}: {
  rows: V2EventRow[];
  details: V2EventDetail[];
  inboxOptionsByEvent: Record<string, V2EventInboxOption[]>;
  initialSelectedId?: string;
  initialTab?: string;
  neighborhood?: V2EntityNeighborhoodGraph | null;
  allRunbooks?: Runbook[];
  allProgress?: RunbookProgress[];
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
} & Omit<V2DeleteGateProps, "requiresAuthenticator">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2EventTab(searchParams.get("tab") ?? initialTab);
  const entityScope = searchParams.get("entity")?.trim() || undefined;
  const urlSelected = searchParams.get("selected");
  const mobileDetailOpen = Boolean(urlSelected);
  const selectedId = resolveV2SelectedId(urlSelected, initialSelectedId);
  const counts = useMemo(
    () => buildV2EventTabCounts(filterV2EventRows(rows, "all", entityScope)),
    [rows, entityScope]
  );
  const filtered = useMemo(() => filterV2EventRows(rows, tab, entityScope), [rows, tab, entityScope]);
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
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToList() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.replace(`/argus/v2/browse/events?${params.toString()}`);
  }

  useEffect(() => {
    if (!urlSelected) return;
    if (filtered.length === 0) {
      backToList();
      return;
    }
    if (!filtered.some((row) => row.id === urlSelected)) {
      backToList();
    }
  }, [filtered, urlSelected]);

  const returnTo = `/argus/v2/browse/events?${searchParams.toString()}`;
  const { focus, from } = parseIntelligenceFocus(searchParams);

  if (focus && selected) {
    return (
      <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden">
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950/50">
          <div className="border-b border-zinc-800/80 px-4 py-3 lg:px-5">
            <V2IntelligenceFocusBanner
              entityName={selected.name}
              from={from}
              pathname="/argus/v2/browse/events"
              searchParams={new URLSearchParams(searchParams.toString())}
              browseAllHref={intelligenceBrowseAllHref("events")}
              browseAllLabel="Browse all events"
            />
          </div>
          <V2EventDetailPanel
            selected={selected}
            inboxOptions={inboxOptionsByEvent[selected.id] ?? []}
            returnTo={returnTo}
            neighborhood={neighborhood}
            privateConfigured={privateConfigured}
            privateUnlocked={privateUnlocked}
            allRunbooks={allRunbooks}
            allProgress={allProgress}
            requiresAuthenticator={selected.deleteRequiresAuthenticator}
            deleteUnlocked={deleteUnlocked}
            deleteAuthUnlocked={deleteAuthUnlocked}
            deleteCodeConfigured={deleteCodeConfigured}
            totpConfigured={totpConfigured}
            deleteAuthConfigured={deleteAuthConfigured}
            deleteError={deleteError}
            deleteAuthError={deleteAuthError}
            totpRequired={totpRequired}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      <section
        className={`flex min-h-0 w-full flex-col border-b border-zinc-800/80 lg:w-[min(480px,44%)] lg:flex-none lg:border-b-0 lg:border-r ${
          mobileDetailOpen ? "hidden lg:flex" : "flex"
        }`}
      >
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

      <section
        className={`min-h-0 min-w-0 flex-1 bg-zinc-950/50 ${
          mobileDetailOpen
            ? "fixed inset-x-0 bottom-0 top-14 z-40 flex min-h-0 flex-col overflow-hidden lg:static lg:z-auto"
            : "hidden min-h-0 flex-col overflow-hidden lg:flex"
        }`}
      >
        {selected ? (
          <V2EventDetailPanel
            selected={selected}
            inboxOptions={inboxOptionsByEvent[selected.id] ?? []}
            returnTo={returnTo}
            neighborhood={neighborhood}
            onBack={mobileDetailOpen ? backToList : undefined}
            privateConfigured={privateConfigured}
            privateUnlocked={privateUnlocked}
            allRunbooks={allRunbooks}
            allProgress={allProgress}
            requiresAuthenticator={selected.deleteRequiresAuthenticator}
            deleteUnlocked={deleteUnlocked}
            deleteAuthUnlocked={deleteAuthUnlocked}
            deleteCodeConfigured={deleteCodeConfigured}
            totpConfigured={totpConfigured}
            deleteAuthConfigured={deleteAuthConfigured}
            deleteError={deleteError}
            deleteAuthError={deleteAuthError}
            totpRequired={totpRequired}
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
