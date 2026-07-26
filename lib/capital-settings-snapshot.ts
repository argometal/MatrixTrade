/**
 * Opt-in Capital Settings snapshot (26-1A).
 * Account-level only — never auto-attached to ticker snapshot packages.
 */
import type { CapitalAccountSnapshot } from "./capital-account";
import type { CapitalConfiguration } from "./capital-types";
import type { SnapshotMenuItem } from "./snapshot-types";

function fieldLine(
  label: string,
  value: number | string | boolean | undefined | null,
  asOf?: string
): string {
  if (value === undefined || value === null || value === "") {
    return `${label}: Unconfigured`;
  }
  const base =
    typeof value === "number"
      ? `${label}: ${value}`
      : typeof value === "boolean"
        ? `${label}: ${value ? "true" : "false"}`
        : `${label}: ${value}`;
  return asOf ? `${base} (as of ${asOf})` : base;
}

export function buildCapitalSettingsSnapshotText(input: {
  configuration: CapitalConfiguration | null;
  account?: CapitalAccountSnapshot | null;
}): string {
  const lines = [
    "=== CAPITAL SETTINGS SNAPSHOT (account-level · opt-in) ===",
    "Not ticker analysis. Not Scout/Trade/MTAE evidence.",
    "Mutations: Control → Apply → Validate → Accept only.",
    "",
  ];

  const cfg = input.configuration;
  if (!cfg || cfg.status !== "active") {
    lines.push("Active configuration: Unconfigured");
    lines.push(
      "Configure via Settings → Capital → Configure Capital → Copy Apply Proposal."
    );
  } else {
    lines.push(`id: ${cfg.id}`);
    lines.push(`accountingModel: ${cfg.accountingModel}`);
    lines.push(`baseCurrency: ${cfg.baseCurrency}`);
    lines.push(fieldLine("settledCashBase", cfg.settledCashBase, cfg.settledCashAsOf));
    lines.push(fieldLine("totalEquityBase", cfg.totalEquityBase, cfg.totalEquityAsOf));
    lines.push(fieldLine("liquidityBuffer", cfg.liquidityBuffer));
    lines.push(`source: ${cfg.source}`);
    lines.push(
      `externalCreditsIncludedInCash: ${cfg.externalCreditsIncludedInCash}`
    );
    lines.push(`status: ${cfg.status}`);
    lines.push(`updatedAt: ${cfg.updatedAt}`);
  }

  if (input.account) {
    lines.push("");
    lines.push(`completeness: ${input.account.completeness.status}`);
    lines.push(`reconciliation: ${input.account.reconciliationStatus}`);
  }

  lines.push("");
  lines.push("LOCATION");
  lines.push("- Settings → Capital (`/settings/capital`)");
  lines.push("- Capital Planner consumes this config (`/planning/capital`)");
  return lines.join("\n");
}

export function capitalSettingsSnapshotItems(input: {
  configuration: CapitalConfiguration | null;
  account?: CapitalAccountSnapshot | null;
}): SnapshotMenuItem[] {
  return [
    {
      id: "capital-settings-snapshot",
      label: "Capital Settings snapshot",
      description:
        "Account-level capital configuration only — opt-in; not part of ticker packages",
      text: buildCapitalSettingsSnapshotText(input),
    },
  ];
}

/** Patterns that must NOT appear in ticker-level / tactical snapshots. */
export const ACCOUNT_CAPITAL_SNAPSHOT_FORBIDDEN = [
  "settledCashBase",
  "totalEquityBase",
  "externalCreditsIncludedInCash",
  "CAPITAL SETTINGS SNAPSHOT",
  "Capital Configuration id:",
] as const;

export function snapshotContainsAccountCapitalConfig(text: string): boolean {
  const lower = text.toLowerCase();
  return ACCOUNT_CAPITAL_SNAPSHOT_FORBIDDEN.some((needle) =>
    lower.includes(needle.toLowerCase())
  );
}
