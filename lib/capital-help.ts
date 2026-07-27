/**
 * Capital Settings / Capital Planner help content (26-34).
 * Read-only guidance — no mutations.
 */

export type CapitalSetupChecklistItem = {
  id: string;
  label: string;
  status: "ok" | "missing" | "unknown";
  detail?: string;
};

export type CapitalSetupChecklistInput = {
  capitalPlannerSqlAvailable?: boolean;
  capitalPlannerSqlError?: string;
  externalPositionsSqlAvailable?: boolean;
  externalPositionsSqlError?: string;
  hasActiveConfiguration?: boolean;
  configurationUnavailable?: boolean;
  cashConfigured?: boolean;
  equityConfigured?: boolean;
  capitalAccountOperational?: boolean;
  capitalAccountUnavailable?: boolean;
};

export function buildCapitalSetupChecklist(
  input: CapitalSetupChecklistInput
): CapitalSetupChecklistItem[] {
  const sqlStatus = (
    available: boolean | undefined,
    error: string | undefined
  ): CapitalSetupChecklistItem["status"] => {
    if (error) return "unknown";
    if (available === undefined) return "unknown";
    return available ? "ok" : "missing";
  };

  return [
    {
      id: "capital-planner-tables",
      label: "Capital Planner tables available",
      status: sqlStatus(
        input.capitalPlannerSqlAvailable,
        input.capitalPlannerSqlError
      ),
      detail:
        input.capitalPlannerSqlAvailable === false
          ? "Run supabase/capital-planner.sql in the Supabase SQL Editor."
          : input.capitalPlannerSqlError
            ? input.capitalPlannerSqlError
            : undefined,
    },
    {
      id: "external-positions-table",
      label: "External Positions table available",
      status: sqlStatus(
        input.externalPositionsSqlAvailable,
        input.externalPositionsSqlError
      ),
      detail:
        input.externalPositionsSqlAvailable === false
          ? "Run supabase/external-positions.sql in the Supabase SQL Editor."
          : input.externalPositionsSqlError
            ? input.externalPositionsSqlError
            : undefined,
    },
    {
      id: "active-config",
      label: "active Capital Configuration",
      status: input.configurationUnavailable
        ? "unknown"
        : input.hasActiveConfiguration
          ? "ok"
          : "missing",
      detail: input.configurationUnavailable
        ? "Configuration could not be loaded."
        : input.hasActiveConfiguration
          ? undefined
          : "Use Configure Capital, then Control → Apply.",
    },
    {
      id: "cash-configured",
      label: "cash configured",
      status: input.configurationUnavailable
        ? "unknown"
        : input.cashConfigured
          ? "ok"
          : "missing",
      detail:
        !input.configurationUnavailable && !input.cashConfigured
          ? "Set settled cash + settled cash as-of together."
          : undefined,
    },
    {
      id: "equity-configured",
      label: "equity configured",
      status: input.configurationUnavailable
        ? "unknown"
        : input.equityConfigured
          ? "ok"
          : "missing",
      detail:
        !input.configurationUnavailable && !input.equityConfigured
          ? "Set total equity + total equity as-of together."
          : undefined,
    },
    {
      id: "account-operational",
      label: "Capital Account operational",
      status: input.capitalAccountUnavailable
        ? "unknown"
        : input.capitalAccountOperational
          ? "ok"
          : "missing",
      detail: input.capitalAccountUnavailable
        ? "Capital Account snapshot unavailable."
        : input.capitalAccountOperational
          ? undefined
          : "Complete cash/equity configuration so the Capital Account becomes operational.",
    },
  ];
}

export const CAPITAL_HELP_WORKFLOW_STEPS = [
  "Configure",
  "Generate Proposal",
  "Open Apply",
  "Validate",
  "Accept",
  "Capital Planner",
] as const;

export const CAPITAL_ALLOCATION_FLOW =
  "Scout Plan → Scout Funding Snapshot → evaluation → capital-reservation-create → Control → Apply → Validate → Accept";

export const CAPITAL_HELP_SECTIONS = [
  {
    id: "cash-vs-equity",
    title: "Settled Cash vs Total Equity",
    body: "Settled Cash is cash currently settled and usable at the broker — never derived from equity, never including pending settlement. Total Equity is the broker account total value (cash + marked positions). They are independent; equity never substitutes for settled cash.",
  },
  {
    id: "liquidity-buffer",
    title: "Liquidity Buffer",
    body: "Cash intentionally excluded from new Scout deployment. Zero is valid when the full cash balance is dedicated to MTA.",
  },
  {
    id: "broker-snapshot",
    title: "broker_snapshot",
    body: "Source broker_snapshot means values were copied from a broker screen, statement, export, or API snapshot. Typing numbers from a broker screenshot still uses broker_snapshot — input method is not the economic source.",
  },
  {
    id: "balance-asof",
    title: "Balance and as-of must be paired",
    body: "A configured balance requires a configured as-of timestamp. Clear both together. Update proposals must not leave an orphan balance or orphan as-of. Create requires a complete cash+as-of pair and/or equity+as-of pair.",
  },
  {
    id: "workflow",
    title: "Workflow",
    body: `Configure → Generate Proposal → Open Apply → Validate → Accept → Capital Planner. Settings prepares proposals only; Control → Apply validates and persists.`,
  },
  {
    id: "snapshots",
    title: "Snapshot differences",
    body: "Capital Settings status snapshot — default account-level status; balances omitted; safe for tactical packages. Private full snapshot — includes private balances; confirm before copy; never attach to ticker analysis or shared prompts.",
  },
  {
    id: "supabase",
    title: "Supabase setup",
    body: "Capital Planner state: supabase/capital-planner.sql (public.capital_planner_state). External Positions: supabase/external-positions.sql (public.external_positions). Run each idempotent script in the Supabase SQL Editor when tables are missing.",
  },
  {
    id: "allocation",
    title: "Scout allocation flow",
    body: `${CAPITAL_ALLOCATION_FLOW}. Use Scout Funding Snapshot on a Scout Plan so identifiers and funding fields are collected once — do not gather them manually from separate screens.`,
  },
] as const;
