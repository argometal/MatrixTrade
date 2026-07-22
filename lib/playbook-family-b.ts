/** Family B — Secular Trend Continuation checklist (MTA-002C). */

export const SECULAR_TREND_CONTINUATION_PLAYBOOK_ID = "secular-trend-continuation";

export const FAMILY_B_CHECKLIST: { id: string; label: string }[] = [
  {
    id: "family",
    label: "Confirm Family B (continuation) — not forcing Family A deep discount",
  },
  {
    id: "thesis",
    label: "Secular thesis intact on strategic TF (MTAE + Stock File)",
  },
  {
    id: "method",
    label: "Entry method chosen: pullback | retest | compression | layered | probe",
  },
  {
    id: "extension",
    label: "Max extension / wait rules stated",
  },
  {
    id: "stops",
    label: "Structural invalidation and strategy stop both defined (distinct if needed)",
  },
  {
    id: "min-r",
    label: "Minimum R for this family stated on Scout",
  },
  {
    id: "solver",
    label: "Entry Solver: probable target, strategy stop, max admissible entry",
  },
  {
    id: "no-chase",
    label: "No chase if limits miss; no extended-target cosmetics",
  },
];

export function isSecularTrendContinuationPlaybook(
  playbookId: string | undefined | null
): boolean {
  return playbookId === SECULAR_TREND_CONTINUATION_PLAYBOOK_ID;
}
