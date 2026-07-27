/**
 * Settings → Capital proposal preparation (26-1A / 26-1C / 26-1E / 26-20).
 * Pure helpers — never persist. Persistence remains Control → Apply.
 *
 * Null/undefined policy (update):
 * - omitted / not dirty → leave persisted value unchanged
 * - number (including 0) → replace
 * - null → explicitly clear optional field
 * - undefined must never represent an explicit clear
 */
import { collectBalanceAsOfInvariantErrors } from "./capital-balance-asof";
import {
  validateCapitalConfigurationCreateProposal,
  validateCapitalConfigurationUpdateProposal,
} from "./capital-validate";
import type { CapitalConfigSource, CapitalConfiguration } from "./capital-types";

/** Optional numeric: undefined=absent, null=explicit clear (update), number=value (0 valid). */
export type ClearableNumber = number | null | undefined;
/** Optional timestamp: undefined=absent, null=explicit clear, string=value. */
export type ClearableTimestamp = string | null | undefined;

export type CapitalSettingsFormValues = {
  settledCashBase?: ClearableNumber;
  settledCashAsOf?: ClearableTimestamp;
  totalEquityBase?: ClearableNumber;
  totalEquityAsOf?: ClearableTimestamp;
  liquidityBuffer?: ClearableNumber;
  source: CapitalConfigSource;
  externalCreditsIncludedInCash: boolean;
};

export type CapitalSettingsDirtyFields = Partial<
  Record<keyof CapitalSettingsFormValues, true>
>;

export type ClearableFieldKey =
  | "settledCashBase"
  | "settledCashAsOf"
  | "totalEquityBase"
  | "totalEquityAsOf"
  | "liquidityBuffer";

const FORM_KEYS: (keyof CapitalSettingsFormValues)[] = [
  "settledCashBase",
  "settledCashAsOf",
  "totalEquityBase",
  "totalEquityAsOf",
  "liquidityBuffer",
  "source",
  "externalCreditsIncludedInCash",
];

const CLEARABLE_KEYS: ClearableFieldKey[] = [
  "settledCashBase",
  "settledCashAsOf",
  "totalEquityBase",
  "totalEquityAsOf",
  "liquidityBuffer",
];

const TIMESTAMP_KEYS = new Set<ClearableFieldKey>([
  "settledCashAsOf",
  "totalEquityAsOf",
]);

function isUnconfigured(value: unknown): boolean {
  return value === undefined || value === null;
}

function normalizeComparable(
  key: keyof CapitalSettingsFormValues,
  value: unknown
): unknown {
  if (value === undefined || value === null) {
    // Treat null and undefined as the same unconfigured state for dirty equality.
    return undefined;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (TIMESTAMP_KEYS.has(key as ClearableFieldKey)) {
      return trimmed === "" ? undefined : trimmed;
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

/** True when a dirty clearable field is an explicit null clear. */
export function isExplicitClear(
  values: Partial<CapitalSettingsFormValues>,
  key: ClearableFieldKey
): boolean {
  return values[key] === null;
}

export function buildCapitalConfigurationCreateProposal(
  values: CapitalSettingsFormValues
): Record<string, unknown> {
  const proposal: Record<string, unknown> = {
    source: values.source,
    externalCreditsIncludedInCash: values.externalCreditsIncludedInCash,
  };
  if (typeof values.settledCashBase === "number") {
    proposal.settledCashBase = values.settledCashBase;
  }
  if (
    typeof values.settledCashAsOf === "string" &&
    values.settledCashAsOf.trim()
  ) {
    proposal.settledCashAsOf = values.settledCashAsOf.trim();
  }
  if (typeof values.totalEquityBase === "number") {
    proposal.totalEquityBase = values.totalEquityBase;
  }
  if (
    typeof values.totalEquityAsOf === "string" &&
    values.totalEquityAsOf.trim()
  ) {
    proposal.totalEquityAsOf = values.totalEquityAsOf.trim();
  }
  if (typeof values.liquidityBuffer === "number") {
    proposal.liquidityBuffer = values.liquidityBuffer;
  }
  return {
    type: "capital-configuration-create",
    source: "settings-capital",
    proposal,
  };
}

function emitClearable(
  proposal: Record<string, unknown>,
  key: ClearableFieldKey,
  value: unknown,
  errors: string[]
): void {
  if (value === undefined) {
    errors.push(
      `Dirty field ${key} resolved to undefined without an explicit clear — emit null to clear, or restore the value`
    );
    return;
  }
  if (value === null) {
    proposal[key] = null;
    return;
  }
  if (TIMESTAMP_KEYS.has(key)) {
    const trimmed = String(value).trim();
    if (!trimmed) {
      errors.push(
        `Dirty field ${key} is blank without explicit clear marker — use null to clear`
      );
      return;
    }
    proposal[key] = trimmed;
    return;
  }
  proposal[key] = value;
}

/**
 * Update proposal: id + only dirty fields.
 * Explicit clears emit null; untouched fields omitted; 0 is a real value.
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
  const errors: string[] = [];

  for (const key of CLEARABLE_KEYS) {
    if (dirtyFields[key]) {
      emitClearable(proposal, key, values[key], errors);
    }
  }
  if (dirtyFields.source) {
    if (values.source === undefined) {
      errors.push("Dirty field source resolved to undefined");
    } else {
      proposal.source = values.source;
    }
  }
  if (dirtyFields.externalCreditsIncludedInCash) {
    if (values.externalCreditsIncludedInCash === undefined) {
      errors.push(
        "Dirty field externalCreditsIncludedInCash resolved to undefined"
      );
    } else {
      proposal.externalCreditsIncludedInCash =
        values.externalCreditsIncludedInCash;
    }
  }

  if (errors.length) {
    throw new Error(errors.join("; "));
  }

  return {
    type: "capital-configuration-update",
    source: "settings-capital",
    proposal,
  };
}

function resultingClearable(
  original: CapitalSettingsFormValues,
  values: Partial<CapitalSettingsFormValues>,
  dirty: CapitalSettingsDirtyFields,
  key: ClearableFieldKey
): ClearableNumber | ClearableTimestamp {
  if (dirty[key]) return values[key];
  return original[key];
}

/**
 * Balance ↔ as-of coupling and clear integrity for update proposals.
 *
 * Invariants:
 * - Setting/changing a balance to a number requires a fresh dirty as-of timestamp.
 * - Clearing a balance requires clearing its as-of (both emit null).
 * - Clearing only an as-of while the balance remains configured is rejected.
 * - Configured balance requires configured as-of.
 */
export function validateUpdateTimestampCoupling(
  dirtyFields: CapitalSettingsDirtyFields,
  values?: Partial<CapitalSettingsFormValues>,
  original?: CapitalSettingsFormValues
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const v = values ?? {};
  const o = original;

  const checkPair = (
    balanceKey: "settledCashBase" | "totalEquityBase",
    asOfKey: "settledCashAsOf" | "totalEquityAsOf",
    label: string
  ) => {
    if (!dirtyFields[balanceKey] && !dirtyFields[asOfKey]) return;

    const bal = o
      ? resultingClearable(o, v, dirtyFields, balanceKey)
      : v[balanceKey];
    const asOf = o
      ? resultingClearable(o, v, dirtyFields, asOfKey)
      : v[asOfKey];

    if (dirtyFields[balanceKey]) {
      if (typeof bal === "number") {
        if (!dirtyFields[asOfKey]) {
          errors.push(
            `Changing ${label} requires a fresh ${asOfKey} (do not invent timestamps)`
          );
        } else if (asOf === null || asOf === undefined || String(asOf).trim() === "") {
          errors.push(
            `Changing ${label} requires a valid ${asOfKey} timestamp (not cleared)`
          );
        }
      } else if (bal === null) {
        if (!dirtyFields[asOfKey] || asOf !== null) {
          errors.push(
            `Clearing ${label} requires clearing ${asOfKey} (emit both as null)`
          );
        }
      } else if (bal === undefined) {
        errors.push(
          `Dirty ${balanceKey} is undefined — use null to clear or a number to set`
        );
      }
    }

    if (dirtyFields[asOfKey] && !dirtyFields[balanceKey]) {
      // Clearing only timestamp while balance remains configured — reject.
      if (asOf === null || asOf === undefined || String(asOf).trim() === "") {
        if (typeof bal === "number") {
          errors.push(
            `Cannot clear ${asOfKey} while ${label} remains configured — clear both or keep as-of`
          );
        }
      }
    }
  };

  checkPair("settledCashBase", "settledCashAsOf", "settled cash");
  checkPair("totalEquityBase", "totalEquityAsOf", "total equity");

  return errors.length ? { ok: false, errors } : { ok: true };
}

const FAR_FUTURE_MS = 48 * 60 * 60 * 1000;

export function validateCapitalSettingsFormValues(
  values: CapitalSettingsFormValues,
  options?: {
    mode: "create" | "update";
    dirtyFields?: CapitalSettingsDirtyFields;
  }
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
    if (v === undefined || v === null) return;
    if (!Number.isFinite(v) || Number.isNaN(v)) {
      errors.push(`${label} must be a finite number`);
    } else if (v < 0) {
      errors.push(`${label} cannot be negative`);
    }
  };

  checkNumber("settledCashBase", "Settled cash");
  checkNumber("totalEquityBase", "Total equity");
  checkNumber("liquidityBuffer", "Liquidity buffer");

  const cash =
    typeof values.settledCashBase === "number"
      ? values.settledCashBase
      : undefined;
  const buffer =
    typeof values.liquidityBuffer === "number"
      ? values.liquidityBuffer
      : undefined;
  const cashRelevant =
    mode === "create" ||
    !dirty ||
    dirty.settledCashBase ||
    dirty.liquidityBuffer;
  if (
    cashRelevant &&
    cash !== undefined &&
    buffer !== undefined &&
    buffer > cash
  ) {
    errors.push("Liquidity buffer cannot exceed settled cash");
  }

  const checkTs = (
    key: "settledCashAsOf" | "totalEquityAsOf",
    label: string
  ) => {
    if (mode === "update" && dirty && !dirty[key]) return;
    const raw = values[key];
    if (raw === undefined || raw === null || String(raw).trim() === "") return;
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
    for (const key of CLEARABLE_KEYS) {
      if (values[key] === null) {
        errors.push(`Create does not accept null for ${key}`);
      }
    }
    // Balance/as-of pairs — do not invent timestamps; do not infer cash↔equity.
    errors.push(
      ...collectBalanceAsOfInvariantErrors(
        {
          settledCashBase:
            typeof values.settledCashBase === "number"
              ? values.settledCashBase
              : undefined,
          settledCashAsOf:
            typeof values.settledCashAsOf === "string"
              ? values.settledCashAsOf
              : undefined,
          totalEquityBase:
            typeof values.totalEquityBase === "number"
              ? values.totalEquityBase
              : undefined,
          totalEquityAsOf:
            typeof values.totalEquityAsOf === "string"
              ? values.totalEquityAsOf
              : undefined,
        },
        { requireAtLeastOneCompletePair: true }
      )
    );
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

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

/** Field UI state for update mode indicators. */
export function fieldUpdateState(
  original: CapitalSettingsFormValues,
  current: CapitalSettingsFormValues,
  key: ClearableFieldKey
): "unchanged" | "changed" | "will-clear" {
  if (valuesEqualForDirty(key, original[key], current[key])) return "unchanged";
  if (current[key] === null) return "will-clear";
  // Empty string timestamp after having a value is treated as clear intent in the form layer.
  if (
    TIMESTAMP_KEYS.has(key) &&
    (current[key] === undefined ||
      (typeof current[key] === "string" && !String(current[key]).trim()))
  ) {
    return isUnconfigured(original[key]) ? "unchanged" : "will-clear";
  }
  return "changed";
}

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
