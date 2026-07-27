/**
 * Shared Capital Configuration balance ↔ as-of invariants (26-1E / 26-20).
 * Used by domain create/update, Apply validators, and Settings form checks.
 *
 * Never infer cash from equity or equity from cash.
 */
export type BalanceAsOfFields = {
  settledCashBase?: number | null;
  settledCashAsOf?: string | null;
  totalEquityBase?: number | null;
  totalEquityAsOf?: string | null;
};

function isConfiguredNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isConfiguredTimestamp(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Collect balance/as-of pairing errors for a resulting configuration state
 * (or a create proposal viewed as that state).
 *
 * Messages match Settings / Apply guidance:
 * - Settled cash requires settledCashAsOf
 * - settledCashAsOf requires settledCashBase
 * - Total equity requires totalEquityAsOf
 * - totalEquityAsOf requires totalEquityBase
 */
export function collectBalanceAsOfInvariantErrors(
  fields: BalanceAsOfFields,
  options?: { requireAtLeastOneCompletePair?: boolean }
): string[] {
  const errors: string[] = [];

  const cashConfigured = isConfiguredNumber(fields.settledCashBase);
  const cashAsOf = isConfiguredTimestamp(fields.settledCashAsOf);
  if (cashConfigured && !cashAsOf) {
    errors.push("Settled cash requires settledCashAsOf");
  }
  if (cashAsOf && !cashConfigured) {
    errors.push("settledCashAsOf requires settledCashBase");
  }

  const equityConfigured = isConfiguredNumber(fields.totalEquityBase);
  const equityAsOf = isConfiguredTimestamp(fields.totalEquityAsOf);
  if (equityConfigured && !equityAsOf) {
    errors.push("Total equity requires totalEquityAsOf");
  }
  if (equityAsOf && !equityConfigured) {
    errors.push("totalEquityAsOf requires totalEquityBase");
  }

  if (options?.requireAtLeastOneCompletePair) {
    const cashPair = cashConfigured && cashAsOf;
    const equityPair = equityConfigured && equityAsOf;
    if (!cashPair && !equityPair) {
      errors.push(
        "Create requires at least one complete balance pair: cash+as-of or equity+as-of (do not invent timestamps; do not infer cash from equity)"
      );
    }
  }

  return errors;
}

export function assertBalanceAsOfInvariant(
  fields: BalanceAsOfFields,
  options?: { requireAtLeastOneCompletePair?: boolean }
): void {
  const errors = collectBalanceAsOfInvariantErrors(fields, options);
  if (errors.length) {
    throw new Error(errors.join("; "));
  }
}

export function hasCompleteCashPair(fields: BalanceAsOfFields): boolean {
  return (
    isConfiguredNumber(fields.settledCashBase) &&
    isConfiguredTimestamp(fields.settledCashAsOf)
  );
}

export function hasCompleteEquityPair(fields: BalanceAsOfFields): boolean {
  return (
    isConfiguredNumber(fields.totalEquityBase) &&
    isConfiguredTimestamp(fields.totalEquityAsOf)
  );
}
