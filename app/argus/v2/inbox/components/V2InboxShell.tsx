"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import type { ArgusLinkResult } from "@/app/argus/components/ArgusLinkModal";
import {
  saveInboxLinksAction,
  updateInboxTriageAction,
  type CreatedEntityResult,
} from "@/app/argus/actions";
import { filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { resolveV2SelectedId, v2ActiveListItemClass } from "@/lib/argus/v2/selection";
import { useScrollToSelected } from "@/lib/argus/v2/use-scroll-to-selected";
import {
  buildV2InboxFilterOptions,
  buildV2InboxTabCounts,
  filterV2InboxRows,
  hasActiveV2InboxFilters,
  inboxEntityKindLabel,
  inboxSourceLabel,
  parseV2InboxFilters,
  parseV2InboxTab,
  type V2InboxDetailEntity,
  type V2InboxFilters,
  type V2InboxRow,
  type V2InboxTab,
  type InboxTopicContext,
} from "@/lib/argus/v2/inbox-loaders";
import { V2InboxBulkBar } from "./V2InboxBulkBar";
import { V2InboxDetailPanel } from "./V2InboxDetailPanel";
import { V2InboxEntityLinkModal } from "./V2InboxEntityLinkModal";
import { V2InboxSwipeRow } from "./V2InboxSwipeRow";

const TABS: { id: V2InboxTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "New" },
  { id: "in_progress", label: "Linked" },
  { id: "processed", label: "Done" },
  { id: "archived", label: "Archived" },
];

type FilterMenu = "source" | "sender" | "type" | "entity" | "tag" | null;

type DetailBundle = {
  item: InboxItem;
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
  linkedEntities: V2InboxDetailEntity[];
  convertedLog?: Log;
  defaultTitle: string;
  defaultBody: string;
};

function statusClass(tone: V2InboxRow["statusTone"]): string {
  if (tone === "violet") return "bg-violet-500/15 text-violet-300";
  if (tone === "amber") return "bg-amber-500/15 text-amber-300";
  if (tone === "emerald") return "bg-emerald-500/15 text-emerald-300";
  return "bg-zinc-800 text-zinc-500";
}

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

export function V2InboxShell({
  rows,
  details,
  buckets,
  tagBuckets,
  linkedEntityRecords,
  topicContext,
  initialSelectedId,
  initialTab,
  deleteUnlocked,
  privateConfigured,
  deleteError,
}: {
  rows: V2InboxRow[];
  details: DetailBundle[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  linkedEntityRecords: Entity[];
  topicContext: InboxTopicContext;
  initialSelectedId?: string;
  initialTab?: string;
  deleteUnlocked: boolean;
  privateConfigured: boolean;
  deleteError?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2InboxTab(searchParams.get("tab") ?? initialTab);
  const urlSelected = searchParams.get("selected");
  const mobileDetailOpen = Boolean(urlSelected);
  const filters = useMemo(
    () =>
      parseV2InboxFilters({
        source: searchParams.get("source"),
        sender: searchParams.get("sender"),
        type: searchParams.get("type"),
        entity: searchParams.get("entity"),
        tag: searchParams.get("tag"),
      }),
    [searchParams]
  );
  const selectedId = resolveV2SelectedId(urlSelected, initialSelectedId);
  const counts = useMemo(() => buildV2InboxTabCounts(rows), [rows]);
  const tabRows = useMemo(() => filterV2InboxRows(rows, tab), [rows, tab]);
  const filterOptions = useMemo(
    () => buildV2InboxFilterOptions(tabRows, topicContext),
    [tabRows, topicContext]
  );
  const filtered = useMemo(() => filterV2InboxRows(rows, tab, filters), [rows, tab, filters]);
  const selectedDetail = selectedId ? details.find((d) => d.item.id === selectedId) : undefined;
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);
  const [swipeLinkId, setSwipeLinkId] = useState<string | null>(null);
  const filtersActive = hasActiveV2InboxFilters(filters);
  const bulkReturnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    return query ? `/argus/v2/inbox?${query}` : "/argus/v2/inbox";
  }, [searchParams]);
  const checkedIds = useMemo(() => [...checked], [checked]);
  const inboxBuckets = useMemo(() => filterEntityPickerBuckets(buckets, "inbox"), [buckets]);

  const swipeLinkDetail = useMemo(
    () => (swipeLinkId ? details.find((d) => d.item.id === swipeLinkId) : undefined),
    [details, swipeLinkId]
  );

  const openSwipeLink = useCallback((id: string) => {
    setSwipeLinkId(id);
  }, []);

  async function confirmSwipeLinks(result: ArgusLinkResult) {
    if (!swipeLinkDetail) return;
    await saveInboxLinksAction(swipeLinkDetail.item.id, result.entityIds);
    await updateInboxTriageAction(swipeLinkDetail.item.id, { topics: result.tags });
    router.refresh();
    setSwipeLinkId(null);
  }

  async function swipeLinkCreatedEntity(entity: CreatedEntityResult): Promise<false> {
    if (!swipeLinkDetail) return false;
    const next = [...new Set([...(swipeLinkDetail.item.linkedEntityIds ?? []), entity.id])];
    await saveInboxLinksAction(swipeLinkDetail.item.id, next);
    router.refresh();
    return false;
  }

  function replaceInboxParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `/argus/v2/inbox?${query}` : "/argus/v2/inbox");
  }

  function setFilter(key: keyof V2InboxFilters, value?: string) {
    replaceInboxParams((params) => {
      const paramKey =
        key === "entityId" ? "entity" : key === "sender" ? "sender" : key === "type" ? "type" : key;
      if (!value) params.delete(paramKey);
      else params.set(paramKey, value);
    });
    setOpenFilter(null);
  }

  function clearFilters() {
    replaceInboxParams((params) => {
      params.delete("source");
      params.delete("sender");
      params.delete("type");
      params.delete("entity");
      params.delete("tag");
    });
    setOpenFilter(null);
  }

  function setTab(next: V2InboxTab) {
    setChecked(new Set());
    setSelectMode(false);
    replaceInboxParams((params) => {
      params.set("tab", next);
    });
  }

  function selectItem(id: string) {
    replaceInboxParams((params) => {
      params.set("selected", id);
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToList() {
    replaceInboxParams((params) => {
      params.delete("selected");
    });
  }

  useScrollToSelected(selectedId);

  useEffect(() => {
    if (!urlSelected) return;
    if (filtered.length === 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("selected");
      const query = params.toString();
      router.replace(query ? `/argus/v2/inbox?${query}` : "/argus/v2/inbox");
      return;
    }
    if (!filtered.some((row) => row.id === urlSelected)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("selected");
      const query = params.toString();
      router.replace(query ? `/argus/v2/inbox?${query}` : "/argus/v2/inbox");
    }
  }, [filtered, urlSelected, router, searchParams]);

  function toggleChecked(id: string) {
    setSelectMode(true);
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setChecked(new Set());
    setSelectMode(false);
  }

  function selectAllVisible() {
    setSelectMode(true);
    setChecked(new Set(filtered.map((row) => row.id)));
  }

  function finishBulkAction() {
    clearSelection();
    router.refresh();
  }

  return (
    <div className="v2-inbox-shell flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      <section
        className={`flex min-h-0 w-full flex-1 flex-col border-b border-zinc-800/80 lg:w-[min(440px,40%)] lg:flex-none lg:border-b-0 lg:border-r ${
          mobileDetailOpen ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="shrink-0 border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Inbox</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Evidence — read, link, act</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectMode || checked.size > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-violet-300 hover:text-violet-200"
                  >
                    Done
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Select
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
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

        {checked.size > 0 ? (
          <V2InboxBulkBar
            count={checked.size}
            inboxIds={checkedIds}
            tagBuckets={tagBuckets}
            deleteUnlocked={deleteUnlocked}
            privateConfigured={privateConfigured}
            returnTo={bulkReturnTo}
            onClear={clearSelection}
            onDone={finishBulkAction}
          />
        ) : null}

        <div className="shrink-0 flex flex-wrap gap-2 border-b border-zinc-800/80 px-4 py-2 lg:px-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter((current) => (current === "source" ? null : "source"))}
              className={`rounded-md border px-2 py-1 text-[10px] ${
                filters.source
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {filters.source ? inboxSourceLabel(filters.source) : "Source"} ▾
            </button>
            <FilterMenuPanel open={openFilter === "source"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.source} onClick={() => setFilter("source")}>
                Any source
              </FilterOption>
              {filterOptions.sources.map((source) => (
                <FilterOption
                  key={source}
                  active={filters.source === source}
                  onClick={() => setFilter("source", source)}
                >
                  {inboxSourceLabel(source)}
                </FilterOption>
              ))}
            </FilterMenuPanel>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter((current) => (current === "sender" ? null : "sender"))}
              className={`max-w-[160px] truncate rounded-md border px-2 py-1 text-[10px] ${
                filters.sender
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {filters.sender
                ? filterOptions.senders.find((sender) => sender.key === filters.sender)?.label ?? filters.sender
                : "Sender"}{" "}
              ▾
            </button>
            <FilterMenuPanel open={openFilter === "sender"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.sender} onClick={() => setFilter("sender")}>
                Any sender
              </FilterOption>
              {filterOptions.senders.map((sender) => (
                <FilterOption
                  key={sender.key}
                  active={filters.sender === sender.key}
                  onClick={() => setFilter("sender", sender.key)}
                >
                  {sender.label}
                </FilterOption>
              ))}
            </FilterMenuPanel>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter((current) => (current === "type" ? null : "type"))}
              className={`rounded-md border px-2 py-1 text-[10px] ${
                filters.type
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {filters.type ? inboxEntityKindLabel(filters.type) : "Type"} ▾
            </button>
            <FilterMenuPanel open={openFilter === "type"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.type} onClick={() => setFilter("type")}>
                Any type
              </FilterOption>
              {filterOptions.types.map((type) => (
                <FilterOption key={type} active={filters.type === type} onClick={() => setFilter("type", type)}>
                  {inboxEntityKindLabel(type)}
                </FilterOption>
              ))}
            </FilterMenuPanel>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter((current) => (current === "entity" ? null : "entity"))}
              className={`max-w-[160px] truncate rounded-md border px-2 py-1 text-[10px] ${
                filters.entityId
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {filters.entityId
                ? filterOptions.entities.find((entity) => entity.id === filters.entityId)?.name ?? "Entity"
                : "Entity"}{" "}
              ▾
            </button>
            <FilterMenuPanel open={openFilter === "entity"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.entityId} onClick={() => setFilter("entityId")}>
                Any entity
              </FilterOption>
              {filterOptions.entities.map((entity) => (
                <FilterOption
                  key={entity.id}
                  active={filters.entityId === entity.id}
                  onClick={() => setFilter("entityId", entity.id)}
                >
                  {entity.name}
                </FilterOption>
              ))}
            </FilterMenuPanel>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilter((current) => (current === "tag" ? null : "tag"))}
              className={`max-w-[140px] truncate rounded-md border px-2 py-1 text-[10px] ${
                filters.tag
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              {filters.tag ?? "Tag"} ▾
            </button>
            <FilterMenuPanel open={openFilter === "tag"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.tag} onClick={() => setFilter("tag")}>
                Any tag
              </FilterOption>
              {filterOptions.tags.map((tag) => (
                <FilterOption key={tag} active={filters.tag === tag} onClick={() => setFilter("tag", tag)}>
                  {tag}
                </FilterOption>
              ))}
            </FilterMenuPanel>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!filtersActive}
            className={`rounded-md border px-2 py-1 text-[10px] ${
              filtersActive
                ? "border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-600"
            }`}
          >
            Clear filters
          </button>
        </div>

        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              {filtersActive ? "No items match these filters." : "No items in this tab."}
            </p>
          ) : (
            <ul className="space-y-2 p-2 lg:p-3">
              {filtered.map((row) => (
                <li key={row.id} data-v2-selected-id={row.id} className="flex items-stretch gap-1.5">
                  <V2InboxSwipeRow
                    className="flex-1"
                    onPress={() => selectItem(row.id)}
                  >
                    <div
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${v2ActiveListItemClass(
                        selectedId === row.id
                      )}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center gap-2 pt-0.5">
                          <input
                            type="checkbox"
                            checked={checked.has(row.id)}
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleChecked(row.id);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-violet-500"
                            aria-label={`Select ${row.subject || "email"}`}
                          />
                          <span className="text-sm text-zinc-500" aria-hidden>
                            ✉
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-100">{row.sender}</p>
                            <div className="flex shrink-0 items-center gap-2">
                              {row.attachmentCount > 0 ? (
                                <span className="text-[11px] text-zinc-600" title="Attachments">
                                  📎
                                </span>
                              ) : null}
                              <span className="text-[10px] tabular-nums text-zinc-600">{row.timeLabel}</span>
                            </div>
                          </div>
                          <p className="truncate text-sm text-zinc-300">{row.subject}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-600">{row.preview}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {row.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                  tag.tone === "blue"
                                    ? "bg-sky-500/15 text-sky-300"
                                    : tag.tone === "orange"
                                      ? "bg-orange-500/15 text-orange-300"
                                      : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end justify-between">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(row.statusTone)}`}
                          >
                            {row.statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </V2InboxSwipeRow>
                  <button
                    type="button"
                    onClick={() => openSwipeLink(row.id)}
                    className="my-1 shrink-0 self-center rounded-xl border border-violet-500/35 bg-violet-600/10 px-2.5 py-3 text-[11px] font-semibold text-violet-300 lg:hidden"
                    aria-label={`Link ${row.subject || "email"}`}
                  >
                    Link
                  </button>
                </li>
              ))}
            </ul>
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
        {selectedDetail ? (
          <V2InboxDetailPanel
            detail={selectedDetail}
            buckets={buckets}
            tagBuckets={tagBuckets}
            linkedEntityRecords={linkedEntityRecords}
            topicContext={topicContext}
            onBack={mobileDetailOpen ? backToList : undefined}
            deleteUnlocked={deleteUnlocked}
            privateConfigured={privateConfigured}
            deleteError={deleteError}
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-sm text-zinc-500">
            Select an inbox item to read and process.
          </div>
        )}
      </section>

      {swipeLinkDetail ? (
        <V2InboxEntityLinkModal
          open={Boolean(swipeLinkId)}
          buckets={inboxBuckets}
          tagBuckets={tagBuckets}
          selectedIds={swipeLinkDetail.item.linkedEntityIds ?? []}
          selectedTags={swipeLinkDetail.item.topics ?? []}
          onClose={() => setSwipeLinkId(null)}
          onConfirm={(result) => void confirmSwipeLinks(result)}
          onEntityCreated={swipeLinkCreatedEntity}
        />
      ) : null}
    </div>
  );
}
