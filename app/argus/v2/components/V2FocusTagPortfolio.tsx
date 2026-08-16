"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction, renameTagInlineAction } from "@/app/argus/actions";
import { confirmTrackerConvert } from "@/lib/argus/tracker-confirm";
import type {
  V2FocusTagStat,
  V2TagEvidenceContext,
  V2TagEvidenceEntity,
  V2TagRoleBucketSummary,
  V2TagRoleFilter,
} from "@/lib/argus/v2/loaders";
import { filterFocusTagsByRole } from "@/lib/argus/v2/loaders";
import { signalTagKey } from "@/lib/argus/signal-tags";
import { resolveBubblePositions } from "@/lib/argus/v2/intelligence-viz";
import { SIGNAL_TAGS } from "@/lib/argus/ux-copy";
import {
  filterIntelligenceTags,
  type IntelligenceUniverseFilter,
} from "@/lib/argus/v2/intelligence-filters";
import { V2HomeNeighborhoodViewer } from "./V2HomeNeighborhoodViewer";
import { V2IntelHelpLink } from "./V2IntelHelpLink";
import { V2IntelligenceUniverseFilters } from "./V2IntelligenceUniverseFilters";
import { V2TrackerTogglePanel } from "./V2TrackerTogglePanel";
import { V2Timeline } from "./V2Timeline";

const ROLE_FILTERS: { id: V2TagRoleFilter; label: string }[] = [
  { id: "all", label: "All roles" },
  { id: "evidence", label: "Evidence" },
  { id: "topic", label: "Topic" },
  { id: "project", label: "Project" },
  { id: "event", label: "Event" },
  { id: "global", label: "Global" },
];

function pickDefaultNeighborhoodCenter(evidence: V2TagEvidenceContext | null): V2TagEvidenceEntity | null {
  if (!evidence) return null;
  return (
    evidence.organizations[0] ??
    evidence.projects[0] ??
    evidence.topics[0] ??
    evidence.events[0] ??
    evidence.people[0] ??
    null
  );
}

function EntityChipList({
  label,
  items,
  activeId,
  onSelect,
}: {
  label: string;
  items: V2TagEvidenceEntity[];
  activeId?: string | null;
  onSelect?: (item: V2TagEvidenceEntity) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((item) => {
          const selected = activeId === item.id;
          return (
            <li key={item.id} className="flex items-center gap-1">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`inline-flex rounded-lg border px-2 py-1 text-[11px] ${
                    selected
                      ? "border-amber-400/50 bg-amber-950/30 text-amber-100"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
                  }`}
                  title={`Show neighborhood around ${item.name}`}
                >
                  {item.name}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
                >
                  {item.name}
                </Link>
              )}
              <Link
                href={item.href}
                className="text-[10px] text-zinc-600 hover:text-violet-300"
                title={`Open ${item.name}`}
              >
                →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Tags control center — Universe browse + Flag Trackers + binder neighborhood.
 * Role chips (ORDER 001) filter Project / Topic / Event / Global / Evidence.
 */
export function V2FocusTagPortfolio({
  rows,
  initialFocusTags,
  evidenceByTag = {},
  roleBuckets = [],
  filter: filterProp,
  onFilterChange,
}: {
  rows: V2FocusTagStat[];
  initialFocusTags: string[];
  evidenceByTag?: Record<string, V2TagEvidenceContext>;
  /** Home Tags role manager counts (ORDER 001). */
  roleBuckets?: V2TagRoleBucketSummary[];
  /** @deprecated aside removed — ignored. */
  variant?: "aside" | "universe";
  /** When set with onFilterChange, chips hide — Home toolbar owns the filter. */
  filter?: IntelligenceUniverseFilter;
  onFilterChange?: (next: IntelligenceUniverseFilter) => void;
}) {
  const router = useRouter();
  const [localFilter, setLocalFilter] = useState<IntelligenceUniverseFilter>("all");
  const filter = filterProp ?? localFilter;
  const setFilter = onFilterChange ?? setLocalFilter;
  const filterControlled = filterProp != null && onFilterChange != null;
  const [roleFilter, setRoleFilter] = useState<V2TagRoleFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [focusTags, setFocusTags] = useState(initialFocusTags);
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [neighborhoodCenter, setNeighborhoodCenter] = useState<V2TagEvidenceEntity | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFocusTags(initialFocusTags);
  }, [initialFocusTags]);

  useEffect(() => {
    setRenameOpen(false);
    setRenameError(null);
    if (selectedName) setRenameDraft(selectedName);
  }, [selectedName]);

  const focusKeySet = useMemo(
    () => new Set(focusTags.map((t) => signalTagKey(t))),
    [focusTags]
  );

  const roleCountById = useMemo(() => {
    const map = new Map<V2TagRoleFilter, number>();
    map.set("all", rows.length);
    for (const bucket of roleBuckets) {
      map.set(bucket.role, bucket.count);
    }
    return map;
  }, [roleBuckets, rows.length]);

  const trackerRows = useMemo(() => {
    return rows
      .map((row) => ({ ...row, isFocus: focusKeySet.has(signalTagKey(row.name)) }))
      .filter((row) => row.isFocus)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [rows, focusKeySet]);

  const visible = useMemo(() => {
    const withLiveFocus = rows.map((row) => ({
      ...row,
      isFocus: focusKeySet.has(signalTagKey(row.name)),
      roles: row.roles ?? [],
    }));
    const byRole = filterFocusTagsByRole(withLiveFocus, roleFilter);
    const filtered = filterIntelligenceTags(byRole, filter);
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, filter, roleFilter, focusKeySet, query]);

  const selected = useMemo(() => {
    if (!selectedName) return null;
    return visible.find((r) => r.name === selectedName) ?? rows.find((r) => r.name === selectedName) ?? null;
  }, [selectedName, visible, rows]);

  const selectedKey = selected ? signalTagKey(selected.name) : "";
  const selectedEvidence: V2TagEvidenceContext | null = selectedKey
    ? evidenceByTag[selectedKey] ?? null
    : null;

  useEffect(() => {
    if (!selectedName) {
      setNeighborhoodCenter(null);
      return;
    }
    const key = signalTagKey(selectedName);
    const evidence = evidenceByTag[key] ?? null;
    setNeighborhoodCenter(pickDefaultNeighborhoodCenter(evidence));
  }, [selectedName, evidenceByTag]);

  const plotLayout = useMemo(() => {
    // Dot plot: axes encode recurrence × recency. Labels only on hover/select to avoid pile-up.
    const plot = visible.slice(0, 64);
    if (plot.length === 0) return [];
    const maxEvidence = Math.max(...plot.map((r) => Math.max(r.count, 1)), 1);
    const byName = new Map(plot.map((row) => [row.name, row]));
    const raw = plot.map((row) => ({
      id: row.name,
      x: 10 + row.recurrenceScore * 86,
      y: 88 - row.recencyScore * 76,
      r: 1.15 + Math.sqrt(Math.max(row.count, 1) / maxEvidence) * 0.55,
    }));
    const resolved = resolveBubblePositions(
      raw,
      { minX: 10, maxX: 96, minY: 12, maxY: 86 },
      { iterations: 18, padding: 2.4, jitter: 1.1 }
    );
    return resolved
      .map((p) => ({ point: p, row: byName.get(p.id)! }))
      .filter((x) => x.row)
      .sort((a, b) => a.point.r - b.point.r);
  }, [visible]);

  const topByRecurrence = useMemo(
    () =>
      [...visible]
        .sort(
          (a, b) =>
            b.recurrence30d - a.recurrence30d ||
            b.recurrenceScore - a.recurrenceScore ||
            a.name.localeCompare(b.name)
        )
        .slice(0, 8),
    [visible]
  );

  const topByRecency = useMemo(
    () =>
      [...visible]
        .sort(
          (a, b) =>
            b.recencyScore - a.recencyScore ||
            b.recurrence30d - a.recurrence30d ||
            a.name.localeCompare(b.name)
        )
        .slice(0, 8),
    [visible]
  );

  function selectTag(name: string) {
    setSelectedName((current) => (current === name ? null : name));
  }

  function toggleFocus(tag: string) {
    const currentlyFlagged = focusKeySet.has(signalTagKey(tag));
    if (!confirmTrackerConvert(tag, currentlyFlagged)) return;
    setPendingTag(tag);
    startTransition(async () => {
      const result = await toggleSignalTagAction(tag);
      setPendingTag(null);
      if ("error" in result) return;
      setFocusTags(result.signalTags);
      router.refresh();
    });
  }

  function openRename() {
    if (!selected) return;
    setRenameDraft(selected.name);
    setRenameError(null);
    setRenameOpen(true);
  }

  async function submitRename(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const next = renameDraft.trim().replace(/\s+/g, " ");
    if (!next) {
      setRenameError("Enter a tag name.");
      return;
    }
    if (next === selected.name) {
      setRenameOpen(false);
      return;
    }
    const ok = window.confirm(
      `Rename “${selected.name}” to “${next}” everywhere?\n\nUpdates Notes, email Topics, Topic/Project/Event Tags, and Trackers. This is not Flag/Disable.`
    );
    if (!ok) return;
    setRenameBusy(true);
    setRenameError(null);
    const result = await renameTagInlineAction(selected.name, next);
    setRenameBusy(false);
    if ("error" in result) {
      setRenameError(result.error === "empty_tag" ? "Enter a tag name." : "Rename failed.");
      return;
    }
    const oldKey = signalTagKey(result.oldTag);
    setFocusTags((prev) =>
      prev.map((tag) => (signalTagKey(tag) === oldKey ? result.newTag : tag))
    );
    setSelectedName(result.newTag);
    setRenameOpen(false);
    router.refresh();
  }

  const selectedIsFocus = selected ? focusKeySet.has(signalTagKey(selected.name)) : false;
  const focusBusy = isPending && pendingTag === selected?.name;
  const evidenceIntelActive =
    filter === "hot" || filter === "patterns" || filter === "stale";

  return (
    <div className="space-y-4">
      {/* Role manager — ORDER 001 */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-3 sm:px-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Tag roles
          </p>
          <V2IntelHelpLink topic="tags-universe" label="Roles" />
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Filter Tags by role">
          {ROLE_FILTERS.map((chip) => {
            const active = roleFilter === chip.id;
            const count =
              chip.id === "all"
                ? roleCountById.get("all")
                : roleCountById.get(chip.id);
            return (
              <li key={chip.id}>
                <button
                  type="button"
                  onClick={() => setRoleFilter(chip.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "border-sky-500/50 bg-sky-950/40 text-sky-100"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                  title={
                    chip.id === "all"
                      ? "All Tag roles in the universe"
                      : `${chip.label} Tags only`
                  }
                  aria-pressed={active}
                >
                  <span>{chip.label}</span>
                  {typeof count === "number" ? (
                    <span className={`tabular-nums ${active ? "text-sky-300/80" : "text-zinc-600"}`}>
                      {count}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        {roleFilter !== "all" && roleFilter !== "evidence" && evidenceIntelActive ? (
          <p className="mt-2 text-[11px] text-zinc-600">
            Hot / Patterns / Stale score Evidence activity — binder roles may look empty under those
            filters.
          </p>
        ) : null}
      </div>

      {/* Trackers strip — watch-on Tags (not a separate ontology) */}
      <div className="rounded-xl border border-rose-500/25 bg-rose-950/15 px-3 py-3 sm:px-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-300/90">
            Trackers
          </p>
          <div className="flex items-center gap-2">
            <V2IntelHelpLink topic="tags-patterns" label="Trackers" />
            <button
              type="button"
              onClick={() => setFilter("focus")}
              className="text-[11px] font-medium text-rose-300/90 hover:text-rose-200"
            >
              View Trackers only →
            </button>
          </div>
        </div>
        {trackerRows.length === 0 ? (
          <p className="text-xs text-zinc-600">No Trackers yet.</p>
        ) : (
          <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto" aria-label="Flagged Trackers">
            {trackerRows.map((row) => (
              <li key={row.name}>
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setRoleFilter("all");
                    setSelectedName(row.name);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-amber-400/70 bg-rose-950/60 px-2.5 py-1.5 text-left text-[12px] font-semibold text-amber-100 ring-1 ring-rose-500/50"
                  title={`${row.name} — Tracker`}
                >
                  <span aria-hidden>⚑</span>
                  <span className="min-w-0 flex-1 truncate">{row.name}</span>
                  {row.count > 0 ? (
                    <span className="shrink-0 tabular-nums text-amber-200/70">· {row.count}</span>
                  ) : (
                    <span className="shrink-0 text-amber-200/50">no evidence yet</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        {filterControlled ? null : (
          <div className="min-w-0 flex-1">
            <V2IntelligenceUniverseFilters
              filter={filter}
              onChange={setFilter}
              surface="tags"
              ariaLabel="Filter Tags universe"
            />
          </div>
        )}
        <label className={`block min-w-[10rem] flex-1 sm:max-w-xs ${filterControlled ? "w-full sm:max-w-none" : ""}`}>
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
          <div className="flex min-h-[min(640px,72vh)] items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
            No tags match this filter. Clear search or switch filter.
          </div>
        ) : (
          <svg
            viewBox="0 0 100 100"
            className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 min-h-[min(640px,72vh)] h-[min(640px,72vh)]"
            role="img"
            aria-label="Tag universe — dots by recurrence × recency; no Tracker highlight; hover for name, click to select"
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
              const isHovered = hoveredName === row.name;
              const showLabel = isSelected || isHovered;
              const dotR = isSelected || isHovered ? point.r + 0.35 : point.r;
              const label = row.name.length > 18 ? `${row.name.slice(0, 16)}…` : row.name;
              return (
                <g
                  key={row.name}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${row.name}${row.isFocus ? ", Tracker" : ""}${row.isPattern ? ", Pattern" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => selectTag(row.name)}
                  onMouseEnter={() => setHoveredName(row.name)}
                  onMouseLeave={() => setHoveredName((current) => (current === row.name ? null : current))}
                  onFocus={() => setHoveredName(row.name)}
                  onBlur={() => setHoveredName((current) => (current === row.name ? null : current))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectTag(row.name);
                    }
                  }}
                >
                  <circle cx={point.x} cy={point.y} r={3.6} fill="transparent" />
                  {/* Tags plot: no Tracker/Pattern highlight — Flag status lives in Trackers strip + selection. */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={dotR}
                    fill="rgb(167, 139, 250)"
                    fillOpacity={isSelected || isHovered ? 0.98 : 0.82}
                    stroke={isSelected ? "rgb(255, 255, 255)" : "rgb(39, 39, 42)"}
                    strokeWidth={isSelected ? 0.55 : 0.3}
                  />
                  {showLabel ? (
                    <g className="pointer-events-none">
                      <rect
                        x={point.x - Math.min(22, label.length * 1.15 + 2) / 2}
                        y={point.y - dotR - 5.2}
                        width={Math.min(22, label.length * 1.15 + 2)}
                        height={3.6}
                        rx={0.7}
                        fill="rgba(9, 9, 11, 0.92)"
                        stroke="rgba(113, 113, 122, 0.55)"
                        strokeWidth={0.2}
                      />
                      <text
                        x={point.x}
                        y={point.y - dotR - 2.55}
                        textAnchor="middle"
                        fill="rgb(244, 244, 245)"
                        fontSize={2.35}
                        fontWeight={600}
                      >
                        {label}
                      </text>
                    </g>
                  ) : null}
                  <title>
                    {row.name}
                    {row.isFocus ? " · Tracker" : ""}
                    {row.isPattern ? " · Pattern" : ""}
                    {` · recurrence ${row.recurrence30d}/30d · recency ${Math.round(row.recencyScore * 100)}%`}
                    {" — click to select / rename"}
                  </title>
                </g>
              );
            })}
          </svg>
        )}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] tabular-nums text-zinc-500">
            {visible.length} tag{visible.length === 1 ? "" : "s"} in this filter
            {rows.length !== visible.length ? ` · ${rows.length} in full universe` : ""}
            {visible.length > 64 ? " · plot shows top 64 by score" : ""}
            {" · no Tracker/Pattern highlight on plot (Flag stays in Trackers + selection)"}
          </p>
          <V2IntelHelpLink topic="tags-universe" label="Tags legend" />
        </div>

        {visible.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Top by recurrence (30d)
              </p>
              <ul className="mt-2 space-y-1" aria-label="Tags ranked by recurrence">
                {topByRecurrence.map((row) => (
                  <li key={`rec-${row.name}`}>
                    <button
                      type="button"
                      onClick={() => selectTag(row.name)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-[12px] ${
                        selectedName === row.name
                          ? "bg-violet-500/15 text-violet-100"
                          : "text-zinc-300 hover:bg-zinc-900/80"
                      }`}
                    >
                      <span className="min-w-0 truncate">{row.name}</span>
                      <span className="shrink-0 tabular-nums text-zinc-500">{row.recurrence30d}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Top by recency
              </p>
              <ul className="mt-2 space-y-1" aria-label="Tags ranked by recency">
                {topByRecency.map((row) => (
                  <li key={`recy-${row.name}`}>
                    <button
                      type="button"
                      onClick={() => selectTag(row.name)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-[12px] ${
                        selectedName === row.name
                          ? "bg-violet-500/15 text-violet-100"
                          : "text-zinc-300 hover:bg-zinc-900/80"
                      }`}
                    >
                      <span className="min-w-0 truncate">{row.name}</span>
                      <span className="shrink-0 tabular-nums text-zinc-500">
                        {Math.round(row.recencyScore * 100)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      {/* Priority 2–3 — Selection: Flag control + evidence + neighborhood */}
      {!selected ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-zinc-800/90 bg-zinc-950/40 px-4 py-6 text-center">
            <p className="text-sm font-medium text-zinc-400">Select a tag in the Universe</p>
            <p className="mt-1 text-xs text-zinc-600">
              Plot = recurrence × recency (no Tracker/Pattern highlight on dots). Lists separate rankings.
              Select a tag to Rename or Flag.
            </p>
          </div>
          {visible.length > 0 ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                All tags in this filter ({visible.length})
              </p>
              <ul
                className="flex max-h-72 flex-col gap-1 overflow-y-auto"
                aria-label="Full tag inventory for this filter"
              >
                {visible.map((row) => (
                  <li key={row.name}>
                    <button
                      type="button"
                      onClick={() => selectTag(row.name)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-left text-[12px] text-zinc-300 hover:border-violet-500/40 hover:text-zinc-100"
                    >
                      <span className="min-w-0 truncate">{row.name}</span>
                      {row.count > 0 ? (
                        <span className="shrink-0 tabular-nums text-zinc-500">{row.count}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-violet-500/25 bg-zinc-950/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">
                Selected tag
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-zinc-50">{selected.name}</h3>
                <button
                  type="button"
                  onClick={openRename}
                  disabled={renameBusy || focusBusy}
                  className="rounded-md border border-violet-500/40 bg-violet-950/30 px-2 py-0.5 text-[11px] font-semibold text-violet-200 hover:border-violet-400/60 hover:text-violet-100 disabled:opacity-40"
                  title={`Rename ${selected.name} everywhere (Notes, binders, Trackers)`}
                >
                  ✎ Rename
                </button>
              </div>
              <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
                    Recurrence (30d)
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                    {selected.recurrence30d}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
                    Recency
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                    {Math.round(selected.recencyScore * 100)}%
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(selected.roles ?? []).map((role) => (
                  <span
                    key={role}
                    className="rounded bg-sky-950/40 px-1.5 py-0.5 text-[10px] font-medium capitalize text-sky-200/90 ring-1 ring-sky-500/30"
                  >
                    {role}
                  </span>
                ))}
                {selected.isPattern ? (
                  <span className="rounded bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90 ring-1 ring-amber-500/30">
                    Pattern
                  </span>
                ) : null}
                {selectedIsFocus ? (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100 ring-1 ring-amber-400/50">
                    <span aria-hidden>⚑</span> Tracker
                  </span>
                ) : (
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500 ring-1 ring-zinc-700">
                    Not a Tracker yet
                  </span>
                )}
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
                onClick={openRename}
                disabled={renameBusy || focusBusy}
                className="rounded-lg border border-violet-500/45 bg-violet-600/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-600/30 disabled:opacity-40"
                title={`Rename ${selected.name} everywhere (Notes, binders, Trackers)`}
              >
                Rename tag
              </button>
              <button
                type="button"
                onClick={() => toggleFocus(selected.name)}
                disabled={focusBusy}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
                  selectedIsFocus
                    ? "border-zinc-700 text-zinc-400 hover:border-rose-500/40 hover:text-rose-200"
                    : "border-amber-400/60 bg-rose-950/40 text-amber-100 shadow-[0_0_14px_rgba(244,63,94,0.25)] hover:bg-rose-950/55"
                }`}
                title={
                  selectedIsFocus
                    ? SIGNAL_TAGS.removeAria(selected.name)
                    : `Flag ${selected.name} as Tracker`
                }
              >
                {focusBusy ? "…" : selectedIsFocus ? "Disable Tracker" : "⚑ Flag Tracker"}
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
                  No notes or email carry this tag yet. It can still live as a Topic Tag or Tracker — Disable Tracker
                  does not delete it if it is saved on a Topic.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Binders · click to show neighborhood
              </p>
              <EntityChipList
                label="Organizations"
                items={selectedEvidence?.organizations ?? []}
                activeId={neighborhoodCenter?.id}
                onSelect={setNeighborhoodCenter}
              />
              <EntityChipList
                label="Projects"
                items={selectedEvidence?.projects ?? []}
                activeId={neighborhoodCenter?.id}
                onSelect={setNeighborhoodCenter}
              />
              <EntityChipList
                label="People"
                items={selectedEvidence?.people ?? []}
                activeId={neighborhoodCenter?.id}
                onSelect={setNeighborhoodCenter}
              />
              <EntityChipList
                label="Topics"
                items={selectedEvidence?.topics ?? []}
                activeId={neighborhoodCenter?.id}
                onSelect={setNeighborhoodCenter}
              />
              <EntityChipList
                label="Events"
                items={selectedEvidence?.events ?? []}
                activeId={neighborhoodCenter?.id}
                onSelect={setNeighborhoodCenter}
              />
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

          {neighborhoodCenter ? (
            <div className="border-t border-zinc-800/80 pt-4">
              <V2HomeNeighborhoodViewer
                entityId={neighborhoodCenter.id}
                entityName={neighborhoodCenter.name}
                variant="inline"
                scope="local"
              />
            </div>
          ) : null}

          {visible.length > 1 ? (
            <div className="border-t border-zinc-800/80 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                All tags in this filter
              </p>
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto" aria-label="All tags in this filter">
                {visible
                  .filter((row) => row.name !== selected.name)
                  .map((row) => (
                    <li key={row.name}>
                      <button
                        type="button"
                        onClick={() => selectTag(row.name)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-left text-[12px] text-zinc-400 hover:border-violet-500/40 hover:text-zinc-200"
                      >
                        <span className="min-w-0 truncate">{row.name}</span>
                        {row.count > 0 ? (
                          <span className="shrink-0 tabular-nums text-zinc-500">{row.count}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <V2TrackerTogglePanel
          evidenceTags={rows.map((row) => ({ tag: row.name, count: row.count }))}
          signalTags={focusTags}
          onSignalTagsChange={setFocusTags}
          scopeId="home-universe"
          heading="Manage universe · Tag ↔ Tracker"
          helpTopic="tags-universe"
          addPlaceholder="Tag name → Flag as Tracker"
        />
      </div>

      {renameOpen && selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !renameBusy && setRenameOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-tag-title"
          >
            <h3 id="rename-tag-title" className="text-lg font-semibold text-zinc-50">
              Rename tag
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              Changes the string everywhere it appears — Notes, email Topics, Topic/Project/Event Tags,
              and Trackers. Flag/Disable is separate.
            </p>
            <form onSubmit={(event) => void submitRename(event)} className="mt-4 space-y-4">
              <label className="block text-sm text-zinc-400">
                New name
                <input
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
                  autoFocus
                  required
                  disabled={renameBusy}
                />
              </label>
              {renameError ? <p className="text-xs text-rose-300">{renameError}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameOpen(false)}
                  disabled={renameBusy}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameBusy || !renameDraft.trim()}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {renameBusy ? "…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
