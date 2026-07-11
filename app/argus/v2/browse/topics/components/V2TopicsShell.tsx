"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import {
  buildV2TopicFilterOptions,
  buildV2TopicTabCounts,
  filterV2TopicRows,
  hasActiveV2TopicFilters,
  paginateV2TopicRows,
  parseV2TopicFilters,
  parseV2TopicTab,
  v2TopicPageCount,
  V2_TOPIC_PAGE_SIZE,
  type V2TopicDetail,
  type V2TopicEvidenceKind,
  type V2TopicFilters,
  type V2TopicRow,
  type V2TopicTab,
  type V2TopicTagChip,
} from "@/lib/argus/v2/topic-browse-utils";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { resolveV2SelectedId, v2ActiveTableRowClass } from "@/lib/argus/v2/selection";
import { useScrollToSelected } from "@/lib/argus/v2/use-scroll-to-selected";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { parseIntelligenceFocus, intelligenceBrowseAllHref } from "@/lib/argus/v2/intelligence-nav";
import { V2IntelligenceFocusBanner } from "@/app/argus/v2/components/V2IntelligenceFocusBanner";
import { V2TopicDetailPanel } from "./V2TopicDetailPanel";

const TABS: { id: V2TopicTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "empty", label: "Empty" },
  { id: "patterns", label: "Patterns" },
];

const KIND_OPTIONS: { id: V2TopicEvidenceKind; label: string }[] = [
  { id: "email", label: "Has email" },
  { id: "journal", label: "Has journal" },
  { id: "file", label: "Has files" },
];

type FilterMenu = "org" | "project" | "kind" | null;

function FilterMenuPanel({
  open,
  children,
  onClose,
}: {
  open: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full z-30 mt-1 max-h-56 min-w-[180px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
    >
      {children}
    </div>
  );
}

function FilterOption({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-[11px] ${
        active ? "bg-violet-500/15 text-violet-200" : "text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

export function V2TopicsShell({
  rows,
  details,
  tagChips,
  initialSelectedId,
  initialTab,
  neighborhood,
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
  rows: V2TopicRow[];
  details: V2TopicDetail[];
  tagChips: V2TopicTagChip[];
  initialSelectedId?: string;
  initialTab?: string;
  neighborhood?: V2EntityNeighborhoodGraph | null;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
} & Omit<V2DeleteGateProps, "requiresAuthenticator">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2TopicTab(searchParams.get("tab") ?? initialTab);
  const filters = useMemo(
    () =>
      parseV2TopicFilters({
        q: searchParams.get("q"),
        tag: searchParams.get("tag"),
        org: searchParams.get("org"),
        project: searchParams.get("project"),
        entity: searchParams.get("entity"),
        kind: searchParams.get("kind"),
      }),
    [searchParams]
  );
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const selectedId = resolveV2SelectedId(searchParams.get("selected"), initialSelectedId);
  const counts = useMemo(() => buildV2TopicTabCounts(rows), [rows]);
  const filterOptions = useMemo(() => buildV2TopicFilterOptions(details), [details]);
  const filtered = useMemo(() => filterV2TopicRows(rows, tab, filters), [rows, tab, filters]);
  const pageCount = useMemo(() => v2TopicPageCount(filtered.length), [filtered.length]);
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => paginateV2TopicRows(filtered, safePage),
    [filtered, safePage]
  );
  const selected = selectedId ? details.find((d) => d.id === selectedId) : undefined;
  const filtersActive = hasActiveV2TopicFilters(filters);
  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);
  const [searchDraft, setSearchDraft] = useState(filters.q ?? "");

  useScrollToSelected(selectedId);

  useEffect(() => {
    setSearchDraft(filters.q ?? "");
  }, [filters.q]);

  const replaceTopicParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `/argus/v2/browse/topics?${query}` : "/argus/v2/browse/topics");
    },
    [router, searchParams]
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchDraft.trim();
      const current = filters.q?.trim() ?? "";
      if (next === current) return;
      replaceTopicParams((params) => {
        if (next) params.set("q", next);
        else params.delete("q");
        params.delete("page");
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchDraft, filters.q, replaceTopicParams]);

  function setTab(next: V2TopicTab) {
    replaceTopicParams((params) => {
      if (next === "all") params.delete("tab");
      else params.set("tab", next);
      params.delete("page");
    });
  }

  function setFilter(key: keyof V2TopicFilters, value?: string) {
    replaceTopicParams((params) => {
      const paramKey =
        key === "entity" ? "entity" : key === "org" ? "org" : key === "project" ? "project" : key;
      if (!value) params.delete(paramKey);
      else params.set(paramKey, value);
      params.delete("page");
    });
    setOpenFilter(null);
  }

  function setTagFilter(tag?: string) {
    replaceTopicParams((params) => {
      if (!tag) params.delete("tag");
      else params.set("tag", tag);
      params.delete("page");
    });
  }

  function clearFilters() {
    replaceTopicParams((params) => {
      params.delete("q");
      params.delete("tag");
      params.delete("org");
      params.delete("project");
      params.delete("entity");
      params.delete("kind");
      params.delete("page");
    });
    setSearchDraft("");
    setOpenFilter(null);
  }

  function selectItem(id: string) {
    replaceTopicParams((params) => {
      params.set("selected", id);
    });
  }

  function setPage(next: number) {
    replaceTopicParams((params) => {
      if (next <= 1) params.delete("page");
      else params.set("page", String(next));
    });
  }

  const returnTo = selected
    ? `/argus/v2/browse/topics?${searchParams.toString()}`
    : `/argus/v2/browse/topics`;

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * V2_TOPIC_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * V2_TOPIC_PAGE_SIZE, filtered.length);
  const { focus, from } = parseIntelligenceFocus(searchParams);

  if (focus && selected) {
    return (
      <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden">
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950/50">
          <div className="border-b border-zinc-800/80 px-4 py-3 lg:px-5">
            <V2IntelligenceFocusBanner
              entityName={selected.name}
              from={from}
              pathname="/argus/v2/browse/topics"
              searchParams={new URLSearchParams(searchParams.toString())}
              browseAllHref={intelligenceBrowseAllHref("topics")}
              browseAllLabel="Browse all topics"
            />
          </div>
          <V2TopicDetailPanel
            selected={selected}
            neighborhood={neighborhood}
            returnTo={returnTo}
            privateConfigured={privateConfigured}
            privateUnlocked={privateUnlocked}
            requiresAuthenticator
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
      <section className="flex min-h-0 w-full flex-col border-b border-zinc-800/80 lg:w-[min(420px,42%)] lg:flex-none lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Topics</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Knowledge binders — pick one to review evidence</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <V2CreateEntityButton
                kind="topic"
                label="+ Topic"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
            </div>
          </div>

          <div className="mb-3">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search topics, aliases, notes…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="mb-3 flex gap-1 overflow-x-auto">
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

          {tagChips.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tagChips.map((chip) => {
                const active = filters.tag?.toLowerCase() === chip.name.toLowerCase();
                return (
                  <button
                    key={chip.name}
                    type="button"
                    onClick={() => setTagFilter(active ? undefined : chip.name)}
                    className={`rounded-full px-2 py-0.5 text-[10px] transition ${
                      active
                        ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
                        : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    {chip.name} {chip.count}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === "org" ? null : "org")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${
                  filters.org ? "bg-violet-500/15 text-violet-300" : "bg-zinc-800/80 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Org{filters.org ? " ✓" : ""}
              </button>
              <FilterMenuPanel open={openFilter === "org"} onClose={() => setOpenFilter(null)}>
                {filterOptions.organizations.length === 0 ? (
                  <p className="px-3 py-2 text-[10px] text-zinc-600">No linked organizations</p>
                ) : (
                  filterOptions.organizations.map((org) => (
                    <FilterOption
                      key={org.id}
                      active={filters.org === org.id}
                      onClick={() => setFilter("org", filters.org === org.id ? undefined : org.id)}
                    >
                      {org.name}
                    </FilterOption>
                  ))
                )}
              </FilterMenuPanel>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === "project" ? null : "project")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${
                  filters.project
                    ? "bg-violet-500/15 text-violet-300"
                    : "bg-zinc-800/80 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Project{filters.project ? " ✓" : ""}
              </button>
              <FilterMenuPanel open={openFilter === "project"} onClose={() => setOpenFilter(null)}>
                {filterOptions.projects.length === 0 ? (
                  <p className="px-3 py-2 text-[10px] text-zinc-600">No linked projects</p>
                ) : (
                  filterOptions.projects.map((project) => (
                    <FilterOption
                      key={project.id}
                      active={filters.project === project.id}
                      onClick={() =>
                        setFilter("project", filters.project === project.id ? undefined : project.id)
                      }
                    >
                      {project.name}
                    </FilterOption>
                  ))
                )}
              </FilterMenuPanel>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === "kind" ? null : "kind")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${
                  filters.kind ? "bg-violet-500/15 text-violet-300" : "bg-zinc-800/80 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Evidence{filters.kind ? " ✓" : ""}
              </button>
              <FilterMenuPanel open={openFilter === "kind"} onClose={() => setOpenFilter(null)}>
                {KIND_OPTIONS.map((option) => (
                  <FilterOption
                    key={option.id}
                    active={filters.kind === option.id}
                    onClick={() => setFilter("kind", filters.kind === option.id ? undefined : option.id)}
                  >
                    {option.label}
                  </FilterOption>
                ))}
              </FilterMenuPanel>
            </div>

            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-amber-300/90 hover:text-amber-200"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-zinc-500">
                {rows.length === 0 ? "No topics yet." : "No topics match these filters."}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {rows.length === 0
                  ? "Capture a topic and link emails or journal entries to it."
                  : "Try a different view, tag, or clear filters."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950/95 text-[10px] uppercase tracking-wide text-zinc-600">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 font-medium lg:px-5">Topic</th>
                  <th className="px-2 py-2 font-medium">Last</th>
                  <th className="px-4 py-2 font-medium lg:px-5">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    data-v2-selected-id={row.id}
                    onClick={() => selectItem(row.id)}
                    className={`cursor-pointer border-b border-zinc-800/60 transition hover:bg-zinc-900/40 ${v2ActiveTableRowClass(
                      selectedId === row.id
                    )}`}
                  >
                    <td className="px-4 py-3 lg:px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100">{row.name}</span>
                        {row.patternCount > 0 ? (
                          <span
                            className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-300"
                            title={`${row.patternCount} recurring tag pattern(s)`}
                          >
                            🔁 {row.patternCount}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-zinc-500">{row.lastActivity}</td>
                    <td className="px-4 py-3 lg:px-5">
                      <EvidenceCountCell row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > V2_TOPIC_PAGE_SIZE ? (
          <div className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-2.5 text-[11px] text-zinc-500 lg:px-5">
            <span>
              {rangeStart}–{rangeEnd} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="tabular-nums text-zinc-600">
                {safePage}/{pageCount}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
                className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950/50">
        {selected ? (
          <V2TopicDetailPanel
            selected={selected}
            neighborhood={neighborhood}
            returnTo={returnTo}
            privateConfigured={privateConfigured}
            privateUnlocked={privateUnlocked}
            requiresAuthenticator
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
            Select a topic to review linked evidence.
          </div>
        )}
      </section>
    </div>
  );
}

function EvidenceCountCell({ row }: { row: V2TopicRow }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold tabular-nums text-violet-300">{row.evidenceCount}</span>
      <span className="text-[10px] text-zinc-600">
        {row.journalCount > 0 ? `📓${row.journalCount}` : null}
        {row.emailCount > 0 ? ` ✉${row.emailCount}` : null}
        {row.fileCount > 0 ? ` 📎${row.fileCount}` : null}
      </span>
    </div>
  );
}
