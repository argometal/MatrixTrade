"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import {
  archiveEntityAction,
  recordNetworkLastContactAction,
  restoreEntityAction,
} from "@/app/argus/actions";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2EntityLifecycleActions } from "@/app/argus/v2/components/V2EntityLifecycleActions";
import { V2DayPicker } from "@/app/argus/v2/components/V2DayPicker";
import { V2IntelHelpLink } from "@/app/argus/v2/components/V2IntelHelpLink";
import { V2Badge } from "../../../components/v2-ui";
import type {
  V2NetworkBrowseCard,
  V2NetworkBrowseInsight,
  V2NetworkBrowseStatus,
  V2NetworkBrowseSummary,
  V2NetworkSmartView,
} from "@/lib/argus/v2/network-browse-utils";
import {
  applyNetworkSmartView,
  normalizeNetworkBrowseStatus,
  smartViewCount,
} from "@/lib/argus/v2/network-browse-utils";
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
import { NetworkPanelProvider } from "@/app/argus/v2/network/components/NetworkPanelProvider";
import { NetworkPanelButton } from "@/app/argus/v2/network/components/NetworkPanelButton";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import type { NetworkPanelPackage } from "@/lib/argus/network-ai-mechanics";

const ORDER_SCOPE = "network";
const COLUMN_SCOPE = "network:columns";
const BOARD_COLUMNS: V2NetworkBrowseStatus[] = ["Active", "Dormant", "Archived"];

function badgeTone(tone: V2NetworkBrowseCard["statusTone"]): "default" | "green" | "blue" | "amber" {
  return tone === "blue" ? "default" : tone;
}

const STATUS_TABS: { key: V2NetworkBrowseStatus | "all" | "hot"; label: string }[] = [
  { key: "all", label: "All People" },
  { key: "Active", label: "Active" },
  { key: "Dormant", label: "Dormant" },
  { key: "hot", label: "Hot" },
  { key: "Archived", label: "Archived" },
];

const SMART_VIEWS: { key: V2NetworkSmartView; label: string; description: string }[] = [
  { key: "hot", label: "Hot relationships", description: "Recent + denser evidence (Affinity-style priority)" },
  { key: "key-influencers", label: "Key influencers", description: "Strong ties with shared project history" },
  { key: "decision-makers", label: "Decision makers", description: "Roles and topics tied to authority" },
  { key: "technical-experts", label: "Technical experts", description: "Capability tags from evidence" },
  { key: "recent-activity", label: "Recent activity", description: "Active relationships right now" },
  { key: "high-value-network", label: "High evidence network", description: "Shared projects and denser linked evidence" },
  { key: "dormant", label: "Dormant relationships", description: "Worth revisiting when timing is right" },
];

function SummaryPill({
  label,
  value,
  sub,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `rounded-xl border px-4 py-3 text-left transition ${
    active
      ? "border-violet-500/40 bg-violet-500/10"
      : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700"
  }`;

  const content = (
    <>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-50">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-zinc-600">{sub}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function StatusDonut({ counts, total }: { counts: Record<V2NetworkBrowseStatus, number>; total: number }) {
  if (total === 0) {
    return (
      <div className="flex h-28 items-center justify-center text-xs text-zinc-600">No people yet</div>
    );
  }

  const segments: { status: V2NetworkBrowseStatus; color: string }[] = [
    { status: "Active", color: "#34d399" },
    { status: "Dormant", color: "#fbbf24" },
    { status: "Archived", color: "#a1a1aa" },
  ];

  let offset = 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 88 88" className="h-24 w-24 shrink-0" aria-hidden>
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#27272a" strokeWidth="10" />
        {segments.map(({ status, color }) => {
          const value = counts[status];
          if (value === 0) return null;
          const dash = (value / total) * circumference;
          const el = (
            <circle
              key={status}
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 44 44)"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <ul className="space-y-1 text-xs text-zinc-500">
        {segments.map(({ status, color }) => (
          <li key={status} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {status} ({counts[status]})
          </li>
        ))}
      </ul>
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function NetworkLastContactPicker({
  personId,
  compact = false,
}: {
  personId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso);
  const [error, setError] = useState<string | null>(null);

  function save(nextDate: string) {
    setError(null);
    startTransition(async () => {
      const result = await recordNetworkLastContactAction(personId, nextDate);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDate(nextDate);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div
      className="relative"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        title="Update last contact"
        aria-label="Update last contact date"
        disabled={pending}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const today = todayIso();
          setDate(today);
          setOpen((value) => !value);
        }}
        className={`rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-violet-300 disabled:opacity-40 ${
          compact ? "p-1 text-sm" : "p-1 text-base"
        }`}
      >
        📅
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-[15.5rem] rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Last contact</p>
          <V2DayPicker
            value={date}
            onChange={setDate}
            onSelectDay={save}
            disabled={pending}
          />
          {pending ? <p className="mt-2 text-center text-[10px] text-zinc-500">Saving…</p> : null}
          {error ? <p className="mt-1 text-[10px] text-red-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function PersonCard({
  card,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
}: {
  card: V2NetworkBrowseCard;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragOver: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
}) {
  return (
    <div
      className={`group relative rounded-2xl border bg-zinc-900/50 transition ${
        isDropTarget ? "border-violet-400/60" : "border-zinc-800/80 hover:border-violet-500/40 hover:bg-zinc-900/80"
      }`}
      onDragOver={(event) => onDragOver(event, card.id)}
      onDrop={(event) => onDrop(event, card.id)}
    >
      <button
        type="button"
        draggable
        onDragStart={(event) => onDragStart(event, card.id)}
        onDragEnd={onDragEnd}
        className="absolute left-3 top-3 z-[2] cursor-grab rounded-md px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing"
        aria-label={`Move ${card.name}`}
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <Link
        href={card.href}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`View ${card.name}`}
      />
      <div className="relative z-10 pointer-events-none p-4 pl-10">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/50 to-zinc-800 text-sm font-bold text-violet-100 ring-2 ring-zinc-900">
            {card.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate font-bold text-zinc-50 group-hover:text-violet-100">{card.name}</h2>
                <p className="truncate text-sm text-zinc-400">{card.role}</p>
                {card.organization ? (
                  <p className="truncate text-xs text-zinc-500">{card.organization}</p>
                ) : null}
              </div>
              <div className="relative z-20 flex shrink-0 items-center gap-1 pointer-events-auto">
                <V2EntityLifecycleActions
                  entityId={card.id}
                  entityName={card.name}
                  entityKind="person"
                  lifecycleStatus={card.lifecycleStatus}
                  href={card.href}
                  returnTo="/argus/v2/browse/network"
                  variant="menu"
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
              {card.isHot ? (
                <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-medium text-rose-200 ring-1 ring-rose-500/30">
                  Hot
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {card.expertise.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {card.expertise.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-[10px] text-zinc-600">Expertise will emerge from tagged topics</p>
        )}

        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-zinc-600">Last interaction</span>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">{card.lastInteraction.timeLabel}</span>
            <div className="relative z-20 pointer-events-auto">
              <NetworkLastContactPicker personId={card.id} />
            </div>
          </div>
        </div>
        <p className="mb-3 truncate text-xs text-zinc-500">{card.lastInteraction.label}</p>

        {card.status === "Dormant" ? (
          <p className="mb-3 text-[11px] leading-snug text-amber-200/90">
            Quiet relationship — open the contact to see follow-ups and last evidence.
          </p>
        ) : null}

        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="text-zinc-600">Relationship since</span>
          <span className="text-zinc-400">{card.relationshipSince}</span>
        </div>

        <div className="flex justify-around border-t border-zinc-800/80 pt-3 text-center text-xs text-zinc-500">
          <span>
            <span className="block font-semibold text-violet-300">{card.metrics.emails}</span>
            Emails
          </span>
          <span>
            <span className="block font-semibold text-violet-300">{card.metrics.topics}</span>
            Topics
          </span>
          <span>
            <span className="block font-semibold text-violet-300">{card.metrics.events}</span>
            Events
          </span>
        </div>
      </div>
    </div>
  );
}

function PersonListRow({
  card,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
}: {
  card: V2NetworkBrowseCard;
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
      <Link
        href={card.href}
        className="relative z-0 flex min-w-0 flex-1 items-center gap-4 px-2 py-3 sm:px-4"
        aria-label={`View ${card.name}`}
      >
        <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-200 pointer-events-none">
          {card.initials}
        </span>
        <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-zinc-100">{card.name}</p>
            <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {card.role}
            {card.organization ? ` · ${card.organization}` : ""} · {card.lastInteraction.timeLabel}
          </p>
        </div>
      </Link>
      <div className="relative z-20 flex shrink-0 items-center gap-1 pr-3">
        <NetworkLastContactPicker personId={card.id} compact />
        <V2EntityLifecycleActions
          entityId={card.id}
          entityName={card.name}
          entityKind="person"
          lifecycleStatus={card.lifecycleStatus}
          href={card.href}
          returnTo="/argus/v2/browse/network"
          variant="menu"
        />
      </div>
    </div>
  );
}

function PersonBoardCard({
  card,
  onDragStart,
  onDragEnd,
}: {
  card: V2NetworkBrowseCard;
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
          {card.organization ?? card.role} · {card.lastInteraction.timeLabel}
        </p>
      </Link>
    </div>
  );
}

function NetworkInsightsSidebar({
  summary,
  insights,
}: {
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
}) {
  return (
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-6 space-y-4">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Network at a glance</h2>
          <div className="mt-4">
            <StatusDonut counts={insights.statusCounts} total={summary.total} />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Top organizations</h2>
          {insights.topOrganizations.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-600">Link people to organizations to see clusters.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {insights.topOrganizations.map((row) => (
                <li key={row.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate text-zinc-400">{row.name}</span>
                    <span className="tabular-nums text-zinc-600">{row.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{
                        width: `${Math.round((row.count / Math.max(summary.total, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Needs a touch</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-amber-200/90">{summary.needsTouch}</p>
          <p className="mt-1 text-xs text-zinc-600">
            Dormant — quiet relationships derived from last evidence (auto; not a score)
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Recent interactions</h2>
          <ul className="mt-3 space-y-3">
            {insights.recentInteractions.map((item) => (
              <li key={`${item.personName}-${item.sortIso}`} className="text-xs">
                <p className="font-medium text-zinc-300">{item.personName}</p>
                <p className="truncate text-zinc-500">{item.label}</p>
                <p className="text-zinc-600">{item.timeLabel}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

export function V2NetworkBrowserShell({
  cards,
  summary,
  insights,
  panelPackage,
  snapshotItems,
}: {
  cards: V2NetworkBrowseCard[];
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
  panelPackage?: NetworkPanelPackage;
  /** @deprecated Prefer panelPackage */
  snapshotItems?: SnapshotMenuItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgScope = searchParams.get("org")?.trim() || undefined;
  const scopedCards = useMemo(
    () => (orgScope ? cards.filter((c) => c.organizationId === orgScope) : cards),
    [cards, orgScope]
  );
  const [view, setViewState] = useState<BrowseLayoutView>("grid");
  const [statusTab, setStatusTabState] = useState<V2NetworkBrowseStatus | "all" | "hot">("all");
  const [smartView, setSmartView] = useState<V2NetworkSmartView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [columnOverrides, setColumnOverrides] = useState<Record<string, V2NetworkBrowseStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOrder(readBrowseCardOrder(ORDER_SCOPE));
    try {
      const raw = localStorage.getItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        const migrated = Object.fromEntries(
          Object.entries(parsed).map(([id, status]) => {
            const next = normalizeNetworkBrowseStatus(status);
            return [id, next && next !== "all" ? next : "Active"];
          })
        ) as Record<string, V2NetworkBrowseStatus>;
        setColumnOverrides(migrated);
      }
    } catch {
      /* ignore */
    }
    const prefs = readBrowseViewPrefs(ORDER_SCOPE);
    if (prefs.view) setViewState(prefs.view);
    if (prefs.status === "hot") setStatusTabState("hot");
    else {
      const next = normalizeNetworkBrowseStatus(prefs.status);
      if (next) setStatusTabState(next);
    }
  }, []);

  function setView(next: BrowseLayoutView) {
    setViewState(next);
    writeBrowseViewPrefs(ORDER_SCOPE, { view: next });
  }

  function setStatusTab(next: V2NetworkBrowseStatus | "all" | "hot") {
    setStatusTabState(next);
    writeBrowseViewPrefs(ORDER_SCOPE, { status: next });
  }

  function persistOrder(next: string[]) {
    setOrder(next);
    writeBrowseCardOrder(ORDER_SCOPE, next);
  }

  function persistColumns(next: Record<string, V2NetworkBrowseStatus>) {
    setColumnOverrides(next);
    try {
      localStorage.setItem(`argus-v2-browse-columns:${COLUMN_SCOPE}`, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }

  const sorted = useMemo(() => applyBrowseOrder(scopedCards, order), [scopedCards, order]);

  const filtered = useMemo(() => {
    let rows = sorted;
    if (statusTab === "hot") rows = rows.filter((c) => c.isHot);
    else if (statusTab !== "all") rows = rows.filter((c) => c.status === statusTab);
    if (smartView !== "all") rows = applyNetworkSmartView(rows, smartView);
    const q = searchQuery.trim();
    if (q) {
      rows = rows.filter((c) =>
        textMatchesBrowseQuery(q, [
          c.name,
          c.role,
          c.organization,
          c.status,
          ...c.expertise,
        ])
      );
    }
    return rows;
  }, [sorted, statusTab, smartView, searchQuery]);

  const boardGroups = useMemo(() => {
    const groups: Record<V2NetworkBrowseStatus, V2NetworkBrowseCard[]> = {
      Active: [],
      Dormant: [],
      Archived: [],
    };
    const q = searchQuery.trim();
    const boardSource = q
      ? sorted.filter((c) =>
          textMatchesBrowseQuery(q, [
            c.name,
            c.role,
            c.organization,
            c.status,
            ...c.expertise,
          ])
        )
      : sorted;
    for (const card of boardSource) {
      const status = columnOverrides[card.id] ?? card.status;
      groups[status].push(card);
    }
    return groups;
  }, [sorted, columnOverrides, searchQuery]);

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
    column: V2NetworkBrowseStatus,
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
        fd.set("returnTo", "/argus/v2/browse/network");
        fd.set("quiet", "1");
        await archiveEntityAction(fd);
        router.refresh();
      });
    } else if (card && column === "Active" && card.status === "Archived") {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("entityId", id);
        fd.set("returnTo", "/argus/v2/browse/network");
        fd.set("quiet", "1");
        await restoreEntityAction(fd);
        router.refresh();
      });
    }
    onDragEnd();
  }

  const tabCount = (key: V2NetworkBrowseStatus | "all" | "hot") => {
    if (key === "all") return scopedCards.length;
    if (key === "hot") return scopedCards.filter((c) => c.isHot).length;
    return scopedCards.filter((c) => c.status === key).length;
  };

  function selectStatusTab(key: V2NetworkBrowseStatus | "hot") {
    setStatusTab(key);
    setSmartView("all");
  }

  return (
    <NetworkPanelProvider panelPackage={panelPackage} snapshotItems={snapshotItems} panelTitle="Network desk">
      <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden">
        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="flex gap-8 px-4 py-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                      ◉
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Network</h1>
                    {isPending ? (
                      <span className="text-xs text-zinc-500">Saving…</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <V2IntelHelpLink topic="browse-network" label="Network" />
                  <NetworkPanelButton />
                  <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
                    {(
                      [
                        ["grid", "▦", "Grid", "Grid · cards"],
                        ["list", "☰", "List", "List · rows"],
                        ["board", "▥", "Manage", "Manage · Active / Dormant / Archived"],
                      ] as const
                    ).map(([id, icon, label, tip]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setView(id)}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                          view === id ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                        aria-label={label}
                        title={tip}
                        aria-pressed={view === id}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <V2CreateEntityButton
                    kind="person"
                    label="+ Person"
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
                  />
                </div>
              </header>

              <div className="mb-3">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search people, companies, roles, skills…"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-4 pr-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                />
              </div>

              {/* Status filters once — chips only (no duplicate Total/Active/… metric cards). */}
              <div className="mb-3 flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusTab(tab.key);
                      setSmartView("all");
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      statusTab === tab.key && smartView === "all"
                        ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
                        : "border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                  >
                    {tab.label} ({tabCount(tab.key)})
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setSummaryOpen((open) => !open)}
                  className="inline-flex max-w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs text-zinc-500 transition hover:text-zinc-300"
                  aria-expanded={summaryOpen}
                >
                  <span className="shrink-0 font-medium text-zinc-600">More metrics</span>
                  <span className="truncate">
                    {summary.organizations} orgs · {summary.projectsTogether} projects ·{" "}
                    {summary.emailsExchanged} emails · {summary.interactionsLogged} interactions
                  </span>
                  <span className="shrink-0 text-[10px] text-violet-400/90">{summaryOpen ? "▲" : "▼"}</span>
                </button>
                {summaryOpen ? (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <SummaryPill label="Organizations" value={summary.organizations} />
                      <SummaryPill label="Projects Together" value={summary.projectsTogether} />
                      <SummaryPill label="Emails Exchanged" value={summary.emailsExchanged} />
                      <SummaryPill label="Interactions Logged" value={summary.interactionsLogged} />
                    </div>
                  </div>
                ) : null}
              </div>

              {scopedCards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
                  <p className="text-sm text-zinc-500">No people in your network yet.</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Add someone and link orgs, projects, topics, or events in one step.
                  </p>
                  <div className="mt-4">
                    <V2CreateEntityButton
                      kind="person"
                      label="+ Person"
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                    />
                  </div>
                </div>
              ) : filtered.length === 0 && view !== "board" ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
                  <p className="text-sm text-zinc-500">No people match this view.</p>
                  <p className="mt-1 text-xs text-zinc-600">Add a person or adjust filters.</p>
                </div>
              ) : view === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filtered.map((card) => (
                    <PersonCard
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
                    <PersonListRow
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
                              <PersonBoardCard
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
                    Showing 1 to {filtered.length} of {filtered.length} people
                  </p>
                </footer>
              ) : null}
            </div>

            <NetworkInsightsSidebar summary={summary} insights={insights} />
          </div>
        </div>

        <section className="shrink-0 border-t border-zinc-800/90 bg-zinc-950/95 px-4 py-2 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSmartOpen((open) => !open)}
            className="inline-flex w-full items-center gap-2 text-left text-xs text-zinc-500 transition hover:text-zinc-300"
            aria-expanded={smartOpen}
          >
            <span className="shrink-0 font-medium text-zinc-600">Quick views</span>
            <span className="truncate text-zinc-500">
              {SMART_VIEWS.map((preset) => preset.label).join(" · ")}
            </span>
            <span className="ml-auto shrink-0 text-[10px] text-violet-400/90">{smartOpen ? "▲" : "▼"}</span>
          </button>
          {smartOpen ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {SMART_VIEWS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setSmartView(preset.key);
                    setStatusTab("all");
                  }}
                  className={`min-w-[140px] shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                    smartView === preset.key
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-xs font-medium text-zinc-200">{preset.label}</p>
                  <p className="text-[10px] tabular-nums text-violet-300">
                    {smartViewCount(cards, preset.key)} people
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </NetworkPanelProvider>
  );
}
