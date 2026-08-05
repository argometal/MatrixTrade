"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { V2_ENTITY_TABS, type V2EntityRow, type V2EntityTab } from "@/lib/argus/v2/loaders";
import {
  applyEntityOrder,
  placeEntityInOrder,
  readEntityViewPrefs,
  writeEntityViewPrefs,
  type EntityBoardColumnId,
  type EntityViewPrefs,
} from "@/lib/argus/v2/entity-view-prefs";
import { V2EntityTableBody } from "./V2EntityTable";

export type V2EntityLayout = "list" | "cards" | "board";

const TAB_LABELS: Record<V2EntityTab, string> = {
  organizations: "Organizations",
  projects: "Projects",
  people: "People",
  topics: "Topics",
  events: "Events",
};

function buildHomeEntityTabHref(targetTab: V2EntityTab, searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("view", "browse");
  if (targetTab === "organizations") params.delete("tab");
  else params.set("tab", targetTab);
  const query = params.toString();
  return query ? `/argus/v2?${query}` : "/argus/v2?view=browse";
}

export function parseV2EntityLayout(value: string | null | undefined): V2EntityLayout {
  if (value === "cards" || value === "board") return value;
  return "list";
}

function thirdColumnLabel(tab: V2EntityTab): string {
  return tab === "people" ? "Role" : tab === "topics" || tab === "events" ? "Links" : "People";
}

function thirdColumnValue(tab: V2EntityTab, row: V2EntityRow): string | number {
  if (tab === "people") return row.type;
  return row.people || "—";
}

function activityBucket(row: V2EntityRow, today: string): EntityBoardColumnId {
  if (row.active) return "active";
  if (!row.lastSort) return "quiet";
  const day = row.lastSort.slice(0, 10);
  const diff = Math.floor(
    (Date.parse(`${today}T12:00:00`) - Date.parse(`${day}T12:00:00`)) / 86400000
  );
  if (diff > 0 && diff < 7) return "recent";
  return "quiet";
}

function bucketEntityRows(
  rows: V2EntityRow[],
  today: string,
  columnById: Record<string, EntityBoardColumnId>
) {
  const active: V2EntityRow[] = [];
  const recent: V2EntityRow[] = [];
  const quiet: V2EntityRow[] = [];

  for (const row of rows) {
    const column = columnById[row.id] ?? activityBucket(row, today);
    if (column === "active") active.push(row);
    else if (column === "recent") recent.push(row);
    else quiet.push(row);
  }

  return { active, recent, quiet };
}

function EntityCard({
  row,
  tab,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget,
}: {
  row: V2EntityRow;
  tab: V2EntityTab;
  draggable: boolean;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragOver: (event: DragEvent, id: string) => void;
  onDrop: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
}) {
  const metaLabel = thirdColumnLabel(tab);

  return (
    <div
      className={`relative rounded-2xl border bg-zinc-900/50 transition ${
        isDropTarget ? "border-violet-400/60" : "border-zinc-800/80 hover:border-violet-500/40"
      }`}
      onDragOver={(event) => onDragOver(event, row.id)}
      onDrop={(event) => onDrop(event, row.id)}
    >
      <button
        type="button"
        draggable={draggable}
        onDragStart={(event) => onDragStart(event, row.id)}
        onDragEnd={onDragEnd}
        className="absolute left-2 top-2 z-[1] cursor-grab rounded-md px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing"
        aria-label={`Move ${row.name}`}
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <Link
        href={row.href}
        className="group block p-4 pl-9 hover:bg-zinc-900/80"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-100 group-hover:text-violet-100">{row.name}</h3>
          {row.active ? (
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          ) : null}
        </div>
        <p className="mt-1 text-xs text-zinc-500">{row.type}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">
          <span>
            {metaLabel}: <span className="tabular-nums text-zinc-400">{thirdColumnValue(tab, row)}</span>
          </span>
          <span className="shrink-0">{row.last}</span>
        </div>
      </Link>
    </div>
  );
}

function EntityBoardCard({
  row,
  tab,
  onDragStart,
  onDragEnd,
}: {
  row: V2EntityRow;
  tab: V2EntityTab;
  onDragStart: (event: DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const metaLabel = thirdColumnLabel(tab);

  return (
    <div className="group flex gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2 shadow-sm transition hover:border-violet-500/35 hover:bg-zinc-900/80">
      <button
        type="button"
        draggable
        onDragStart={(event) => onDragStart(event, row.id)}
        onDragEnd={onDragEnd}
        className="mt-0.5 cursor-grab self-start rounded px-1 text-[10px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing"
        aria-label={`Move ${row.name}`}
        title="Drag to another column or reorder"
      >
        ⋮⋮
      </button>
      <Link href={row.href} className="min-w-0 flex-1 py-1 pr-1">
        <p className="font-medium text-zinc-100 group-hover:text-violet-100">{row.name}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{row.type}</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-zinc-600">
          <span>
            {metaLabel}: {thirdColumnValue(tab, row)}
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-500">
            {row.active ? <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden /> : null}
            {row.last}
          </span>
        </div>
      </Link>
    </div>
  );
}

function EntityBoard({
  rows,
  tab,
  prefs,
  onPrefsChange,
}: {
  rows: V2EntityRow[];
  tab: V2EntityTab;
  prefs: EntityViewPrefs;
  onPrefsChange: (next: EntityViewPrefs) => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const ordered = useMemo(
    () => applyEntityOrder(rows, prefs.orderByTab[tab]),
    [rows, prefs.orderByTab, tab]
  );
  const columns = useMemo(
    () => bucketEntityRows(ordered, today, prefs.columnById),
    [ordered, today, prefs.columnById]
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    column: EntityBoardColumnId;
    beforeId: string | null;
  } | null>(null);

  const columnDefs = [
    { id: "active" as const, title: "Active", subtitle: "Today / pinned here", rows: columns.active },
    { id: "recent" as const, title: "Recent", subtitle: "This week / pinned here", rows: columns.recent },
    { id: "quiet" as const, title: "Quiet", subtitle: "Older / pinned here", rows: columns.quiet },
  ];

  function onDragStart(event: DragEvent, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function onDragOverColumn(event: DragEvent, column: EntityBoardColumnId, beforeId: string | null) {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({ column, beforeId });
  }

  function onDropColumn(event: DragEvent, column: EntityBoardColumnId, beforeId: string | null) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    if (!id) return;
    const knownIds = rows.map((row) => row.id);
    const nextOrder = placeEntityInOrder(prefs.orderByTab[tab], id, beforeId, knownIds);
    onPrefsChange({
      ...prefs,
      orderByTab: { ...prefs.orderByTab, [tab]: nextOrder },
      columnById: { ...prefs.columnById, [id]: column },
    });
    setDraggingId(null);
    setDropTarget(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-600">
        Drag ⋮⋮ to move cards onto a column label (Active / Recent / Quiet). Placement is saved on this
        device.
      </p>
      <div className="argus-v2-scroll flex gap-4 overflow-x-auto pb-2">
        {columnDefs.map((column) => (
          <div
            key={column.id}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-zinc-900/30 ${
              dropTarget?.column === column.id && dropTarget.beforeId === null && !column.rows.length
                ? "border-violet-400/50"
                : "border-zinc-800/80"
            }`}
            onDragOver={(event) => onDragOverColumn(event, column.id, null)}
            onDrop={(event) => onDropColumn(event, column.id, null)}
          >
            <div className="border-b border-zinc-800/80 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-200">{column.title}</h3>
              <p className="text-[11px] text-zinc-600">
                {column.subtitle} · {column.rows.length}
              </p>
            </div>
            <div className="min-h-[6rem] space-y-2 p-3">
              {column.rows.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-zinc-600">Drop cards here</p>
              ) : (
                column.rows.map((row) => (
                  <div
                    key={row.id}
                    className={
                      dropTarget?.column === column.id && dropTarget.beforeId === row.id
                        ? "rounded-xl ring-2 ring-violet-400/40"
                        : draggingId === row.id
                          ? "opacity-50"
                          : ""
                    }
                    onDragOver={(event) => onDragOverColumn(event, column.id, row.id)}
                    onDrop={(event) => onDropColumn(event, column.id, row.id)}
                  >
                    <EntityBoardCard
                      row={row}
                      tab={tab}
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
    </div>
  );
}

function LayoutToggle({
  layout,
  onChange,
}: {
  layout: V2EntityLayout;
  onChange: (layout: V2EntityLayout) => void;
}) {
  const options: { id: V2EntityLayout; label: string; icon: string }[] = [
    { id: "list", label: "List view", icon: "☰" },
    { id: "cards", label: "Cards view", icon: "▦" },
    { id: "board", label: "Board view", icon: "▥" },
  ];

  return (
    <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
            layout === option.id ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
          }`}
          aria-label={option.label}
          aria-pressed={layout === option.id}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

export function V2EntityViewer({
  tab,
  rows,
  primary = false,
  basePath = "/argus/v2",
}: {
  tab: V2EntityTab;
  rows: V2EntityRow[];
  primary?: boolean;
  /** Path used when rewriting layout / tab query params. */
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const layout = parseV2EntityLayout(searchParams.get("layout"));
  const [prefs, setPrefs] = useState<EntityViewPrefs>({ orderByTab: {}, columnById: {} });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(readEntityViewPrefs());
  }, []);

  function updatePrefs(next: EntityViewPrefs) {
    setPrefs(next);
    writeEntityViewPrefs(next);
  }

  const orderedRows = useMemo(
    () => applyEntityOrder(rows, prefs.orderByTab[tab]),
    [rows, prefs.orderByTab, tab]
  );

  function setLayout(next: V2EntityLayout) {
    const params = new URLSearchParams(searchParams.toString());
    if (basePath === "/argus/v2") params.set("view", "browse");
    if (next === "list") params.delete("layout");
    else params.set("layout", next);
    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  function onCardDragStart(event: DragEvent, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function onCardDragOver(event: DragEvent, id: string) {
    if (!draggingId || draggingId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropBeforeId(id);
  }

  function onCardDrop(event: DragEvent, beforeId: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    if (!id || id === beforeId) {
      setDraggingId(null);
      setDropBeforeId(null);
      return;
    }
    const knownIds = rows.map((row) => row.id);
    const nextOrder = placeEntityInOrder(prefs.orderByTab[tab], id, beforeId, knownIds);
    updatePrefs({
      ...prefs,
      orderByTab: { ...prefs.orderByTab, [tab]: nextOrder },
    });
    setDraggingId(null);
    setDropBeforeId(null);
  }

  function onCardDragEnd() {
    setDraggingId(null);
    setDropBeforeId(null);
  }

  return (
    <div>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${primary ? "mb-5" : "mb-3"}`}>
        <div className="flex flex-wrap gap-2">
          {V2_ENTITY_TABS.map((t) => (
            <Link
              key={t}
              href={buildHomeEntityTabHref(t, searchParams)}
              className={`rounded-xl border px-3 py-1.5 font-medium transition ${
                primary ? "text-xs" : "text-[11px]"
              } ${
                t === tab
                  ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                  : "border-transparent text-zinc-600 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-300"
              }`}
            >
              {TAB_LABELS[t]}
            </Link>
          ))}
        </div>
        <LayoutToggle layout={layout} onChange={setLayout} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No {TAB_LABELS[tab].toLowerCase()} yet.</p>
      ) : layout === "list" ? (
        <V2EntityTableBody tab={tab} rows={orderedRows} primary={primary} />
      ) : layout === "cards" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600">
            Drag ⋮⋮ to reorder {TAB_LABELS[tab].toLowerCase()} cards on this label. Order is saved on
            this device.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {orderedRows.map((row) => (
              <EntityCard
                key={row.id}
                row={row}
                tab={tab}
                draggable
                onDragStart={onCardDragStart}
                onDragOver={onCardDragOver}
                onDrop={onCardDrop}
                onDragEnd={onCardDragEnd}
                isDropTarget={dropBeforeId === row.id && draggingId !== row.id}
              />
            ))}
          </div>
        </div>
      ) : (
        <EntityBoard rows={rows} tab={tab} prefs={prefs} onPrefsChange={updatePrefs} />
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
        <Link href="/argus/v2/browse/organizations" className="underline hover:text-zinc-300">
          Full Organizations browser
        </Link>
        <Link href="/argus/v2/browse/projects" className="underline hover:text-zinc-300">
          Full Projects browser
        </Link>
        <Link href="/argus/v2/browse/topics" className="underline hover:text-zinc-300">
          Topics
        </Link>
        <Link href="/argus/v2/browse/events" className="underline hover:text-zinc-300">
          Events
        </Link>
      </div>
    </div>
  );
}
