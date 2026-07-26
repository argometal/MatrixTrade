/**
 * Settings → Capital proposal preparation (26-1A).
 * Pure helpers — never persist. Persistence remains Control → Apply.
 */
import {
  validateCapitalConfigurationCreateProposal,
  validateCapitalConfigurationUpdateProposal,
} from "./capital-validate";
import type { CapitalConfigSource, CapitalConfiguration } from "./capital-types";

export type CapitalSettingsFormValues = {
  settledCashBase?: number;
  settledCashAsOf?: string;
  totalEquityBase?: number;
  totalEquityAsOf?: string;
  liquidityBuffer?: number;
  source: CapitalConfigSource;
  externalCreditsIncludedInCash: boolean;
};

export function buildCapitalConfigurationCreateProposal(
  values: CapitalSettingsFormValues
): Record<string, unknown> {
  const proposal: Record<string, unknown> = {
    source: values.source,
    externalCreditsIncludedInCash: values.externalCreditsIncludedInCash,
  };
  if (values.settledCashBase !== undefined) {
    proposal.settledCashBase = values.settledCashBase;
  }
  if (values.settledCashAsOf?.trim()) {
    proposal.settledCashAsOf = values.settledCashAsOf.trim();
  }
  if (values.totalEquityBase !== undefined) {
    proposal.totalEquityBase = values.totalEquityBase;
  }
  if (values.totalEquityAsOf?.trim()) {
    proposal.totalEquityAsOf = values.totalEquityAsOf.trim();
  }
  if (values.liquidityBuffer !== undefined) {
    proposal.liquidityBuffer = values.liquidityBuffer;
  }
  return {
    type: "capital-configuration-create",
    source: "settings-capital",
    proposal,
  };
}

export function buildCapitalConfigurationUpdateProposal(
  activeId: string,
  values: Partial<CapitalSettingsFormValues>
): Record<string, unknown> {
  const proposal: Record<string, unknown> = {
    id: activeId.trim().toUpperCase(),
  };
  if (values.settledCashBase !== undefined) {
    proposal.settledCashBase = values.settledCashBase;
  }
  if (values.settledCashAsOf !== undefined) {
    proposal.settledCashAsOf = values.settledCashAsOf.trim() || null;
  }
  if (values.totalEquityBase !== undefined) {
    proposal.totalEquityBase = values.totalEquityBase;
  }
  if (values.totalEquityAsOf !== undefined) {
    proposal.totalEquityAsOf = values.totalEquityAsOf.trim() || null;
  }
  if (values.liquidityBuffer !== undefined) {
    proposal.liquidityBuffer = values.liquidityBuffer;
  }
  if (values.source !== undefined) proposal.source = values.source;
  if (values.externalCreditsIncludedInCash !== undefined) {
    proposal.externalCreditsIncludedInCash =
      values.externalCreditsIncludedInCash;
  }
  return {
    type: "capital-configuration-update",
    source: "settings-capital",
    proposal,
  };
}

export function validatePreparedCapitalProposal(
  payload: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const type = String(payload.type ?? "");
  const proposal =
    payload.proposal && typeof payload.proposal === "object"
      ? (payload.proposal as Record<string, unknown>)
      : {};
  if (type === "capital-configuration-create") {
    return validateCapitalConfigurationCreateProposal(proposal);
  }
  if (type === "capital-configuration-update") {
    return validateCapitalConfigurationUpdateProposal(proposal);
  }
  return {
    ok: false,
    errors: [
      "Settings → Capital only prepares capital-configuration-create|update (not External Position blocks)",
    ],
  };
}

export function formValuesFromConfiguration(
  config: CapitalConfiguration
): CapitalSettingsFormValues {
  return {
    settledCashBase: config.settledCashBase,
    settledCashAsOf: config.settledCashAsOf,
    totalEquityBase: config.totalEquityBase,
    totalEquityAsOf: config.totalEquityAsOf,
    liquidityBuffer: config.liquidityBuffer,
    source: config.source,
    externalCreditsIncludedInCash: config.externalCreditsIncludedInCash,
  };
}

/** Forbidden: mixing External Position fields into a Capital Configuration proposal. */
export function proposalMixesExternalPosition(
  payload: Record<string, unknown>
): boolean {
  const type = String(payload.type ?? "");
  if (type.startsWith("external-position-")) return true;
  const proposal =
    payload.proposal && typeof payload.proposal === "object"
      ? (payload.proposal as Record<string, unknown>)
      : {};
  const epKeys = [
    "shares",
    "averageCost",
    "ticker",
    "acquisitionSource",
    "reductions",
    "costBasisMethod",
  ];
  return epKeys.some((k) => k in proposal);
}
