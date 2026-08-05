"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { archiveEntityAction, restoreEntityAction } from "@/app/argus/actions";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2ProjectActions } from "@/app/argus/v2/components/V2ProjectActions";
import { V2BrowseStatusFilter } from "@/app/argus/v2/components/V2BrowseStatusFilter";
import { V2Badge } from "../../../components/v2-ui";
import {
  applyBrowseOrder,
  placeInBrowseOrder,
  readBrowseCardOrder,
  writeBrowseCardOrder,
} from "@/lib/argus/v2/browse-card-order";
import {
  readBrowseViewPrefs,
  writeBrowseViewPrefs,
  type BrowseLayoutView,
} from "@/lib/argus/v2/browse-view-prefs";
import { BrowseBoardColumnHeader } from "@/app/argus/v2/components/BrowseBoardColumnHeader";
import { textMatchesBrowseQuery } from "@/lib/argus/v2/browse-filter-utils";
import {
  filterV2ProjectBrowseCards,
  type V2ProjectBrowseCard,
  type V2ProjectBrowseStatus,
  type V2ProjectBrowseSummary,
} from "@/lib/argus/v2/project-browse-utils";

function badgeTone(tone: V2ProjectBrowseCard["statusTone"]): "default" | "green" | "blue" | "amber" | "orange" {
  if (tone === "zinc") return "default";
  return tone;
}

const METRIC_ICONS = {
  people: "👤",
  emails: "✉",
  topics: "🏷",
  events: "📅",
} as const;

const ORDER_SCOPE = "projects";
const COLUMN_SCOPE = "projects:columns";
const BOARD_COLUMNS: V2ProjectBrowseStatus[] = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
  "Archived",
];

function SummaryPill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `rounded-xl border px-4 py-3 text-left transition ${
    active
      ? "border-violet-500/50 bg-violet-500/10"
      : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700"
  }`;
  const body = (
    <>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-50">{value}</p>
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={className} aria-pressed={active}>
      {body}
    </button>
  );
}

function ProjectCard({
  card,
  privateConfigured,
  privateUnlocked,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
}: {
  card: V2ProjectBrowseCard;
  privateConfigured: boolean;
  privateUnlocked: boolean;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragOver: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
}) {
  return (
    <div
      className={`group relative rounded-2xl border bg-zinc-900/50 transition ${
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
      <div className="absolute right-3 top-3 z-10">
        <V2ProjectActions
          projectId={card.id}
          projectName={card.name}
          href={card.href}
          hasPrivateEvidence={card.hasPrivateEvidence}
          privateConfigured={privateConfigured}
          privateUnlocked={privateUnlocked}
        />
      </div>
      <Link href={card.href} className="block p-5 pl-10 pr-12 hover:bg-zinc-900/80">
        <div className="mb-3 flex items-start justify-between gap-3">
          <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
          <span className="text-xs text-zinc-600 group-hover:text-violet-400">Open →</span>
        </div>

        <h2 className="text-xl font-bold text-zinc-50 group-hover:text-violet-100">{card.name}</h2>

        {card.dateRangeLabel ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
            <span aria-hidden>📅</span>
            {card.dateRangeLabel}
          </p>
        ) : null}

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">{card.description}</p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {(Object.keys(METRIC_ICONS) as (keyof typeof METRIC_ICONS)[]).map((key) => (
            <div key={key} className="text-center">
              <div className="text-base" aria-hidden>
                {METRIC_ICONS[key]}
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums text-violet-300">{card.metrics[key]}</p>
              <p className="text-[9px] capitalize text-zinc-600">{key}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
          <p className="truncate text-sm text-zinc-300">{card.lastActivity.label}</p>
          <p className="mt-0.5 text-xs text-zinc-600">{card.lastActivity.timeLabel}</p>
        </div>

        {card.progressPercent !== undefined ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Duration progress</span>
              <span className="font-medium tabular-nums text-violet-300">{card.progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                style={{ width: `${card.progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-2">
            {card.team.map((member) => (
              <span
                key={member.id}
                title={member.name}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-gradient-to-br from-violet-600/40 to-zinc-700 text-[10px] font-bold text-violet-100"
              >
                {member.initials}
              </span>
            ))}
          </div>
          {card.teamOverflow > 0 ? (
            <span className="text-xs text-zinc-600">+{card.teamOverflow} more</span>
          ) : card.team.length === 0 ? (
            <span className="text-xs text-zinc-600">No people linked yet</span>
          ) : null}
        </div>
      </Link>
    </div>
  );
}

function ProjectListRow({
  card,
  privateConfigured,
  privateUnlocked,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
}: {
  card: V2ProjectBrowseCard;
  privateConfigured: boolean;
  privateUnlocked: boolean;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragOver: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-xl border bg-zinc-900/40 transition ${
        isDropTarget ? "border-violet-400/60" : "border-zinc-800/80 hover:border-violet-500/30 hover:bg-zinc-900/70"
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
      <Link href={card.href} className="flex min-w-0 flex-1 items-center gap-4 px-2 py-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-zinc-100">{card.name}</p>
            <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {card.dateRangeLabel ?? "No dates"} · {card.lastActivity.label} · {card.lastActivity.timeLabel}
          </p>
        </div>
        <div className="hidden shrink-0 gap-4 text-center sm:flex">
          <span className="text-xs text-zinc-500">
            <span className="block font-semibold text-violet-300">{card.metrics.people}</span>
            People
          </span>
          <span className="text-xs text-zinc-500">
            <span className="block font-semibold text-violet-300">{card.metrics.emails}</span>
            Emails
          </span>
          <span className="text-xs text-zinc-500">
            <span className="block font-semibold text-violet-300">{card.metrics.topics}</span>
            Topics
          </span>
        </div>
      </Link>
      <div className="shrink-0 pr-3">
        <V2ProjectActions
          projectId={card.id}
          projectName={card.name}
          href={card.href}
          hasPrivateEvidence={card.hasPrivateEvidence}
          privateConfigured={privateConfigured}
          privateUnlocked={privateUnlocked}
        />
      </div>
    </div>
  );
}

function ProjectBoardCard({
  card,
  onDragStart,
  onDragEnd,
}: {
  card: V2ProjectBrowseCard;
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
          {card.metrics.people} people · {card.lastActivity.timeLabel}
        </p>
      </Link>
    </div>
  );
}

export function V2ProjectsBrowserShell({
  cards,
  summary,
  privateConfigured,
  privateUnlocked,
}: {
  cards: V2ProjectBrowseCard[];
  summary: V2ProjectBrowseSummary;
  privateConfigured: boolean;
  privateUnlocked: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgScope = searchParams.get("org")?.trim() || undefined;
  const [view, setViewState] = useState<BrowseLayoutView>("grid");
  const [statusFilter, setStatusFilterState] = useState<V2ProjectBrowseStatus | "all">("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [columnOverrides, setColumnOverrides] = useState<Record<string, V2ProjectBrowseStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOrder(readBrowseCardOrder(ORDER_SCOPE));
    try {
      const raw = localStorage.getItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`);
      if (raw) setColumnOverrides(JSON.parse(raw) as Record<string, V2ProjectBrowseStatus>);
    } catch {
      /* ignore */
    }
    const prefs = readBrowseViewPrefs(ORDER_SCOPE);
    if (prefs.view) setViewState(prefs.view);
    if (
      prefs.status === "all" ||
      prefs.status === "Planning" ||
      prefs.status === "Active" ||
      prefs.status === "On Hold" ||
      prefs.status === "Completed" ||
      prefs.status === "Archived"
    ) {
      setStatusFilterState(prefs.status);
    }
  }, []);

  function setView(next: BrowseLayoutView) {
    setViewState(next);
    writeBrowseViewPrefs(ORDER_SCOPE, { view: next });
  }

  function setStatusFilter(next: V2ProjectBrowseStatus | "all") {
    setStatusFilterState(next);
    writeBrowseViewPrefs(ORDER_SCOPE, { status: next });
  }

  function persistOrder(next: string[]) {
    setOrder(next);
    writeBrowseCardOrder(ORDER_SCOPE, next);
  }

  function persistColumns(next: Record<string, V2ProjectBrowseStatus>) {
    setColumnOverrides(next);
    try {
      localStorage.setItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }

  const scopedCards = useMemo(() => filterV2ProjectBrowseCards(cards, orgScope), [cards, orgScope]);
  const sorted = useMemo(() => applyBrowseOrder(scopedCards, order), [scopedCards, order]);
  const filtered = useMemo(() => {
    let next = statusFilter === "all" ? sorted : sorted.filter((c) => c.status === statusFilter);
    const q = searchDraft.trim();
    if (q) {
      next = next.filter((c) =>
        textMatchesBrowseQuery(q, [c.name, c.description, c.lastActivity.label, c.status])
      );
    }
    return next;
  }, [sorted, statusFilter, searchDraft]);

  const boardGroups = useMemo(() => {
    const groups: Record<V2ProjectBrowseStatus, V2ProjectBrowseCard[]> = {
      Planning: [],
      Active: [],
      "On Hold": [],
      Completed: [],
      Archived: [],
    };
    const q = searchDraft.trim();
    const boardSource = q
      ? sorted.filter((c) =>
          textMatchesBrowseQuery(q, [c.name, c.description, c.lastActivity.label, c.status])
        )
      : sorted;
    for (const card of boardSource) {
      const status = columnOverrides[card.id] ?? card.status;
      groups[status].push(card);
    }
    return groups;
  }, [sorted, columnOverrides, searchDraft]);

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
    column: V2ProjectBrowseStatus,
    beforeId: string | null
  ) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    if (!id) {
      onDragEnd();
      return;
    }
    const knownIds = scopedCards.map((c) => c.id);
    persistOrder(placeInBrowseOrder(order, id, beforeId, knownIds));
    persistColumns({ ...columnOverrides, [id]: column });

    const card = cards.find((c) => c.id === id);
    if (card && column === "Archived" && card.status !== "Archived") {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("entityId", id);
        fd.set("returnTo", "/argus/v2/browse/projects");
        fd.set("quiet", "1");
        await archiveEntityAction(fd);
        router.refresh();
      });
    } else if (card && column === "Active" && card.status === "Archived") {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("entityId", id);
        fd.set("returnTo", "/argus/v2/browse/projects");
        fd.set("quiet", "1");
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
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                  📁
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Projects</h1>
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
                  { value: "Planning", label: "Planning" },
                  { value: "Active", label: "Active" },
                  { value: "On Hold", label: "On Hold" },
                  { value: "Completed", label: "Completed" },
                  { value: "Archived", label: "Archived" },
                ]}
              />
              <V2CreateEntityButton
                kind="project"
                label="+ Project"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
            </div>
          </header>

          <div className="mb-4">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search projects…"
              className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryPill label="Total" value={summary.total} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            <SummaryPill label="Active" value={summary.active} active={statusFilter === "Active"} onClick={() => setStatusFilter("Active")} />
            <SummaryPill label="Planning" value={summary.planning} active={statusFilter === "Planning"} onClick={() => setStatusFilter("Planning")} />
            <SummaryPill label="On Hold" value={summary.onHold} active={statusFilter === "On Hold"} onClick={() => setStatusFilter("On Hold")} />
            <SummaryPill label="Completed" value={summary.completed} active={statusFilter === "Completed"} onClick={() => setStatusFilter("Completed")} />
            <SummaryPill label="Archived" value={summary.archived} active={statusFilter === "Archived"} onClick={() => setStatusFilter("Archived")} />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
              <p className="text-sm text-zinc-500">
                {scopedCards.length === 0 ? "No projects yet." : "No projects match this search."}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {scopedCards.length === 0
                  ? "Capture one and link org, people, topics, or events."
                  : "Clear search or try a different filter."}
              </p>
              {scopedCards.length === 0 ? (
                <div className="mt-4">
                  <V2CreateEntityButton
                    kind="project"
                    label="+ Project"
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                  />
                </div>
              ) : null}
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((card) => (
                <ProjectCard
                  key={card.id}
                  card={card}
                  privateConfigured={privateConfigured}
                  privateUnlocked={privateUnlocked}
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
                <ProjectListRow
                  key={card.id}
                  card={card}
                  privateConfigured={privateConfigured}
                  privateUnlocked={privateUnlocked}
                  onDragStart={onDragStart}
                  onDragOver={onDragOverCard}
                  onDrop={onDropCard}
                  onDragEnd={onDragEnd}
                  isDropTarget={dropBeforeId === card.id && draggingId !== card.id}
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
                  <BrowseBoardColumnHeader column={column} count={boardGroups[column].length} />
                  <div className="min-h-[8rem] space-y-2 p-2">
                    {boardGroups[column].length === 0 ? (
                      <p className="px-1 py-8 text-center text-xs text-zinc-600">
                        {column === "Archived" ? "Drop to hide (not delete)" : "Drop here"}
                      </p>
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
                          <ProjectBoardCard
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
                Showing 1 to {filtered.length} of {filtered.length} project
                {filtered.length === 1 ? "" : "s"}
              </p>
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
