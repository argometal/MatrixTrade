/**
 * Shared Home Intelligence universe filters — Tags, Treemap, Portfolio.
 *
 * Stale = has evidence, but none in the last 90 days (dormant, not deleted).
 * Hot is Treemap-only; Portfolio and Tags stay on Universe by default.
 */

export type IntelligenceUniverseFilter = "all" | "hot" | "stale" | "patterns" | "focus";

export type IntelligenceSurface = "treemap" | "portfolio" | "tags";

export const INTELLIGENCE_UNIVERSE_FILTERS: {
  id: IntelligenceUniverseFilter;
  label: string;
  title: string;
}[] = [
  { id: "hot", label: "Hot", title: "Activity in the last 30 days — Treemap only" },
  { id: "all", label: "Universe", title: "All items in this view" },
  { id: "patterns", label: "Patterns", title: "Recurring Tag Patterns in scope" },
  {
    id: "stale",
    label: "Stale",
    title: "Has evidence, but none in the last 90 days",
  },
  { id: "focus", label: "Trackers", title: "Carries a Flagged Tracker Tag" },
];

/** Treemap opens on Hot. Portfolio / Tags open on full Universe. */
export const INTELLIGENCE_DEFAULT_FILTER: IntelligenceUniverseFilter = "hot";

export function intelligenceDefaultFilterForSurface(
  surface: IntelligenceSurface
): IntelligenceUniverseFilter {
  return surface === "treemap" ? "hot" : "all";
}

/** Hot appears only on Treemap; Portfolio / Tags keep Universe · Patterns · Stale · Trackers. */
export function intelligenceFiltersForSurface(surface: IntelligenceSurface) {
  if (surface === "treemap") return INTELLIGENCE_UNIVERSE_FILTERS;
  return INTELLIGENCE_UNIVERSE_FILTERS.filter((item) => item.id !== "hot");
}

export function coerceIntelligenceFilterForSurface(
  surface: IntelligenceSurface,
  filter: IntelligenceUniverseFilter
): IntelligenceUniverseFilter {
  const allowed = new Set(intelligenceFiltersForSurface(surface).map((item) => item.id));
  if (allowed.has(filter)) return filter;
  return intelligenceDefaultFilterForSurface(surface);
}

export type IntelligenceFilterableNode = {
  evidenceCount: number;
  recurrence30d: number;
  recencyScore: number;
  tagPatternCount: number;
  /** True when scoped evidence carries a Tracker Tag. */
  hasTracker?: boolean;
};

export function filterIntelligenceNodes<T extends IntelligenceFilterableNode>(
  nodes: T[],
  filter: IntelligenceUniverseFilter
): T[] {
  switch (filter) {
    case "hot":
      return nodes.filter((n) => n.recurrence30d > 0);
    case "stale":
      return nodes.filter((n) => n.evidenceCount > 0 && n.recencyScore === 0);
    case "patterns":
      return nodes.filter((n) => n.tagPatternCount > 0);
    case "focus":
      return nodes.filter((n) => Boolean(n.hasTracker));
    case "all":
      return nodes;
  }
}

export type IntelligenceFilterableTag = {
  count: number;
  recurrence30d: number;
  recencyScore: number;
  isFocus: boolean;
  isPattern: boolean;
};

export function filterIntelligenceTags<T extends IntelligenceFilterableTag>(
  rows: T[],
  filter: IntelligenceUniverseFilter
): T[] {
  switch (filter) {
    case "hot":
      return rows.filter((r) => r.recurrence30d > 0);
    case "stale":
      return rows.filter((r) => r.count > 0 && r.recencyScore === 0);
    case "patterns":
      return rows.filter((r) => r.isPattern);
    case "focus":
      return rows.filter((r) => r.isFocus);
    case "all":
      return rows;
  }
}
