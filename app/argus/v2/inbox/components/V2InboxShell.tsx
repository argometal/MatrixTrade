"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
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
} from "@/lib/argus/v2/inbox-loaders";
import { V2InboxDetailPanel } from "./V2InboxDetailPanel";

const TABS: { id: V2InboxTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "in_progress", label: "In Progress" },
  { id: "processed", label: "Processed" },
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
  initialSelectedId,
  initialTab,
}: {
  rows: V2InboxRow[];
  details: DetailBundle[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  linkedEntityRecords: Entity[];
  initialSelectedId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2InboxTab(searchParams.get("tab") ?? initialTab);
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
  const selectedId = searchParams.get("selected") ?? initialSelectedId ?? rows[0]?.id;
  const counts = useMemo(() => buildV2InboxTabCounts(rows), [rows]);
  const tabRows = useMemo(() => filterV2InboxRows(rows, tab), [rows, tab]);
  const filterOptions = useMemo(() => buildV2InboxFilterOptions(tabRows), [tabRows]);
  const filtered = useMemo(() => filterV2InboxRows(rows, tab, filters), [rows, tab, filters]);
  const selectedDetail = details.find((d) => d.item.id === selectedId);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [processOpen, setProcessOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);
  const filtersActive = hasActiveV2InboxFilters(filters);

  function replaceInboxParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.replace(`/argus/v2/inbox?${params.toString()}`);
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
    replaceInboxParams((params) => {
      params.set("tab", next);
    });
  }

  function selectItem(id: string) {
    replaceInboxParams((params) => {
      params.set("selected", id);
    });
  }

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selectedId || !filtered.some((row) => row.id === selectedId)) {
      replaceInboxParams((params) => {
        params.set("selected", filtered[0].id);
      });
    }
  }, [filtered, selectedId]);

  function toggleChecked(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="v2-inbox-shell flex min-h-[calc(100vh-4.5rem)] flex-col lg:min-h-[calc(100vh-4rem)] lg:flex-row">
      <section className="flex w-full flex-col border-b border-zinc-800/80 lg:w-[min(440px,40%)] lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Inbox</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Unprocessed emails and items</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectMode((value) => !value)}
                className={`text-xs ${selectMode ? "text-violet-300" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Select
              </button>
              <button
                type="button"
                onClick={() => setTab("unread")}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Mark all read
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProcessOpen((open) => !open)}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
                >
                  Process ▾
                </button>
                {processOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setProcessOpen(false);
                        if (selectedId) selectItem(selectedId);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      Process selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcessOpen(false)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800"
                    >
                      Bulk archive
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" className="text-zinc-600 hover:text-zinc-400">
                ···
              </button>
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

        <div className="flex flex-wrap gap-2 border-b border-zinc-800/80 px-4 py-2 lg:px-5">
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
              {filters.source ? inboxSourceLabel(filters.source) : "All sources"} ▾
            </button>
            <FilterMenuPanel open={openFilter === "source"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.source} onClick={() => setFilter("source")}>
                All sources
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
                : "All senders"}{" "}
              ▾
            </button>
            <FilterMenuPanel open={openFilter === "sender"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.sender} onClick={() => setFilter("sender")}>
                All senders
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
              {filters.type ? inboxEntityKindLabel(filters.type) : "All types"} ▾
            </button>
            <FilterMenuPanel open={openFilter === "type"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.type} onClick={() => setFilter("type")}>
                All types
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
                : "All entities"}{" "}
              ▾
            </button>
            <FilterMenuPanel open={openFilter === "entity"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.entityId} onClick={() => setFilter("entityId")}>
                All entities
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
              {filters.tag ?? "All tags"} ▾
            </button>
            <FilterMenuPanel open={openFilter === "tag"} onClose={() => setOpenFilter(null)}>
              <FilterOption active={!filters.tag} onClick={() => setFilter("tag")}>
                All tags
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

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              {filtersActive ? "No items match these filters." : "No items in this tab."}
            </p>
          ) : (
            <ul className="p-2 lg:p-3">
              {filtered.map((row) => (
                <li key={row.id} className="mb-2">
                  <button
                    type="button"
                    onClick={() => selectItem(row.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition hover:bg-zinc-900/40 ${
                      selectedId === row.id
                        ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/20"
                        : "border-zinc-800/80 bg-zinc-900/20"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          checked={checked.has(row.id)}
                          readOnly={!selectMode}
                          onClick={(event) => {
                            if (selectMode) {
                              event.stopPropagation();
                              toggleChecked(row.id);
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-900"
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
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(row.statusTone)}`}>
                          {row.statusLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1 overflow-y-auto bg-zinc-950/50">
        {selectedDetail ? (
          <V2InboxDetailPanel
            detail={selectedDetail}
            buckets={buckets}
            tagBuckets={tagBuckets}
            linkedEntityRecords={linkedEntityRecords}
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-sm text-zinc-500">
            Select an inbox item to read and process.
          </div>
        )}
      </section>
    </div>
  );
}
