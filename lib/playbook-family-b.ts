/** Family B — Secular Trend Continuation checklist (MTA-002C + bull-trend entry). */

export const SECULAR_TREND_CONTINUATION_PLAYBOOK_ID = "secular-trend-continuation";

export const FAMILY_B_CHECKLIST: { id: string; label: string; group?: string }[] = [
  {
    id: "family",
    group: "THESIS",
    label: "Confirm Family B (continuation) — not forcing Family A deep discount",
  },
  {
    id: "thesis",
    group: "THESIS",
    label: "Secular thesis intact on strategic TF (MTAE + Stock File)",
  },
  {
    id: "target-invalidation",
    group: "THESIS",
    label: "Primary target still valid · structural invalidation defined",
  },
  {
    id: "method",
    group: "STRUCTURE",
    label: "Entry method: pullback | retest | compression | layered | reclaim",
  },
  {
    id: "extension",
    group: "STRUCTURE",
    label: "Extension classified — wait if extended_no_chase",
  },
  {
    id: "pullback",
    group: "STRUCTURE",
    label: "Pullback classified (shallow / preferred / deep) — not trend-breaking",
  },
  {
    id: "roles",
    group: "ENTRY",
    label: "Layer roles explicit: starter · preferred_pullback · deep_pullback",
  },
  {
    id: "alloc",
    group: "ENTRY",
    label: "Percentages explicit · preferred normally largest · starter ≤30%",
  },
  {
    id: "r-visible",
    group: "ENTRY",
    label: "R visible per layer · fill-state projections reviewed",
  },
  {
    id: "no-chase",
    group: "ENTRY",
    label: "No chase if limits miss · no extended-target cosmetics",
  },
  {
    id: "stops",
    group: "RISK",
    label: "Structural invalidation and strategy/common stop both defined",
  },
  {
    id: "min-r",
    group: "RISK",
    label: "Minimum R for this family stated on Scout",
  },
  {
    id: "no-widen",
    group: "RISK",
    label: "Stop not widened · target not moved to force R",
  },
  {
    id: "capital",
    group: "RISK",
    label: "Existing capital authorization / risk rules respected (no new budget logic)",
  },
  {
    id: "evidence",
    group: "EVIDENCE",
    label: "Evidence for / against / unresolved · participation synthesis",
  },
  {
    id: "fib",
    group: "EVIDENCE",
    label: "Fibonacci is context only — never standalone authorization",
  },
  {
    id: "decision",
    group: "DECISION",
    label: "GO / WAIT / NO via Scout · cancel conditions · validity window",
  },
];

export function isSecularTrendContinuationPlaybook(
  playbookId: string | undefined | null
): boolean {
  return playbookId === SECULAR_TREND_CONTINUATION_PLAYBOOK_ID;
}
