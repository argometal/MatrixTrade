"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction } from "@/app/argus/actions";
import type { V2FocusTagStat, V2TagEvidenceContext, V2TagEvidenceEntity } from "@/lib/argus/v2/loaders";
import { signalTagKey } from "@/lib/argus/signal-tags";
import { resolveBubblePositions } from "@/lib/argus/v2/intelligence-viz";
import { SIGNAL_TAGS } from "@/lib/argus/ux-copy";
import { V2Timeline } from "./V2Timeline";

type FocusFilter = "all" | "hot" | "stale" | "patterns" | "focus" | "quiet";

const FILTERS: { id: FocusFilter; label: string; title: string }[] = [
  { id: "all", label: "Universe", title: "All Tags in the journal universe" },
  { id: "hot", label: "Hot", title: "Used in the last 30 days" },
  { id: "patterns", label: "Patterns", title: "Recurring evidence Tags (Pattern floor)" },
  { id: "stale", label: "Stale", title: "No activity in the last 90 days" },
  { id: "focus", label: "Flagged", title: "Flagged Tags only (watchlist)" },
  { id: "quiet", label: "Quiet Flag", title: "Flagged but never used on evidence" },
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

function EntityChipList({
  label,
  items,
}: {
  label: string;
  items: V2TagEvidenceEntity[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tags exploration workspace — Universe graph is primary navigation.
 * Selection explains why the tag exists via existing evidence (no new metrics).
 */
export function V2FocusTagPortfolio({
  rows,
  initialFocusTags,
  evidenceByTag = {},
}: {
  rows: V2FocusTagStat[];
  initialFocusTags: string[];
  evidenceByTag?: Record<string, V2TagEvidenceContext>;
  /** @deprecated aside removed — ignored. */
  variant?: "aside" | "universe";
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FocusFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [focusTags, setFocusTags] = useState(initialFocusTags);
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFocusTags(initialFocusTags);
  }, [initialFocusTags]);

  const focusKeySet = useMemo(
    () => new Set(focusTags.map((t) => signalTagKey(t))),
    [focusTags]
  );

  const visible = useMemo(() => {
    const withLiveFocus = rows.map((row) => ({
      ...row,
      isFocus: focusKeySet.has(signalTagKey(row.name)),
    }));
    const filtered = filterRows(withLiveFocus, filter);
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, filter, focusKeySet, query]);

  const selected = useMemo(() => {
    if (!selectedName) return null;
    return visible.find((r) => r.name === selectedName) ?? rows.find((r) => r.name === selectedName) ?? null;
  }, [selectedName, visible, rows]);

  const selectedKey = selected ? signalTagKey(selected.name) : "";
  const selectedEvidence: V2TagEvidenceContext | null = selectedKey
    ? evidenceByTag[selectedKey] ?? null
    : null;

  const plotLayout = useMemo(() => {
    const plot = visible.slice(0, 64);
    if (plot.length === 0) return [];
    const maxEvidence = Math.max(...plot.map((r) => Math.max(r.count, 1)), 1);
    const byName = new Map(plot.map((row) => [row.name, row]));
    const raw = plot.map((row) => ({
      id: row.name,
      x: 10 + row.recurrenceScore * 86,
      y: 88 - row.recencyScore * 76,
      r: 1.6 + Math.sqrt(Math.max(row.count, 1) / maxEvidence) * 3.2,
    }));
    const resolved = resolveBubblePositions(
      raw,
      { minX: 10, maxX: 96, minY: 10, maxY: 88 },
      { iterations: 10, padding: 0.35, jitter: 1.2 }
    );
    return resolved
      .map((p) => ({ point: p, row: byName.get(p.id)! }))
      .filter((x) => x.row)
      .sort((a, b) => a.point.r - b.point.r);
  }, [visible]);

  function selectTag(name: string) {
    setSelectedName((current) => (current === name ? null : name));
  }

  function toggleFocus(tag: string) {
    setPendingTag(tag);
    startTransition(async () => {
      const result = await toggleSignalTagAction(tag);
      setPendingTag(null);
      if ("error" in result) return;
      setFocusTags(result.signalTags);
      router.refresh();
    });
  }

  const selectedIsFocus = selected ? focusKeySet.has(signalTagKey(selected.name)) : false;
  const focusBusy = isPending && pendingTag === selected?.name;

  return (
    <div className="space-y-4">
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
                    ? item.id === "focus" || item.id === "quiet"
                      ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                      : "border-violet-500/40 bg-violet-950/30 text-violet-200"
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
            placeholder="Find a tag…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none"
          />
        </label>
      </div>

      {/* Priority 1 — Universe is the workspace (Treemap-class height). */}
      <div>
        {plotLayout.length === 0 ? (
          <div className="flex min-h-[min(560px,65vh)] items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
            No tags match this filter. Clear search or switch filter.
          </div>
        ) : (
          <svg
            viewBox="0 0 100 100"
            className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 min-h-[min(560px,65vh)] h-[min(560px,65vh)]"
            role="img"
            aria-label="Tag universe — click a tag to explore its evidence. Recency vertical, recurrence horizontal."
          >
            <text x="50" y="97" textAnchor="middle" fill="rgb(113, 113, 122)" fontSize="2.8">
              Recurrence (30d) →
            </text>
            <text
              x="2.5"
              y="50"
              textAnchor="middle"
              fill="rgb(113, 113, 122)"
              fontSize="2.8"
              transform="rotate(-90 2.5 50)"
            >
              Recency →
            </text>
            {[0.25, 0.5, 0.75].map((pct) => (
              <g key={pct}>
                <line
                  x1={10}
                  y1={88 - pct * 76}
                  x2={96}
                  y2={88 - pct * 76}
                  stroke="rgba(63, 63, 70, 0.35)"
                  strokeWidth={0.25}
                />
                <line
                  x1={10 + pct * 86}
                  y1={10}
                  x2={10 + pct * 86}
                  y2={88}
                  stroke="rgba(63, 63, 70, 0.35)"
                  strokeWidth={0.25}
                />
              </g>
            ))}
            {plotLayout.map(({ point, row }) => {
              const isSelected = selectedName === row.name;
              const showLabel = point.r >= 2.4 || isSelected;
              return (
                <g
                  key={row.name}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${row.name}${row.isFocus ? ", Focus" : ""}${row.isPattern ? ", Pattern" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => selectTag(row.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectTag(row.name);
                    }
                  }}
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? point.r + 0.9 : point.r}
                    fill={row.isFocus ? "rgb(251, 113, 133)" : "rgb(167, 139, 250)"}
                    fillOpacity={isSelected ? 0.95 : 0.72}
                    stroke={
                      isSelected
                        ? "rgb(255, 255, 255)"
                        : row.isPattern
                          ? "rgb(251, 191, 36)"
                          : "rgb(63, 63, 70)"
                    }
                    strokeWidth={isSelected ? 0.85 : row.isPattern ? 0.55 : 0.25}
                    className="transition hover:brightness-125"
                  />
                  {showLabel ? (
                    <text
                      x={point.x}
                      y={point.y + point.r + 2.2}
                      textAnchor="middle"
                      fill={isSelected ? "rgb(244, 244, 245)" : "rgb(161, 161, 170)"}
                      fontSize={isSelected ? 2.6 : 2.2}
                      fontWeight={isSelected ? 600 : 500}
                      pointerEvents="none"
                    >
                      {row.name.length > 16 ? `${row.name.slice(0, 14)}…` : row.name}
                    </text>
                  ) : null}
                  <title>
                    {row.name}
                    {row.isFocus ? " · Focus" : ""}
                    {row.isPattern ? " · Pattern" : ""}
                    {" — click to explore evidence"}
                  </title>
                </g>
              );
            })}
          </svg>
        )}
        <p className="mt-2 text-[10px] text-zinc-500">
          Click a tag to explore evidence · Rose = Focus watchlist · Gold ring = Pattern · Axes are evidence
          windows, not scores
        </p>
      </div>

      {/* Priority 2–3 — Selection transforms the page into evidence explanation. */}
      {!selected ? (
        <div className="rounded-xl border border-dashed border-zinc-800/90 bg-zinc-950/40 px-4 py-6 text-center">
          <p className="text-sm font-medium text-zinc-400">Select a tag in the Universe</p>
          <p className="mt-1 text-xs text-zinc-600">
            The workspace will show the evidence that created it — notes, email, and linked binders.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-violet-500/25 bg-zinc-950/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">
                Why this tag exists
              </p>
              <h3 className="mt-0.5 text-lg font-semibold text-zinc-50">{selected.name}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selected.isPattern ? (
                  <span className="rounded bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90 ring-1 ring-amber-500/30">
                    Pattern
                  </span>
                ) : null}
                {selectedIsFocus ? (
                  <span className="rounded bg-rose-950/50 px-1.5 py-0.5 text-[10px] font-medium text-rose-200 ring-1 ring-rose-500/30">
                    Focus
                  </span>
                ) : null}
                {selected.lastSeen ? (
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    Last seen {selected.lastSeen}
                  </span>
                ) : (
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    No evidence yet
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleFocus(selected.name)}
                disabled={focusBusy}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40 ${
                  selectedIsFocus
                    ? "border-zinc-700 text-zinc-400 hover:border-rose-500/40 hover:text-rose-200"
                    : "border-rose-500/40 bg-rose-950/25 text-rose-200 hover:bg-rose-950/40"
                }`}
                title={
                  selectedIsFocus
                    ? SIGNAL_TAGS.removeAria(selected.name)
                    : `Flag ${selected.name} as Focus Tag`
                }
              >
                {focusBusy ? "…" : selectedIsFocus ? "Unflag Focus" : "Flag Focus"}
              </button>
              <Link
                href={selectedEvidence?.openHref ?? selected.href}
                className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
              >
                Open in Topic / Inbox →
              </Link>
              <button
                type="button"
                onClick={() => setSelectedName(null)}
                className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Evidence that carries this tag
              </p>
              {selectedEvidence && selectedEvidence.evidence.length > 0 ? (
                <V2Timeline entries={selectedEvidence.evidence} compact />
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-4 text-xs text-zinc-500">
                  No notes or email carry this tag yet. Flag Focus only if you want to watch for it.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Binders linked on that evidence
              </p>
              <EntityChipList label="Organizations" items={selectedEvidence?.organizations ?? []} />
              <EntityChipList label="Projects" items={selectedEvidence?.projects ?? []} />
              <EntityChipList label="People" items={selectedEvidence?.people ?? []} />
              <EntityChipList label="Topics" items={selectedEvidence?.topics ?? []} />
              <EntityChipList label="Events" items={selectedEvidence?.events ?? []} />
              {!selectedEvidence ||
              (selectedEvidence.organizations.length === 0 &&
                selectedEvidence.projects.length === 0 &&
                selectedEvidence.people.length === 0 &&
                selectedEvidence.topics.length === 0 &&
                selectedEvidence.events.length === 0) ? (
                <p className="text-xs text-zinc-600">No linked binders on tagged evidence yet.</p>
              ) : null}
            </div>
          </div>

          {/* Contextual roster — filtered peers, not a permanent ranked dashboard. */}
          {visible.length > 1 ? (
            <div className="border-t border-zinc-800/80 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Also in this filter
              </p>
              <ul className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {visible
                  .filter((row) => row.name !== selected.name)
                  .slice(0, 24)
                  .map((row) => (
                    <li key={row.name}>
                      <button
                        type="button"
                        onClick={() => selectTag(row.name)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[11px] text-zinc-400 hover:border-violet-500/40 hover:text-zinc-200"
                      >
                        {row.isFocus ? "⚑ " : ""}
                        {row.name}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
