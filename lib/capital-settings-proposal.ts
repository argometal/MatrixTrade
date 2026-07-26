/**
 * Settings → Capital proposal preparation (26-1A / 26-1C).
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

export type CapitalSettingsDirtyFields = Partial<
  Record<keyof CapitalSettingsFormValues, true>
>;

const FORM_KEYS: (keyof CapitalSettingsFormValues)[] = [
  "settledCashBase",
  "settledCashAsOf",
  "totalEquityBase",
  "totalEquityAsOf",
  "liquidityBuffer",
  "source",
  "externalCreditsIncludedInCash",
];

const TIMESTAMP_KEYS = new Set<keyof CapitalSettingsFormValues>([
  "settledCashAsOf",
  "totalEquityAsOf",
]);

function normalizeComparable(
  key: keyof CapitalSettingsFormValues,
  value: unknown
): unknown {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (TIMESTAMP_KEYS.has(key)) {
      return trimmed === "" ? "" : trimmed;
    }
    return trimmed;
  }
  return value;
}

/** Compare normalized values for dirty tracking. */
export function valuesEqualForDirty(
  key: keyof CapitalSettingsFormValues,
  a: unknown,
  b: unknown
): boolean {
  const na = normalizeComparable(key, a);
  const nb = normalizeComparable(key, b);
  if (na === undefined && nb === undefined) return true;
  if (typeof na === "number" && typeof nb === "number") {
    return Object.is(na, nb);
  }
  return na === nb;
}

export function computeDirtyFields(
  original: CapitalSettingsFormValues,
  current: CapitalSettingsFormValues
): CapitalSettingsDirtyFields {
  const dirty: CapitalSettingsDirtyFields = {};
  for (const key of FORM_KEYS) {
    if (!valuesEqualForDirty(key, original[key], current[key])) {
      dirty[key] = true;
    }
  }
  return dirty;
}

export function hasDirtyFields(dirty: CapitalSettingsDirtyFields): boolean {
  return FORM_KEYS.some((k) => dirty[k] === true);
}

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

/**
 * Update proposal: id + only dirty fields.
 * Explicit empty timestamps emit null; untouched blanks are omitted.
 */
export function buildCapitalConfigurationUpdateProposal(input: {
  activeId: string;
  values: Partial<CapitalSettingsFormValues>;
  dirtyFields: CapitalSettingsDirtyFields;
}): Record<string, unknown> {
  const { activeId, values, dirtyFields } = input;
  const proposal: Record<string, unknown> = {
    id: activeId.trim().toUpperCase(),
  };

  if (dirtyFields.settledCashBase) {
    proposal.settledCashBase = values.settledCashBase;
  }
  if (dirtyFields.settledCashAsOf) {
    const raw = values.settledCashAsOf;
    proposal.settledCashAsOf =
      raw === undefined || String(raw).trim() === ""
        ? null
        : String(raw).trim();
  }
  if (dirtyFields.totalEquityBase) {
    proposal.totalEquityBase = values.totalEquityBase;
  }
  if (dirtyFields.totalEquityAsOf) {
    const raw = values.totalEquityAsOf;
    proposal.totalEquityAsOf =
      raw === undefined || String(raw).trim() === ""
        ? null
        : String(raw).trim();
  }
  if (dirtyFields.liquidityBuffer) {
    proposal.liquidityBuffer = values.liquidityBuffer;
  }
  if (dirtyFields.source) {
    proposal.source = values.source;
  }
  if (dirtyFields.externalCreditsIncludedInCash) {
    proposal.externalCreditsIncludedInCash =
      values.externalCreditsIncludedInCash;
  }

  return {
    type: "capital-configuration-update",
    source: "settings-capital",
    proposal,
  };
}

/** Balance ↔ as-of coupling for update proposals. */
export function validateUpdateTimestampCoupling(
  dirtyFields: CapitalSettingsDirtyFields
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (dirtyFields.settledCashBase && !dirtyFields.settledCashAsOf) {
    errors.push(
      "Changing settled cash requires a fresh settledCashAsOf (do not invent timestamps)"
    );
  }
  if (dirtyFields.totalEquityBase && !dirtyFields.totalEquityAsOf) {
    errors.push(
      "Changing total equity requires a fresh totalEquityAsOf (do not invent timestamps)"
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

const FAR_FUTURE_MS = 48 * 60 * 60 * 1000; // 48h grace for clock skew

export function validateCapitalSettingsFormValues(
  values: CapitalSettingsFormValues,
  options?: { mode: "create" | "update"; dirtyFields?: CapitalSettingsDirtyFields }
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const mode = options?.mode ?? "create";
  const dirty = options?.dirtyFields;

  const checkNumber = (
    key: "settledCashBase" | "totalEquityBase" | "liquidityBuffer",
    label: string
  ) => {
    if (mode === "update" && dirty && !dirty[key]) return;
    const v = values[key];
    if (v === undefined) return;
    if (!Number.isFinite(v) || Number.isNaN(v)) {
      errors.push(`${label} must be a finite number`);
    } else if (v < 0) {
      errors.push(`${label} cannot be negative`);
    }
  };

  checkNumber("settledCashBase", "Settled cash");
  checkNumber("totalEquityBase", "Total equity");
  checkNumber("liquidityBuffer", "Liquidity buffer");

  const cashRelevant =
    mode === "create" ||
    !dirty ||
    dirty.settledCashBase ||
    dirty.liquidityBuffer;
  if (
    cashRelevant &&
    values.settledCashBase !== undefined &&
    values.liquidityBuffer !== undefined &&
    Number.isFinite(values.settledCashBase) &&
    Number.isFinite(values.liquidityBuffer) &&
    values.liquidityBuffer > values.settledCashBase
  ) {
    errors.push("Liquidity buffer cannot exceed settled cash");
  }

  const checkTs = (
    key: "settledCashAsOf" | "totalEquityAsOf",
    label: string
  ) => {
    if (mode === "update" && dirty && !dirty[key]) return;
    const raw = values[key];
    if (raw === undefined || String(raw).trim() === "") return;
    const t = Date.parse(String(raw).trim());
    if (!Number.isFinite(t) || Number.isNaN(t)) {
      errors.push(`${label} must be a valid ISO timestamp`);
      return;
    }
    if (t > Date.now() + FAR_FUTURE_MS) {
      errors.push(`${label} looks far in the future — check the timestamp`);
    }
  };

  checkTs("settledCashAsOf", "Settled cash as-of");
  checkTs("totalEquityAsOf", "Total equity as-of");

  if (mode === "create") {
    const hasCash = values.settledCashBase !== undefined;
    const hasEquity = values.totalEquityBase !== undefined;
    if (!hasCash && !hasEquity) {
      errors.push(
        "Create requires at least settled cash or total equity (do not invent missing values)"
      );
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Soft warnings for UI (e.g. source=other). */
export function capitalSettingsFormWarnings(
  values: CapitalSettingsFormValues
): string[] {
  const warnings: string[] = [];
  if (values.source === "other") {
    warnings.push(
      "source=other: explain the economic source in Apply notes (sourceNote is not persisted)."
    );
  }
  return warnings;
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
