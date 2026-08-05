"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { archiveEntityAction, restoreEntityAction } from "@/app/argus/actions";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2BrowseStatusFilter } from "@/app/argus/v2/components/V2BrowseStatusFilter";
import { V2RelationshipChart } from "@/app/argus/v2/components/V2RelationshipChart";
import { V2Badge } from "../../../components/v2-ui";
import {
  applyBrowseOrder,
  placeInBrowseOrder,
  readBrowseCardOrder,
  writeBrowseCardOrder,
} from "@/lib/argus/v2/browse-card-order";
import type {
  V2OrganizationBrowseCard,
  V2OrganizationBrowseStatus,
  V2OrganizationBrowseSummary,
} from "@/lib/argus/v2/organization-browse-utils";

function badgeTone(tone: V2OrganizationBrowseCard["statusTone"]): "default" | "green" | "blue" | "amber" {
  return tone;
}

const METRIC_ICONS = {
  projects: "📁",
  people: "👤",
  emails: "✉",
  topics: "🏷",
  events: "📅",
} as const;

const ORDER_SCOPE = "organizations";
const COLUMN_SCOPE = "organizations:columns";
const BOARD_COLUMNS: V2OrganizationBrowseStatus[] = ["Prospect", "Active", "Inactive", "Archived"];

function SummaryPill({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon?: string;
  tone?: "default" | "green" | "amber" | "blue";
}) {
  const valueTone =
    tone === "green"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "blue"
          ? "text-sky-300"
          : "text-zinc-50";

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
        {icon ? <span aria-hidden>{icon}</span> : null}
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}

function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function OrganizationCard({
  card,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
}: {
  card: V2OrganizationBrowseCard;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragOver: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border bg-zinc-900/50 transition ${
        isDropTarget ? "border-violet-400/60" : "border-zinc-800/80 hover:border-violet-500/40"
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
      <Link href={card.href} className="group block p-5 pl-10 hover:bg-zinc-900/80">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-zinc-800 text-sm font-bold text-violet-100 ring-1 ring-violet-500/20">
            {orgInitials(card.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-zinc-50 group-hover:text-violet-100">{card.name}</h2>
              <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
            </div>
          </div>
          <span className="shrink-0 text-xs text-zinc-600 group-hover:text-violet-400">Open →</span>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">{card.description}</p>

        <div className="mt-4 grid grid-cols-5 gap-1">
          {(Object.keys(METRIC_ICONS) as (keyof typeof METRIC_ICONS)[]).map((key) => (
            <div key={key} className="text-center">
              <div className="text-sm" aria-hidden>
                {METRIC_ICONS[key]}
              </div>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-violet-300">{card.metrics[key]}</p>
              <p className="text-[8px] capitalize text-zinc-600">{key}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <span className="text-zinc-600">Last contact</span>
            <span className="text-right text-zinc-500">{card.lastContact.timeLabel}</span>
          </div>
          <p className="truncate text-sm text-zinc-300">{card.lastContact.label}</p>
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
            <span className="text-zinc-600">Relationship age</span>
            <span className="font-medium tabular-nums text-violet-300">{card.relationshipAge}</span>
          </div>
        </div>

        <div className="mt-3">
          <V2RelationshipChart
            points={card.trend}
            startYear={card.trendStartYear}
            endYear={card.trendEndYear}
          />
        </div>
      </Link>
    </div>
  );
}

function OrganizationListRow({ card }: { card: V2OrganizationBrowseCard }) {
  return (
    <Link
      href={card.href}
      className="flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition hover:border-violet-500/30 hover:bg-zinc-900/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-200">
        {orgInitials(card.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-100">{card.name}</p>
          <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {card.lastContact.label} · {card.lastContact.timeLabel} · {card.relationshipAge} history
        </p>
      </div>
      <div className="hidden shrink-0 gap-4 text-center sm:flex">
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.projects}</span>
          Projects
        </span>
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.people}</span>
          People
        </span>
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.emails}</span>
          Emails
        </span>
      </div>
    </Link>
  );
}

function OrganizationBoardCard({
  card,
  onDragStart,
  onDragEnd,
}: {
  card: V2OrganizationBrowseCard;
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
      <Link href={card.href} className="min-w-0 flex-1 py-1">
        <p className="font-medium text-zinc-100">{card.name}</p>
        <p className="mt-1 text-[10px] text-zinc-500">
          {card.metrics.projects} projects · {card.lastContact.timeLabel}
        </p>
      </Link>
    </div>
  );
}

export function V2OrganizationsBrowserShell({
  cards,
  summary,
}: {
  cards: V2OrganizationBrowseCard[];
  summary: V2OrganizationBrowseSummary;
}) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list" | "board">("grid");
  const [statusFilter, setStatusFilter] = useState<V2OrganizationBrowseStatus | "all">("all");
  const [order, setOrder] = useState<string[]>([]);
  const [columnOverrides, setColumnOverrides] = useState<Record<string, V2OrganizationBrowseStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOrder(readBrowseCardOrder(ORDER_SCOPE));
    try {
      const raw = localStorage.getItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`);
      if (raw) setColumnOverrides(JSON.parse(raw) as Record<string, V2OrganizationBrowseStatus>);
    } catch {
      /* ignore */
    }
  }, []);

  function persistOrder(next: string[]) {
    setOrder(next);
    writeBrowseCardOrder(ORDER_SCOPE, next);
  }

  function persistColumns(next: Record<string, V2OrganizationBrowseStatus>) {
    setColumnOverrides(next);
    try {
      localStorage.setItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }

  const sorted = useMemo(() => applyBrowseOrder(cards, order), [cards, order]);
  const filtered = useMemo(
    () => (statusFilter === "all" ? sorted : sorted.filter((c) => c.status === statusFilter)),
    [sorted, statusFilter]
  );

  const boardGroups = useMemo(() => {
    const groups: Record<V2OrganizationBrowseStatus, V2OrganizationBrowseCard[]> = {
      Prospect: [],
      Active: [],
      Inactive: [],
      Archived: [],
    };
    for (const card of sorted) {
      const status = columnOverrides[card.id] ?? card.status;
      groups[status].push(card);
    }
    return groups;
  }, [sorted, columnOverrides]);

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
    column: V2OrganizationBrowseStatus,
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
        fd.set("returnTo", "/argus/v2/browse/organizations");
        await archiveEntityAction(fd);
        router.refresh();
      });
    } else if (card && column === "Active" && card.status === "Archived") {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("entityId", id);
        fd.set("returnTo", "/argus/v2/browse/organizations");
        await restoreEntityAction(fd);
        router.refresh();
      });
    }
    onDragEnd();
  }

  return (
    <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
          <div className="min-w-0">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                    🏢
                  </span>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Organizations</h1>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Drag ⋮⋮ to reorder cards or move them onto status labels (board).
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
                <V2BrowseStatusFilter
                  label="Filters"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "Prospect", label: "Prospect" },
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                    { value: "Archived", label: "Archived" },
                  ]}
                />
                <V2CreateEntityButton
                  kind="organization"
                  label="+ Organization"
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
                />
              </div>
            </header>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryPill label="Total Organizations" value={summary.total} />
              <SummaryPill label="Active" value={summary.active} icon="✓" tone="green" />
              <SummaryPill label="Inactive" value={summary.inactive} icon="◷" tone="amber" />
              <SummaryPill label="Archived" value={summary.archived} icon="▣" tone="default" />
              <SummaryPill label="Total Projects" value={summary.totalProjects} icon="📁" tone="blue" />
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
                <p className="text-sm text-zinc-500">No organizations yet.</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Capture one to start building institutional memory across years.
                </p>
              </div>
            ) : view === "grid" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {filtered.map((card) => (
                  <OrganizationCard
                    key={card.id}
                    card={card}
                    onDragStart={onDragStart}
                    onDragOver={onDragOverCard}
                    onDrop={onDropCard}
                    onDragEnd={onDragEnd}
                    isDropTarget={dropBeforeId === card.id && draggingId !== card.id}
                  />
                ))}
              </div>
            ) : view === "list" ? (
              <div className="space-y-2">
                {filtered.map((card) => (
                  <OrganizationListRow key={card.id} card={card} />
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
                            <OrganizationBoardCard
                              card={card}
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
                  Showing 1 to {filtered.length} of {filtered.length} organization
                  {filtered.length === 1 ? "" : "s"}
                </p>
              </footer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
