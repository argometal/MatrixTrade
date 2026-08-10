/**
 * Shared Org + Project browse board ontology.
 * Working states: Active | On Hold. Hide state: Archived (completed folded here — no separate Completed).
 */
export const V2_PORTFOLIO_BROWSE_STATUSES = ["Active", "On Hold", "Archived"] as const;

export type V2PortfolioBrowseStatus = (typeof V2_PORTFOLIO_BROWSE_STATUSES)[number];

export const V2_PORTFOLIO_BOARD_COLUMNS: V2PortfolioBrowseStatus[] = [
  "Active",
  "On Hold",
  "Archived",
];

const ON_HOLD_LINE_RE = /^status:\s*on\s*hold\s*$/gim;
const ON_HOLD_ANY_RE = /\bstatus:\s*on\s*hold\b/i;
const PROSPECT_LINE_RE = /^status:\s*prospect\s*$/gim;

export function notesHaveOnHold(notes: string | undefined): boolean {
  return ON_HOLD_ANY_RE.test(notes ?? "");
}

/** Ensure notes carry a durable On Hold marker (portfolio board). */
export function notesWithOnHold(notes: string | undefined): string {
  const base = (notes ?? "").replace(ON_HOLD_LINE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  if (ON_HOLD_ANY_RE.test(base)) return base;
  return base ? `${base}\n\nStatus: on hold` : "Status: on hold";
}

/** Remove On Hold / Prospect markers when returning to Active. */
export function notesClearedBrowseHold(notes: string | undefined): string {
  return (notes ?? "")
    .replace(ON_HOLD_LINE_RE, "")
    .replace(PROSPECT_LINE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isPortfolioBrowseStatus(value: string | null | undefined): value is V2PortfolioBrowseStatus {
  return value === "Active" || value === "On Hold" || value === "Archived";
}
