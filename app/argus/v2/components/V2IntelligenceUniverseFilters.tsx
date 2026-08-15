"use client";

import {
  intelligenceFiltersForSurface,
  type IntelligenceSurface,
  type IntelligenceUniverseFilter,
} from "@/lib/argus/v2/intelligence-filters";

export function V2IntelligenceUniverseFilters({
  filter,
  onChange,
  ariaLabel = "Filter universe",
  surface = "treemap",
}: {
  filter: IntelligenceUniverseFilter;
  onChange: (next: IntelligenceUniverseFilter) => void;
  ariaLabel?: string;
  /** Hot is omitted for Portfolio / Tags. */
  surface?: IntelligenceSurface;
}) {
  const options = intelligenceFiltersForSurface(surface);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label={ariaLabel}>
        {options.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={item.title}
              onClick={() => onChange(item.id)}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                active
                  ? item.id === "focus"
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
    </div>
  );
}
