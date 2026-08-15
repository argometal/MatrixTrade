"use client";

import {
  coerceIntelligenceFilterForSurface,
  intelligenceFiltersForSurface,
  type IntelligenceUniverseFilter,
} from "@/lib/argus/v2/intelligence-filters";
import type { IntelligenceTab } from "./V2HomeIntelligencePanel";
import type { V2HomeView } from "./V2HomeMainShell";

const VIEW_OPTIONS: { id: V2HomeView; label: string; short: string }[] = [
  { id: "intelligence", label: "Intelligence", short: "Intel" },
  { id: "browse", label: "Browser", short: "Browse" },
];

const INTEL_TAB_OPTIONS: { id: IntelligenceTab; label: string }[] = [
  { id: "treemap", label: "Treemap" },
  { id: "portfolio", label: "Portfolio" },
  { id: "tags", label: "Tags" },
];

const selectClass =
  "min-w-0 max-w-[9.5rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1.5 text-[11px] font-semibold text-zinc-200 focus:border-violet-500/40 focus:outline-none sm:max-w-[11rem] sm:text-xs";

/**
 * One-line Home controls: Intel/Browser toggle + view/filter selects.
 * Hot filter is Treemap-only — Portfolio / Tags stay on Universe.
 */
export function V2HomeIntelToolbar({
  view,
  onViewChange,
  intelTab,
  onIntelTabChange,
  universeFilter,
  onUniverseFilterChange,
}: {
  view: V2HomeView;
  onViewChange: (next: V2HomeView) => void;
  intelTab: IntelligenceTab;
  onIntelTabChange: (next: IntelligenceTab) => void;
  universeFilter: IntelligenceUniverseFilter;
  onUniverseFilterChange: (next: IntelligenceUniverseFilter) => void;
}) {
  const filterOptions = intelligenceFiltersForSurface(intelTab);
  const safeFilter = coerceIntelligenceFilterForSurface(intelTab, universeFilter);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 sm:gap-2" role="toolbar" aria-label="Home view controls">
        <div
          className="inline-flex shrink-0 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-0.5"
          role="group"
          aria-label="Intelligence or Browser"
        >
          {VIEW_OPTIONS.map((option) => {
            const active = view === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                title={option.label}
                onClick={() => onViewChange(option.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs ${
                  active
                    ? "bg-violet-600/30 text-violet-100 ring-1 ring-violet-500/45"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span className="sm:hidden">{option.short}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>

        {view === "intelligence" ? (
          <>
            <label className="sr-only" htmlFor="home-intel-surface">
              Intelligence surface
            </label>
            <select
              id="home-intel-surface"
              value={intelTab}
              onChange={(event) => onIntelTabChange(event.target.value as IntelligenceTab)}
              className={selectClass}
              aria-label="Treemap, Portfolio, or Tags"
            >
              {INTEL_TAB_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="home-intel-universe">
              Universe filter
            </label>
            <select
              id="home-intel-universe"
              value={safeFilter}
              onChange={(event) =>
                onUniverseFilterChange(event.target.value as IntelligenceUniverseFilter)
              }
              className={selectClass}
              aria-label="Universe filter"
            >
              {filterOptions.map((item) => (
                <option key={item.id} value={item.id} title={item.title}>
                  {item.label}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {view === "intelligence" && intelTab === "treemap" && safeFilter === "hot" ? (
        <p className="text-[10px] leading-snug text-orange-400/90 sm:text-[11px]" role="status">
          Treemap · <span className="font-semibold text-orange-300">Hot</span>
          {" "}
          — activity in the last 30 days. Switch to Universe for the full map. Portfolio and Tags stay on
          Universe.
        </p>
      ) : null}
      {view === "intelligence" && safeFilter === "stale" ? (
        <p className="text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
          <span className="font-medium text-zinc-400">Stale</span> — had evidence before, none in the last 90 days
          (still in the universe).
        </p>
      ) : null}
      {view === "intelligence" && intelTab !== "treemap" && safeFilter === "all" ? (
        <p className="text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
          {intelTab === "tags" ? "Tags" : "Portfolio"} ·{" "}
          <span className="font-medium text-zinc-400">Universe</span> — full inventory (Hot is Treemap-only).
        </p>
      ) : null}
    </div>
  );
}
