/**
 * Human-readable recovery when Capital Planner / External Positions tables are missing.
 * Does not change store behavior — only presents clearer UI copy.
 */

export type CapitalMissingTableKind =
  | "capital_planner_state"
  | "external_positions"
  | "unknown";

const CAPITAL_TABLE_MARKERS = [
  "capital_planner_state",
  "schema cache",
  "could not find the table",
  "relation",
  "does not exist",
  "42P01",
  "PGRST205",
  "PGRST116",
] as const;

const EXTERNAL_TABLE_MARKERS = [
  "external_positions",
  "schema cache",
  "could not find the table",
  "relation",
  "does not exist",
  "42P01",
  "PGRST205",
] as const;

export function isLikelyMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    m.includes("42p01") ||
    m.includes("pgrst205") ||
    (m.includes("relation") && m.includes("exist"))
  );
}

export function detectCapitalMissingTable(
  message: string
): CapitalMissingTableKind {
  const m = message.toLowerCase();
  if (m.includes("external_positions") || m.includes("external-positions")) {
    return "external_positions";
  }
  if (
    m.includes("capital_planner_state") ||
    m.includes("capital planner") ||
    m.includes("capital_planner")
  ) {
    return "capital_planner_state";
  }
  if (isLikelyMissingTableError(message)) {
    // Ambiguous missing-table language — prefer capital planner when that context is present.
    if (CAPITAL_TABLE_MARKERS.some((k) => m.includes(k.toLowerCase()))) {
      return "capital_planner_state";
    }
    if (EXTERNAL_TABLE_MARKERS.some((k) => m.includes(k.toLowerCase()))) {
      return "external_positions";
    }
  }
  return "unknown";
}

export function capitalPlannerMissingTableRecovery(): string {
  return [
    "Capital Planner tables are not available in Supabase.",
    "Recovery: open the Supabase SQL Editor and run `supabase/capital-planner.sql`,",
    "then reload this page. Until that migration exists, Capital Configuration and",
    "reservations cannot load from the cloud store.",
  ].join(" ");
}

export function externalPositionsMissingTableRecovery(): string {
  return [
    "External Positions table is not available in Supabase.",
    "Recovery: open the Supabase SQL Editor and run `supabase/external-positions.sql`,",
    "then reload this page. External Position detail will stay empty until the table exists.",
  ].join(" ");
}

/**
 * Prefer a human recovery instruction when the raw store/API error indicates a missing table.
 * Always keep the original error for diagnostics (appended).
 */
export function formatCapitalStoreError(
  raw: string | undefined,
  hint: "capital" | "external" | "auto" = "auto"
): string | undefined {
  if (!raw) return undefined;
  if (!isLikelyMissingTableError(raw)) return raw;

  let kind = detectCapitalMissingTable(raw);
  if (kind === "unknown") {
    kind = hint === "external" ? "external_positions" : "capital_planner_state";
  }

  const recovery =
    kind === "external_positions"
      ? externalPositionsMissingTableRecovery()
      : capitalPlannerMissingTableRecovery();

  return `${recovery} (Details: ${raw})`;
}
