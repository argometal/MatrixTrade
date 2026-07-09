"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { V2_ENTITY_TABS, type V2EntityRow, type V2EntityTab } from "@/lib/argus/v2/loaders";
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
  if (targetTab === "organizations") params.delete("tab");
  else params.set("tab", targetTab);
  const query = params.toString();
  return query ? `/argus/v2?${query}` : "/argus/v2";
}

const BROWSE_HREFS: Record<V2EntityTab, string> = {
  organizations: "/argus/v2/browse/organizations",
  projects: "/argus/v2/browse/projects",
  people: "/argus/v2/browse/network",
  topics: "/argus/v2/browse/topics",
  events: "/argus/v2/browse/events",
};

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

function bucketEntityRows(rows: V2EntityRow[], today: string) {
  const active: V2EntityRow[] = [];
  const recent: V2EntityRow[] = [];
  const quiet: V2EntityRow[] = [];

  for (const row of rows) {
    if (row.active) {
      active.push(row);
      continue;
    }
    if (!row.lastSort) {
      quiet.push(row);
      continue;
    }
    const day = row.lastSort.slice(0, 10);
    const diff = Math.floor(
      (Date.parse(`${today}T12:00:00`) - Date.parse(`${day}T12:00:00`)) / 86400000
    );
    if (diff > 0 && diff < 7) {
      recent.push(row);
    } else {
      quiet.push(row);
    }
  }

  return { active, recent, quiet };
}

function EntityCard({ row, tab }: { row: V2EntityRow; tab: V2EntityTab }) {
  const metaLabel = thirdColumnLabel(tab);

  return (
    <Link
      href={row.href}
      className="group block rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:border-violet-500/40 hover:bg-zinc-900/80"
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
  );
}

function EntityBoardCard({ row, tab }: { row: V2EntityRow; tab: V2EntityTab }) {
  const metaLabel = thirdColumnLabel(tab);

  return (
    <Link
      href={row.href}
      className="group block cursor-grab rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 shadow-sm transition hover:border-violet-500/35 hover:bg-zinc-900/80 active:cursor-grabbing"
    >
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
  );
}

function EntityBoard({ rows, tab }: { rows: V2EntityRow[]; tab: V2EntityTab }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const columns = useMemo(() => bucketEntityRows(rows, today), [rows, today]);

  const columnDefs = [
    { id: "active" as const, title: "Active", subtitle: "Today", rows: columns.active },
    { id: "recent" as const, title: "Recent", subtitle: "This week", rows: columns.recent },
    { id: "quiet" as const, title: "Quiet", subtitle: "Older / none", rows: columns.quiet },
  ];

  return (
    <div className="argus-v2-scroll flex gap-4 overflow-x-auto pb-2">
      {columnDefs.map((column) => (
        <div
          key={column.id}
          className="flex w-72 shrink-0 flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/30"
        >
          <div className="border-b border-zinc-800/80 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-200">{column.title}</h3>
            <p className="text-[11px] text-zinc-600">
              {column.subtitle} · {column.rows.length}
            </p>
          </div>
          <div className="space-y-2 p-3">
            {column.rows.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-zinc-600">No entities</p>
            ) : (
              column.rows.map((row) => <EntityBoardCard key={row.id} row={row} tab={tab} />)
            )}
          </div>
        </div>
      ))}
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
}: {
  tab: V2EntityTab;
  rows: V2EntityRow[];
  primary?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const layout = parseV2EntityLayout(searchParams.get("layout"));

  function setLayout(next: V2EntityLayout) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") params.delete("layout");
    else params.set("layout", next);
    const query = params.toString();
    router.replace(query ? `/argus/v2?${query}` : "/argus/v2");
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
        <V2EntityTableBody tab={tab} rows={rows} primary={primary} />
      ) : layout === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <EntityCard key={row.id} row={row} tab={tab} />
          ))}
        </div>
      ) : (
        <EntityBoard rows={rows} tab={tab} />
      )}

      {rows.length > 0 ? (
        <div
          className={`flex items-center justify-between gap-3 border-t border-zinc-800/80 ${primary ? "mt-4 pt-4" : "mt-3 pt-3"}`}
        >
          <p className="text-xs text-zinc-600">
            Showing {rows.length} {TAB_LABELS[tab].toLowerCase()}
          </p>
          <Link href={BROWSE_HREFS[tab]} className="text-xs font-medium text-violet-400 hover:text-violet-300">
            Browse all →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
