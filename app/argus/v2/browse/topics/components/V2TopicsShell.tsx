"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";
import { archiveEntityAction, restoreEntityAction } from "@/app/argus/actions";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2BrowseStatusFilter } from "@/app/argus/v2/components/V2BrowseStatusFilter";
import { V2Badge } from "../../../components/v2-ui";
import {
  applyBrowseOrder,
  placeInBrowseOrder,
  readBrowseCardOrder,
  writeBrowseCardOrder,
} from "@/lib/argus/v2/browse-card-order";
import {
  buildV2TopicBrowseCards,
  buildV2TopicBrowseSummary,
  buildV2TopicFilterOptions,
  filterV2TopicRows,
  hasActiveV2TopicFilters,
  parseV2TopicFilters,
  parseV2TopicTab,
  type V2TopicActivityFilter,
  type V2TopicBrowseCard,
  type V2TopicBrowseStatus,
  type V2TopicDetail,
  type V2TopicFilters,
  type V2TopicRow,
  type V2TopicTab,
  type V2TopicTagChip,
} from "@/lib/argus/v2/topic-browse-utils";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { parseIntelligenceFocus, intelligenceBrowseAllHref } from "@/lib/argus/v2/intelligence-nav";
import { V2IntelligenceFocusBanner } from "@/app/argus/v2/components/V2IntelligenceFocusBanner";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import { V2TopicDetailPanel } from "./V2TopicDetailPanel";
import { V2EntityLifecycleActions } from "@/app/argus/v2/components/V2EntityLifecycleActions";

const ORDER_SCOPE = "topics";
const COLUMN_SCOPE = "topics:columns";
const BOARD_COLUMNS: V2TopicBrowseStatus[] = ["Active", "Quiet", "Empty", "Archived"];

type FilterMenu = "org" | "project" | "activity" | null;

const ACTIVITY_OPTIONS: { id: V2TopicActivityFilter; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "older", label: "Older than 90 days" },
];

const TABS: { id: V2TopicTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "empty", label: "Empty" },
  { id: "patterns", label: "Patterns" },
];

function badgeTone(
  tone: V2TopicBrowseCard["statusTone"]
): "default" | "green" | "blue" | "amber" {
  return tone === "default" ? "default" : tone;
}

function SummaryPill({
  label,
  value,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "amber" | "blue";
  active?: boolean;
  onClick?: () => void;
}) {
  const valueTone =
    tone === "green"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "blue"
          ? "text-sky-300"
          : "text-zinc-50";
  const className = `rounded-xl border px-4 py-3 text-left transition ${
    active
      ? "border-violet-500/50 bg-violet-500/10"
      : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700"
  }`;
  const body = (
    <>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueTone}`}>{value}</p>
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={className} aria-pressed={active}>
      {body}
    </button>
  );
}

function topicInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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

function TopicCard({
  card,
  selected,
  onOpen,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
  returnTo,
  privateConfigured,
  privateUnlocked,
  deleteGate,
}: {
  card: V2TopicBrowseCard;
  selected: boolean;
  onOpen: () => void;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragOver: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
  returnTo: string;
  privateConfigured: boolean;
  privateUnlocked: boolean;
  deleteGate: Omit<V2DeleteGateProps, "requiresAuthenticator">;
}) {
  return (
    <div
      className={`group relative rounded-2xl border bg-zinc-900/50 transition ${
        isDropTarget
          ? "border-violet-400/60"
          : selected
            ? "border-violet-500/50"
            : "border-zinc-800/80 hover:border-violet-500/40"
      }`}
      onDragOver={(event) => onDragOver(event, card.id)}
      onDrop={(event) => onDrop(event, card.id)}
    >
      <button
        type="button"
        draggable
        onDragStart={(event) => onDragStart(event, card.id)}
        onDragEnd={onDragEnd}
        className="absolute left-3 top-3 z-[1] cursor-grab rounded-md px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing"
        aria-label={`Move ${card.name}`}
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <div className="absolute right-3 top-3 z-10">
        <V2EntityLifecycleActions
          entityId={card.id}
          entityName={card.name}
          entityKind="topic"
          lifecycleStatus={card.lifecycleStatus}
          returnTo={returnTo}
          hasPrivateEvidence={card.hasPrivateEvidence}
          privateConfigured={privateConfigured}
          privateUnlocked={privateUnlocked}
          showDelete
          variant="menu"
          requiresAuthenticator={card.deleteRequiresAuthenticator}
          {...deleteGate}
        />
      </div>
      <button type="button" onClick={onOpen} className="block w-full p-5 pl-10 pr-12 text-left hover:bg-zinc-900/80">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/30 to-zinc-800 text-sm font-bold text-amber-100 ring-1 ring-amber-500/20">
            {topicInitials(card.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-zinc-50 group-hover:text-violet-100">{card.name}</h2>
              <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
              {card.patternCount > 0 ? (
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">
                  🔁 {card.patternCount}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">{card.category}</p>
          </div>
          <span className="shrink-0 text-xs text-zinc-600 group-hover:text-violet-400">Open →</span>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">{card.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-1 sm:grid-cols-6">
          {(
            [
              ["journals", "📓"],
              ["emails", "✉"],
              ["files", "📎"],
              ["orgs", "🏢"],
              ["projects", "📁"],
              ["people", "👤"],
            ] as const
          ).map(([key, icon]) => (
            <div key={key} className="text-center">
              <div className="text-sm" aria-hidden>
                {icon}
              </div>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-violet-300">{card.metrics[key]}</p>
              <p className="text-[8px] capitalize text-zinc-600">{key}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-600">Last activity</span>
            <span className="text-zinc-400">{card.lastActivity}</span>
          </div>
          {card.aliases.length > 0 ? (
            <p className="mt-1 truncate text-zinc-500">Aliases: {card.aliases.slice(0, 3).join(", ")}</p>
          ) : null}
        </div>
      </button>
    </div>
  );
}

function TopicListRow({
  card,
  selected,
  onOpen,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
  returnTo,
  privateConfigured,
  privateUnlocked,
  deleteGate,
}: {
  card: V2TopicBrowseCard;
  selected: boolean;
  onOpen: () => void;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragOver: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
  returnTo: string;
  privateConfigured: boolean;
  privateUnlocked: boolean;
  deleteGate: Omit<V2DeleteGateProps, "requiresAuthenticator">;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-xl border bg-zinc-900/40 transition ${
        isDropTarget
          ? "border-violet-400/60"
          : selected
            ? "border-violet-500/40"
            : "border-zinc-800/80 hover:border-violet-500/30 hover:bg-zinc-900/70"
      }`}
      onDragOver={(event) => onDragOver(event, card.id)}
      onDrop={(event) => onDrop(event, card.id)}
    >
      <button
        type="button"
        draggable
        onDragStart={(event) => onDragStart(event, card.id)}
        onDragEnd={onDragEnd}
        className="ml-2 cursor-grab rounded-md px-1.5 py-2 text-[10px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing"
        aria-label={`Move ${card.name}`}
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-3 text-left sm:gap-4 sm:px-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600/20 text-xs font-bold text-amber-200">
          {topicInitials(card.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-zinc-100">{card.name}</p>
            <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {card.lastActivity} · {card.metrics.journals + card.metrics.emails + card.metrics.files} evidence
          </p>
        </div>
        <div className="hidden shrink-0 gap-4 text-center sm:flex">
          <span className="text-xs text-zinc-500">
            <span className="block font-semibold text-violet-300">{card.metrics.emails}</span>
            Emails
          </span>
          <span className="text-xs text-zinc-500">
            <span className="block font-semibold text-violet-300">{card.metrics.journals}</span>
            Notes
          </span>
          <span className="text-xs text-zinc-500">
            <span className="block font-semibold text-violet-300">{card.metrics.projects}</span>
            Projects
          </span>
        </div>
      </button>
      <div className="shrink-0 pr-3">
        <V2EntityLifecycleActions
          entityId={card.id}
          entityName={card.name}
          entityKind="topic"
          lifecycleStatus={card.lifecycleStatus}
          returnTo={returnTo}
          hasPrivateEvidence={card.hasPrivateEvidence}
          privateConfigured={privateConfigured}
          privateUnlocked={privateUnlocked}
          showDelete
          variant="menu"
          requiresAuthenticator={card.deleteRequiresAuthenticator}
          {...deleteGate}
        />
      </div>
    </div>
  );
}

function TopicBoardCard({
  card,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: V2TopicBrowseCard;
  onOpen: () => void;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2">
      <button
        type="button"
        draggable
        onDragStart={(event) => onDragStart(event, card.id)}
        onDragEnd={onDragEnd}
        className="mt-0.5 cursor-grab self-start rounded px-1 text-[10px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing"
        aria-label={`Move ${card.name}`}
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1 text-left">
        <p className="font-medium text-zinc-100">{card.name}</p>
        <p className="mt-1 text-[10px] text-zinc-500">
          {card.metrics.emails + card.metrics.journals} evidence · {card.lastActivity}
        </p>
      </button>
    </div>
  );
}

export function V2TopicsShell({
  rows,
  details,
  tagChips,
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
  rows: V2TopicRow[];
  details: V2TopicDetail[];
  tagChips: V2TopicTagChip[];
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
  const tab = parseV2TopicTab(searchParams.get("tab") ?? initialTab);
  const filters = useMemo(
    () =>
      parseV2TopicFilters({
        q: searchParams.get("q"),
        tag: searchParams.get("tag"),
        org: searchParams.get("org"),
        project: searchParams.get("project"),
        entity: searchParams.get("entity"),
        activity: searchParams.get("activity"),
      }),
    [searchParams]
  );
  const urlSelected = searchParams.get("selected");
  const selectedId = urlSelected?.trim() || initialSelectedId;
  const selected = selectedId ? details.find((d) => d.id === selectedId) : undefined;
  const mobileDetailOpen = Boolean(urlSelected);

  const [view, setView] = useState<"grid" | "list" | "board">("grid");
  const [statusFilter, setStatusFilter] = useState<V2TopicBrowseStatus | "all" | "patterns">(() => {
    if (tab === "active") return "Active";
    if (tab === "empty") return "Empty";
    if (tab === "patterns") return "patterns";
    return "all";
  });
  const [order, setOrder] = useState<string[]>([]);
  const [columnOverrides, setColumnOverrides] = useState<Record<string, V2TopicBrowseStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openFilter, setOpenFilter] = useState<FilterMenu>(null);
  const [searchDraft, setSearchDraft] = useState(filters.q ?? "");

  const deleteGate = {
    deleteUnlocked,
    deleteAuthUnlocked,
    deleteCodeConfigured,
    totpConfigured,
    deleteAuthConfigured,
    deleteError,
    deleteAuthError,
    totpRequired,
  };

  useEffect(() => {
    setOrder(readBrowseCardOrder(ORDER_SCOPE));
    try {
      const raw = localStorage.getItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`);
      if (raw) setColumnOverrides(JSON.parse(raw) as Record<string, V2TopicBrowseStatus>);
    } catch {
      /* ignore */
    }
  }, []);

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

  function persistOrder(next: string[]) {
    setOrder(next);
    writeBrowseCardOrder(ORDER_SCOPE, next);
  }

  function persistColumns(next: Record<string, V2TopicBrowseStatus>) {
    setColumnOverrides(next);
    try {
      localStorage.setItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }

  const filterOptions = useMemo(() => buildV2TopicFilterOptions(details), [details]);
  const rowTab: V2TopicTab =
    statusFilter === "Active"
      ? "active"
      : statusFilter === "Empty"
        ? "empty"
        : statusFilter === "patterns"
          ? "patterns"
          : "all";
  const filteredRows = useMemo(
    () => filterV2TopicRows(rows, rowTab, filters),
    [rows, rowTab, filters]
  );
  const cards = useMemo(
    () => buildV2TopicBrowseCards(filteredRows, details),
    [filteredRows, details]
  );
  const sorted = useMemo(() => applyBrowseOrder(cards, order), [cards, order]);
  const filtered = useMemo(() => {
    if (statusFilter === "all") return sorted;
    if (statusFilter === "patterns") return sorted.filter((c) => c.patternCount > 0);
    return sorted.filter((c) => c.status === statusFilter);
  }, [sorted, statusFilter]);
  const summary = useMemo(
    () => buildV2TopicBrowseSummary(buildV2TopicBrowseCards(rows, details)),
    [rows, details]
  );
  const filtersActive = hasActiveV2TopicFilters(filters);

  const boardGroups = useMemo(() => {
    const groups: Record<V2TopicBrowseStatus, V2TopicBrowseCard[]> = {
      Active: [],
      Quiet: [],
      Empty: [],
      Archived: [],
    };
    for (const card of sorted) {
      if (statusFilter === "patterns" && card.patternCount === 0) continue;
      const status = columnOverrides[card.id] ?? card.status;
      groups[status].push(card);
    }
    return groups;
  }, [sorted, columnOverrides, statusFilter]);

  function setTab(next: V2TopicTab, syncStatus = true) {
    replaceTopicParams((params) => {
      if (next === "all") params.delete("tab");
      else params.set("tab", next);
      params.delete("page");
    });
    if (!syncStatus) return;
    if (next === "active") setStatusFilter("Active");
    else if (next === "empty") setStatusFilter("Empty");
    else if (next === "patterns") setStatusFilter("patterns");
    else setStatusFilter("all");
  }

  function applyStatusFilter(value: V2TopicBrowseStatus | "all" | "patterns") {
    setStatusFilter(value);
    if (value === "Active") setTab("active", false);
    else if (value === "Empty") setTab("empty", false);
    else if (value === "patterns") setTab("patterns", false);
    else setTab("all", false);
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
      params.delete("activity");
      params.delete("page");
    });
    setSearchDraft("");
    setOpenFilter(null);
  }

  function selectItem(id: string) {
    replaceTopicParams((params) => {
      params.set("selected", id);
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToList() {
    replaceTopicParams((params) => {
      params.delete("selected");
    });
  }

  useEffect(() => {
    if (!urlSelected) return;
    if (filteredRows.length === 0) {
      replaceTopicParams((params) => {
        params.delete("selected");
      });
      return;
    }
    if (!filteredRows.some((row) => row.id === urlSelected)) {
      replaceTopicParams((params) => {
        params.delete("selected");
      });
    }
  }, [filteredRows, urlSelected, replaceTopicParams]);

  const returnTo = selected
    ? `/argus/v2/browse/topics?${searchParams.toString()}`
    : `/argus/v2/browse/topics`;

  const { focus, from } = parseIntelligenceFocus(searchParams);

  function onDragStart(event: DragEvent, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDropBeforeId(null);
  }

  function onDragOverCard(event: DragEvent, id: string) {
    if (!draggingId || draggingId === id) return;
    event.preventDefault();
    setDropBeforeId(id);
  }

  function onDropCard(event: DragEvent, beforeId: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    if (!id || id === beforeId) {
      onDragEnd();
      return;
    }
    const knownIds = filtered.map((c) => c.id);
    persistOrder(placeInBrowseOrder(order, id, beforeId, knownIds));
    onDragEnd();
  }

  function onDropBoard(
    event: DragEvent,
    column: V2TopicBrowseStatus,
    beforeId: string | null
  ) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    if (!id) {
      onDragEnd();
      return;
    }
    const knownIds = cards.map((c) => c.id);
    persistOrder(placeInBrowseOrder(order, id, beforeId, knownIds));
    persistColumns({ ...columnOverrides, [id]: column });

    const card = cards.find((c) => c.id === id);
    if (card && column === "Archived" && card.status !== "Archived") {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("entityId", id);
        fd.set("returnTo", "/argus/v2/browse/topics");
        fd.set("quiet", "1");
        await archiveEntityAction(fd);
        router.refresh();
      });
    } else if (card && column === "Active" && card.status === "Archived") {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("entityId", id);
        fd.set("returnTo", "/argus/v2/browse/topics");
        fd.set("quiet", "1");
        await restoreEntityAction(fd);
        router.refresh();
      });
    }
    onDragEnd();
  }

  if ((focus && selected) || (selected && mobileDetailOpen)) {
    return (
      <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden">
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950/50">
          {focus ? (
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
          ) : null}
          <V2TopicDetailPanel
            selected={selected}
            neighborhood={neighborhood}
            returnTo={returnTo}
            onBack={backToList}
            privateConfigured={privateConfigured}
            privateUnlocked={privateUnlocked}
            allRunbooks={allRunbooks}
            allProgress={allProgress}
            requiresAuthenticator={selected.deleteRequiresAuthenticator}
            {...deleteGate}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-lg ring-1 ring-amber-500/30">
                  🏷
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Topics</h1>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Drag ⋮⋮ to reorder within search results, or move onto board columns.
                {isPending ? " Saving…" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
                {(
                  [
                    ["grid", "▦", "Grid view"],
                    ["list", "☰", "List view"],
                    ["board", "▥", "Board view"],
                  ] as const
                ).map(([id, icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                      view === id ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    aria-label={label}
                    aria-pressed={view === id}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <V2BrowseStatusFilter<V2TopicBrowseStatus | "patterns">
                label="Filters"
                value={statusFilter}
                onChange={applyStatusFilter}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "Active", label: "Active" },
                  { value: "Quiet", label: "Quiet" },
                  { value: "Empty", label: "Empty" },
                  { value: "Archived", label: "Archived" },
                  { value: "patterns", label: "Patterns" },
                ]}
              />
              <V2CreateEntityButton
                kind="topic"
                label="+ Topic"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
            </div>
          </header>

          <div className="mb-4">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search topics, aliases, notes…"
              className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="mb-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                  tab === t.id ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tagChips.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-1.5">
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

          <div className="mb-6 flex flex-wrap items-center gap-2">
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
                onClick={() => setOpenFilter(openFilter === "activity" ? null : "activity")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${
                  filters.activity
                    ? "bg-violet-500/15 text-violet-300"
                    : "bg-zinc-800/80 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Date{filters.activity ? " ✓" : ""}
              </button>
              <FilterMenuPanel open={openFilter === "activity"} onClose={() => setOpenFilter(null)}>
                {ACTIVITY_OPTIONS.map((option) => (
                  <FilterOption
                    key={option.id}
                    active={filters.activity === option.id}
                    onClick={() =>
                      setFilter("activity", filters.activity === option.id ? undefined : option.id)
                    }
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

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryPill label="Total" value={summary.total} active={statusFilter === "all"} onClick={() => applyStatusFilter("all")} />
            <SummaryPill label="Active" value={summary.active} tone="green" active={statusFilter === "Active"} onClick={() => applyStatusFilter("Active")} />
            <SummaryPill label="Quiet" value={summary.quiet} tone="amber" active={statusFilter === "Quiet"} onClick={() => applyStatusFilter("Quiet")} />
            <SummaryPill label="Empty" value={summary.empty} tone="blue" active={statusFilter === "Empty"} onClick={() => applyStatusFilter("Empty")} />
            <SummaryPill label="Archived" value={summary.archived} active={statusFilter === "Archived"} onClick={() => applyStatusFilter("Archived")} />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
              <p className="text-sm text-zinc-500">
                {rows.length === 0 ? "No topics yet." : "No topics match these filters."}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {rows.length === 0
                  ? "Capture a topic and link emails or records to it."
                  : "Try a different view, tag, or clear filters."}
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((card) => (
                <TopicCard
                  key={card.id}
                  card={card}
                  selected={selectedId === card.id}
                  onOpen={() => selectItem(card.id)}
                  onDragStart={onDragStart}
                  onDragOver={onDragOverCard}
                  onDrop={onDropCard}
                  onDragEnd={onDragEnd}
                  isDropTarget={dropBeforeId === card.id && draggingId !== card.id}
                  returnTo={returnTo}
                  privateConfigured={privateConfigured}
                  privateUnlocked={privateUnlocked}
                  deleteGate={deleteGate}
                />
              ))}
            </div>
          ) : view === "list" ? (
            <div className="space-y-2">
              {filtered.map((card) => (
                <TopicListRow
                  key={card.id}
                  card={card}
                  selected={selectedId === card.id}
                  onOpen={() => selectItem(card.id)}
                  onDragStart={onDragStart}
                  onDragOver={onDragOverCard}
                  onDrop={onDropCard}
                  onDragEnd={onDragEnd}
                  isDropTarget={dropBeforeId === card.id && draggingId !== card.id}
                  returnTo={returnTo}
                  privateConfigured={privateConfigured}
                  privateUnlocked={privateUnlocked}
                  deleteGate={deleteGate}
                />
              ))}
            </div>
          ) : (
            <div className="argus-v2-scroll flex gap-3 overflow-x-auto pb-2">
              {BOARD_COLUMNS.map((column) => (
                <div
                  key={column}
                  className="flex w-72 shrink-0 flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/30"
                  onDragOver={(event) => {
                    if (!draggingId) return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => onDropBoard(event, column, null)}
                >
                  <div className="border-b border-zinc-800/80 px-3 py-2.5">
                    <h3 className="text-sm font-semibold text-zinc-200">{column}</h3>
                    <p className="text-[11px] text-zinc-600">{boardGroups[column].length}</p>
                  </div>
                  <div className="min-h-[8rem] space-y-2 p-2">
                    {boardGroups[column].length === 0 ? (
                      <p className="px-1 py-8 text-center text-xs text-zinc-600">Drop here</p>
                    ) : (
                      boardGroups[column].map((card) => (
                        <div
                          key={card.id}
                          className={draggingId === card.id ? "opacity-50" : ""}
                          onDragOver={(event) => {
                            if (!draggingId) return;
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onDrop={(event) => {
                            event.stopPropagation();
                            onDropBoard(event, column, card.id);
                          }}
                        >
                          <TopicBoardCard
                            card={card}
                            onOpen={() => selectItem(card.id)}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filtered.length > 0 && view !== "board" ? (
            <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
              <p>
                Showing 1 to {filtered.length} of {filtered.length} topic
                {filtered.length === 1 ? "" : "s"}
              </p>
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
