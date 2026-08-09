"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2IntelHelpLink } from "@/app/argus/v2/components/V2IntelHelpLink";
import {
  V2_EVENT_PAGE_SIZE,
  buildV2EventTriageCounts,
  buildV2EventWhenCounts,
  filterV2EventRows,
  groupV2EventRows,
  resolveV2EventBrowseParams,
  type V2EventDetail,
  type V2EventInboxOption,
  type V2EventRow,
  type V2EventTriageTab,
  type V2EventWhenTab,
} from "@/lib/argus/v2/event-browse-utils";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { parseIntelligenceFocus, intelligenceBrowseAllHref } from "@/lib/argus/v2/intelligence-nav";
import { V2IntelligenceFocusBanner } from "@/app/argus/v2/components/V2IntelligenceFocusBanner";
import { resolveV2SelectedId, v2ActiveListItemClass } from "@/lib/argus/v2/selection";
import { useScrollToSelected } from "@/lib/argus/v2/use-scroll-to-selected";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import { V2EventDetailPanel } from "./V2EventDetailPanel";

const TRIAGE_TABS: { id: V2EventTriageTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "orphans", label: "Orphans" },
  { id: "linked", label: "Linked" },
  { id: "archived", label: "Archived" },
];

const WHEN_TABS: { id: V2EventWhenTab; label: string }[] = [
  { id: "all", label: "Any time" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

export function V2EventsShell({
  rows,
  details,
  inboxOptionsByEvent,
  initialSelectedId,
  neighborhood,
  allRunbooks = [],
  allProgress = [],
  signalTags = [],
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
  /** @deprecated URL `tab` / `when` drive triage — kept for older pages. */
  initialTab?: string;
  neighborhood?: V2EntityNeighborhoodGraph | null;
  allRunbooks?: Runbook[];
  allProgress?: RunbookProgress[];
  signalTags?: string[];
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
} & Omit<V2DeleteGateProps, "requiresAuthenticator">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { triage, when } = resolveV2EventBrowseParams(
    searchParams.get("tab") ?? undefined,
    searchParams.get("when") ?? undefined
  );
  const entityScope = searchParams.get("entity")?.trim() || undefined;
  const urlSelected = searchParams.get("selected");
  const mobileDetailOpen = Boolean(urlSelected);
  const selectedId = resolveV2SelectedId(urlSelected, initialSelectedId);
  const [visibleCount, setVisibleCount] = useState(V2_EVENT_PAGE_SIZE);

  const scoped = useMemo(
    () => filterV2EventRows(rows, "all", "all", entityScope),
    [rows, entityScope]
  );
  const triageCounts = useMemo(() => buildV2EventTriageCounts(scoped), [scoped]);
  const filtered = useMemo(
    () => filterV2EventRows(rows, triage, when, entityScope),
    [rows, triage, when, entityScope]
  );
  const whenCounts = useMemo(() => buildV2EventWhenCounts(
    filterV2EventRows(rows, triage, "all", entityScope)
  ), [rows, triage, entityScope]);

  useEffect(() => {
    setVisibleCount(V2_EVENT_PAGE_SIZE);
  }, [triage, when, entityScope]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const groups = useMemo(() => {
    // Upcoming cut keeps calendar groups; otherwise one Latest list.
    if (when === "upcoming" || when === "past") return groupV2EventRows(visible);
    return [{ label: "Latest", rows: visible }];
  }, [visible, when]);
  const selected = selectedId ? details.find((d) => d.id === selectedId) : undefined;

  useScrollToSelected(selectedId);

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.replace(`/argus/v2/browse/events?${params.toString()}`);
  }

  function setTriage(next: V2EventTriageTab) {
    replaceParams((params) => {
      if (next === "all") params.delete("tab");
      else params.set("tab", next);
    });
  }

  function setWhen(next: V2EventWhenTab) {
    replaceParams((params) => {
      if (next === "all") params.delete("when");
      else params.set("when", next);
      // Migrate legacy tab=upcoming|past off triage slot
      const t = params.get("tab");
      if (t === "upcoming" || t === "past") params.delete("tab");
    });
  }

  function selectItem(id: string) {
    replaceParams((params) => {
      params.set("selected", id);
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToList() {
    replaceParams((params) => {
      params.delete("selected");
    });
  }

  useEffect(() => {
    if (!urlSelected) return;
    if (filtered.length === 0 || !filtered.some((row) => row.id === urlSelected)) {
      backToList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- backToList is stable enough via searchParams
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
            signalTags={signalTags}
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
              <p className="mt-0.5 text-xs text-zinc-500">Meetings, calls, milestones — latest first</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <V2IntelHelpLink topic="browse-events" label="Events" />
              <V2CreateEntityButton
                kind="event"
                label="+ Event"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {TRIAGE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTriage(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                  triage === t.id ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t.label} {triageCounts[t.id]}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1 overflow-x-auto">
            {WHEN_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setWhen(t.id)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ${
                  when === t.id
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t.label}
                {t.id !== "all" ? ` ${whenCounts[t.id]}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 lg:px-5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-500">
                {rows.length === 0
                  ? "No events yet."
                  : triage === "orphans"
                    ? "No orphan events."
                    : "No events match these filters."}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {rows.length === 0
                  ? "Capture an event and link it to projects, orgs, people, or topics."
                  : triage === "orphans"
                    ? "Orphans are events with no structural links — link one from the detail panel."
                    : "Try All, Orphans, or a different time cut."}
              </p>
              {rows.length === 0 ? (
                <div className="mt-4">
                  <V2CreateEntityButton
                    kind="event"
                    label="+ Event"
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.label} className="mb-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                    {group.label}
                  </p>
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
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-zinc-100">{row.name}</p>
                              {row.isOrphan ? (
                                <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-medium text-sky-300">
                                  Orphan
                                </span>
                              ) : null}
                              {row.lifecycleStatus === "archived" ? (
                                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
                                  Archived
                                </span>
                              ) : null}
                            </div>
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
              ))}
              {visibleCount < filtered.length ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + V2_EVENT_PAGE_SIZE)}
                  className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                >
                  Show more ({filtered.length - visibleCount} remaining)
                </button>
              ) : null}
            </>
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
            signalTags={signalTags}
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
