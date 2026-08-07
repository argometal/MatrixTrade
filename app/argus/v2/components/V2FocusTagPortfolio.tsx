"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction } from "@/app/argus/actions";
import type { V2FocusTagStat } from "@/lib/argus/v2/loaders";
import { resolveBubblePositions } from "@/lib/argus/v2/intelligence-viz";
import { SIGNAL_TAGS } from "@/lib/argus/ux-copy";

type FocusFilter = "focus" | "hot" | "stale" | "quiet" | "patterns" | "all";

const FILTERS: { id: FocusFilter; label: string; title: string }[] = [
  { id: "focus", label: "Focus", title: "Flagged Focus Tags only" },
  { id: "hot", label: "Hot", title: "Used in the last 30 days" },
  { id: "stale", label: "Stale", title: "No activity in the last 90 days" },
  { id: "quiet", label: "Quiet", title: "Flagged but never used on evidence" },
  { id: "patterns", label: "Patterns", title: "Recurring evidence Tags (Pattern floor)" },
  { id: "all", label: "Universe", title: "All Tags in the journal universe" },
];

function filterRows(rows: V2FocusTagStat[], filter: FocusFilter): V2FocusTagStat[] {
  switch (filter) {
    case "focus":
      return rows.filter((r) => r.isFocus);
    case "hot":
      return rows.filter((r) => r.recurrence30d > 0);
    case "stale":
      return rows.filter((r) => r.count > 0 && r.recencyScore === 0);
    case "quiet":
      return rows.filter((r) => r.isFocus && r.count === 0);
    case "patterns":
      return rows.filter((r) => r.isPattern);
    case "all":
      return rows;
  }
}

function MiniMatrix({ rows }: { rows: V2FocusTagStat[] }) {
  const layout = useMemo(() => {
    const plot = rows.filter((r) => r.isFocus || r.isPattern).slice(0, 24);
    if (plot.length === 0) return [];
    const maxEvidence = Math.max(...plot.map((r) => r.count), 1);
    const byName = new Map(plot.map((row) => [row.name, row]));
    const raw = plot.map((row) => ({
      id: row.name,
      x: 10 + row.recurrenceScore * 86,
      y: 48 - row.recencyScore * 40,
      r: 1.4 + Math.sqrt(row.count / maxEvidence) * 2.4,
    }));
    const resolved = resolveBubblePositions(
      raw,
      { minX: 10, maxX: 96, minY: 8, maxY: 48 },
      { iterations: 8, padding: 0.25, jitter: 1.1 }
    );
    return resolved
      .map((p) => ({ point: p, row: byName.get(p.id)! }))
      .filter((x) => x.row)
      .sort((a, b) => a.point.r - b.point.r);
  }, [rows]);

  if (layout.length === 0) return null;

  return (
    <svg
      viewBox="0 0 100 56"
      className="mb-3 h-28 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60"
      role="img"
      aria-label="Tag universe portfolio — recency vertical, recurrence horizontal"
    >
      <text x="50" y="54" textAnchor="middle" fill="rgb(113, 113, 122)" fontSize="3.2">
        Recurrence (30d) →
      </text>
      <text
        x="3"
        y="28"
        textAnchor="middle"
        fill="rgb(113, 113, 122)"
        fontSize="3.2"
        transform="rotate(-90 3 28)"
      >
        Recency →
      </text>
      {[0.25, 0.5, 0.75].map((pct) => (
        <g key={pct}>
          <line
            x1={10}
            y1={48 - pct * 40}
            x2={96}
            y2={48 - pct * 40}
            stroke="rgba(63, 63, 70, 0.35)"
            strokeWidth={0.25}
          />
          <line
            x1={10 + pct * 86}
            y1={8}
            x2={10 + pct * 86}
            y2={48}
            stroke="rgba(63, 63, 70, 0.35)"
            strokeWidth={0.25}
          />
        </g>
      ))}
      {layout.map(({ point, row }) => (
        <a key={row.name} href={row.href}>
          <circle
            cx={point.x}
            cy={point.y}
            r={point.r}
            fill={row.isFocus ? "rgb(251, 113, 133)" : "rgb(161, 161, 170)"}
            fillOpacity={0.75}
            stroke={row.isPattern ? "rgb(251, 191, 36)" : "rgb(63, 63, 70)"}
            strokeWidth={row.isPattern ? 0.6 : 0.25}
          />
          <title>
            {row.name} — recency {Math.round(row.recencyScore * 100)}% · {row.recurrence30d} in 30d ·{" "}
            {row.count} total
            {row.isFocus ? " · Focus" : ""}
            {row.isPattern ? " · Pattern" : ""}
          </title>
        </a>
      ))}
    </svg>
  );
}

/** Canonical Tag universe graph + list — Home Intelligence → Tags only (aside duplicate deprecated). */
export function V2FocusTagPortfolio({
  rows,
  initialFocusTags,
  variant: _variant = "universe",
}: {
  rows: V2FocusTagStat[];
  initialFocusTags: string[];
  /** @deprecated aside removed from Home rail — only `universe` is used. */
  variant?: "aside" | "universe";
}) {
  void _variant;
  const router = useRouter();
  const [filter, setFilter] = useState<FocusFilter>("all");
  const [query, setQuery] = useState("");
  const [focusTags, setFocusTags] = useState(initialFocusTags);
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFocusTags(initialFocusTags);
  }, [initialFocusTags]);

  const focusKeySet = useMemo(
    () => new Set(focusTags.map((t) => t.trim().toLowerCase())),
    [focusTags]
  );

  const visible = useMemo(() => {
    const withLiveFocus = rows.map((row) => ({
      ...row,
      isFocus: focusKeySet.has(row.name.trim().toLowerCase()),
    }));
    const filtered = filterRows(withLiveFocus, filter);
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, filter, focusKeySet, query]);

  function toggle(tag: string) {
    setPendingTag(tag);
    startTransition(async () => {
      const result = await toggleSignalTagAction(tag);
      setPendingTag(null);
      if ("error" in result) return;
      setFocusTags(result.signalTags);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Tag universe</p>
          <p className="text-[10px] text-zinc-600">
            Recency × recurrence · Flag to watch · Remove to unflag Focus
          </p>
        </div>
        <p className="text-[10px] text-zinc-600">Notion-style list · Obsidian tag pages on click</p>
      </div>

      <MiniMatrix
        rows={rows.map((r) => ({
          ...r,
          isFocus: focusKeySet.has(r.name.trim().toLowerCase()),
        }))}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter Tags">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={item.title}
                onClick={() => setFilter(item.id)}
                className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                  active
                    ? "border-rose-500/50 bg-rose-950/40 text-rose-200"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <label className="ml-auto block min-w-[10rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Filter tags by name</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tags…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-500">
          {filter === "focus" || filter === "quiet"
            ? SIGNAL_TAGS.empty
            : query
              ? "No tags match this filter."
              : "No tags match this filter."}
        </p>
      ) : (
        <ul
          className="max-h-[min(420px,48vh)] space-y-1 overflow-y-auto"
          aria-label="Tag portfolio list"
        >
          {visible.map((row) => {
            const busy = isPending && pendingTag === row.name;
            const score = Math.round((row.recencyScore * 0.55 + row.recurrenceScore * 0.45) * 100);
            return (
              <li
                key={row.name}
                className="flex items-center gap-2 rounded-lg border border-zinc-800/70 bg-zinc-950/50 px-2 py-1.5"
              >
                <Link href={row.href} className="min-w-0 flex-1 hover:text-zinc-100">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {row.isFocus ? (
                      <span className="text-rose-300" aria-hidden>
                        ⚑
                      </span>
                    ) : null}
                    <span
                      className={`truncate text-xs font-semibold ${
                        row.isFocus ? "text-rose-100" : "text-zinc-300"
                      }`}
                    >
                      {row.name}
                    </span>
                    {row.isPattern ? (
                      <span className="shrink-0 rounded bg-amber-950/50 px-1 py-0.5 text-[9px] font-medium text-amber-300/90 ring-1 ring-amber-500/30">
                        Pattern
                      </span>
                    ) : null}
                    <span className="ml-auto shrink-0 tabular-nums text-[10px] text-zinc-600">
                      {score}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                    {row.count} total · {row.recurrence30d} in 30d ·{" "}
                    {Math.round(row.recencyScore * 100)}% recent
                    {row.lastSeen ? ` · last ${row.lastSeen}` : ""}
                  </p>
                </Link>
                {row.isFocus ? (
                  <button
                    type="button"
                    onClick={() => toggle(row.name)}
                    disabled={busy}
                    className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:border-rose-500/40 hover:text-rose-200 disabled:opacity-40"
                    title={SIGNAL_TAGS.removeAria(row.name)}
                    aria-label={SIGNAL_TAGS.removeAria(row.name)}
                  >
                    {busy ? "…" : "Remove"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(row.name)}
                    disabled={busy}
                    className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/30 px-2 py-1 text-[10px] font-medium text-rose-200 hover:bg-rose-950/50 disabled:opacity-40"
                    title={`Flag ${row.name} as Focus Tag`}
                    aria-label={`Flag ${row.name} as Focus Tag`}
                  >
                    {busy ? "…" : "Flag"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
