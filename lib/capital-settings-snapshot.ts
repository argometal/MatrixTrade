/**
 * Opt-in Capital Settings snapshots (26-1A / 26-1C).
 * Account-level only — never auto-attached to ticker snapshot packages.
 *
 * Modes:
 * - capital-settings-status-snapshot — default; balances omitted
 * - capital-settings-private-snapshot — explicit secondary; includes balances
 */
import type { CapitalAccountSnapshot } from "./capital-account";
import type { CapitalConfiguration } from "./capital-types";
import type { SnapshotMenuItem } from "./snapshot-types";

export const CAPITAL_SETTINGS_STATUS_SNAPSHOT_ID =
  "capital-settings-status-snapshot" as const;
export const CAPITAL_SETTINGS_PRIVATE_SNAPSHOT_ID =
  "capital-settings-private-snapshot" as const;

/** Legacy id — must not appear in tactical packages. */
export const CAPITAL_SETTINGS_LEGACY_SNAPSHOT_ID =
  "capital-settings-snapshot" as const;

function configuredLabel(
  value: number | string | boolean | undefined | null
): "configured" | "unconfigured" {
  if (value === undefined || value === null || value === "") {
    return "unconfigured";
  }
  return "configured";
}

export function buildCapitalSettingsStatusSnapshotText(input: {
  configuration: CapitalConfiguration | null;
  account?: CapitalAccountSnapshot | null;
  accountError?: string;
}): string {
  const lines = [
    "=== CAPITAL SETTINGS STATUS SNAPSHOT ===",
    "scope: account-level",
    "privacy: balances omitted",
    "Not ticker analysis. Not Scout/Trade/MTAE evidence.",
    "Mutations: Control → Apply → Validate → Accept only.",
    "Update proposals: changed fields only; balance changes need fresh as-of.",
    "",
  ];

  const cfg = input.configuration;
  if (!cfg || cfg.status !== "active") {
    lines.push("configuration: unconfigured");
  } else {
    lines.push("configuration: active");
    lines.push(`accountingModel: ${cfg.accountingModel}`);
    lines.push(`baseCurrency: ${cfg.baseCurrency}`);
    lines.push(`settledCash: ${configuredLabel(cfg.settledCashBase)}`);
    lines.push(`settledCashAsOf: ${configuredLabel(cfg.settledCashAsOf)}`);
    lines.push(`totalEquity: ${configuredLabel(cfg.totalEquityBase)}`);
    lines.push(`totalEquityAsOf: ${configuredLabel(cfg.totalEquityAsOf)}`);
    lines.push(`liquidityBuffer: ${configuredLabel(cfg.liquidityBuffer)}`);
    lines.push(`source: ${cfg.source}`);
    lines.push(
      `externalCreditsIncludedInCash: ${configuredLabel(
        cfg.externalCreditsIncludedInCash
      )}`
    );
  }

  if (input.accountError) {
    lines.push("completeness: unavailable");
    lines.push("reconciliation: unavailable");
  } else if (input.account) {
    lines.push(`completeness: ${input.account.completeness.status}`);
    lines.push(`reconciliation: ${input.account.reconciliationStatus}`);
  } else {
    lines.push("completeness: unknown");
    lines.push("reconciliation: unknown");
  }

  lines.push("");
  lines.push("LOCATION");
  lines.push("- Settings → Capital (`/settings/capital`)");
  lines.push("- Capital Planner consumes this config (`/planning/capital`)");
  return lines.join("\n");
}

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

export function buildCapitalSettingsPrivateSnapshotText(input: {
  configuration: CapitalConfiguration | null;
  account?: CapitalAccountSnapshot | null;
  accountError?: string;
}): string {
  const lines = [
    "=== CAPITAL SETTINGS PRIVATE SNAPSHOT ===",
    "scope: account-level",
    "privacy: CONTAINS PRIVATE ACCOUNT-LEVEL FINANCIAL VALUES",
    "Do not attach to ticker analysis, public reports, or shared prompts.",
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
    lines.push(
      fieldLine("settledCashBase", cfg.settledCashBase, cfg.settledCashAsOf)
    );
    lines.push(
      fieldLine("totalEquityBase", cfg.totalEquityBase, cfg.totalEquityAsOf)
    );
    lines.push(fieldLine("liquidityBuffer", cfg.liquidityBuffer));
    lines.push(`source: ${cfg.source}`);
    lines.push(
      `externalCreditsIncludedInCash: ${cfg.externalCreditsIncludedInCash}`
    );
    lines.push(`status: ${cfg.status}`);
    lines.push(`updatedAt: ${cfg.updatedAt}`);
  }

  if (input.accountError) {
    lines.push("");
    lines.push("completeness: unavailable");
    lines.push("reconciliation: unavailable");
  } else if (input.account) {
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

/** Default header snapshot — status only (balances omitted). */
export function capitalSettingsStatusSnapshotItems(input: {
  configuration: CapitalConfiguration | null;
  account?: CapitalAccountSnapshot | null;
  accountError?: string;
}): SnapshotMenuItem[] {
  return [
    {
      id: CAPITAL_SETTINGS_STATUS_SNAPSHOT_ID,
      label: "Capital Settings status snapshot",
      description:
        "Account-level status only — balances omitted; not part of ticker packages",
      text: buildCapitalSettingsStatusSnapshotText(input),
    },
  ];
}

/** Explicit private snapshot — require UI confirmation before copy. */
export function capitalSettingsPrivateSnapshotItem(input: {
  configuration: CapitalConfiguration | null;
  account?: CapitalAccountSnapshot | null;
  accountError?: string;
}): SnapshotMenuItem {
  return {
    id: CAPITAL_SETTINGS_PRIVATE_SNAPSHOT_ID,
    label: "Capital Settings private snapshot",
    description:
      "Private account-level balances — confirm before copy; never attach to ticker packages",
    text: buildCapitalSettingsPrivateSnapshotText(input),
  };
}

/** @deprecated Use status/private builders. Kept for import-guard tests. */
export function capitalSettingsSnapshotItems(input: {
  configuration: CapitalConfiguration | null;
  account?: CapitalAccountSnapshot | null;
  accountError?: string;
}): SnapshotMenuItem[] {
  return capitalSettingsStatusSnapshotItems(input);
}

/** Patterns that must NOT appear in ticker-level / tactical snapshots. */
export const ACCOUNT_CAPITAL_SNAPSHOT_FORBIDDEN = [
  "settledCashBase",
  "totalEquityBase",
  "externalCreditsIncludedInCash",
  "CAPITAL SETTINGS SNAPSHOT",
  "CAPITAL SETTINGS PRIVATE SNAPSHOT",
  "CAPITAL SETTINGS STATUS SNAPSHOT",
  "Capital Configuration id:",
] as const;

export const CAPITAL_SETTINGS_SNAPSHOT_IDS = [
  CAPITAL_SETTINGS_STATUS_SNAPSHOT_ID,
  CAPITAL_SETTINGS_PRIVATE_SNAPSHOT_ID,
  CAPITAL_SETTINGS_LEGACY_SNAPSHOT_ID,
] as const;

export function snapshotContainsAccountCapitalConfig(text: string): boolean {
  const lower = text.toLowerCase();
  return ACCOUNT_CAPITAL_SNAPSHOT_FORBIDDEN.some((needle) =>
    lower.includes(needle.toLowerCase())
  );
}

/** True if text embeds numeric balance lines from the private snapshot. */
export function statusSnapshotContainsPrivateBalances(text: string): boolean {
  if (/settledCashBase:\s*-?\d/.test(text)) return true;
  if (/totalEquityBase:\s*-?\d/.test(text)) return true;
  if (/liquidityBuffer:\s*-?\d/.test(text)) return true;
  if (/\bid:\s*CAPCFG-/i.test(text)) return true;
  if (/updatedAt:\s*\d{4}-\d{2}-\d{2}/.test(text)) return true;
  if (/as of \d{4}-\d{2}-\d{2}/.test(text)) return true;
  return false;
}
