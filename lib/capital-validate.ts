/**
 * Apply validators for Capital Planner mutations (26-15).
 */
import { collectBalanceAsOfInvariantErrors } from "./capital-balance-asof";
import {
  CAPITAL_CONFIG_SOURCES,
  CAPITAL_RESERVATION_STATUSES,
  FUNDING_DECISIONS,
} from "./capital-types";

export const CAPITAL_CONFIGURATION_CREATE_KEYS = [
  "id",
  "settledCashBase",
  "settledCashAsOf",
  "totalEquityBase",
  "totalEquityAsOf",
  "liquidityBuffer",
  "source",
  "externalCreditsIncludedInCash",
] as const;

export const CAPITAL_CONFIGURATION_UPDATE_KEYS = [
  "id",
  "settledCashBase",
  "settledCashAsOf",
  "totalEquityBase",
  "totalEquityAsOf",
  "liquidityBuffer",
  "source",
  "externalCreditsIncludedInCash",
  "status",
] as const;

export const CAPITAL_RESERVATION_CREATE_KEYS = [
  "id",
  "planId",
  "stockFileId",
  "stockThesisId",
  "ticker",
  "requestedCapital",
  "reservedCapital",
  "estimatedRisk",
  "reservationPriority",
  "expiresAt",
  "status",
  /** Assisted funding follow-up provenance (29-21) — optional / nullable on legacy. */
  "fundingFingerprint",
  "sourcePlanUpdatedAt",
  "sourceDecisionUpdateId",
] as const;

export const CAPITAL_RESERVATION_UPDATE_KEYS = [
  "id",
  "requestedCapital",
  "reservedCapital",
  "estimatedRisk",
  "reservationPriority",
  "expiresAt",
  "status",
  "fundingDecision",
  "blockingReasons",
] as const;

export const CAPITAL_RESERVATION_RELEASE_KEYS = ["id", "reason"] as const;

export const CAPITAL_LEDGER_ADJUSTMENT_KEYS = [
  "id",
  "idempotencyKey",
  "amount",
  "effectiveAt",
  "settledAt",
  "notes",
  "reversesEventId",
  "externalReference",
] as const;

function unknownKeys(
  proposal: Record<string, unknown>,
  allowed: readonly string[]
): string[] {
  const allow = new Set(allowed);
  return Object.keys(proposal).filter((k) => !allow.has(k));
}

function parseNonNeg(value: unknown, field: string, errors: string[]) {
  // Never Number(null) — null is not a numeric value (0 would be wrong).
  if (value === null) {
    errors.push(`${field} must not be null here`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    errors.push(`${field} must be a non-negative finite number`);
    return undefined;
  }
  return n;
}

function parseOptionalClearableNumber(
  value: unknown,
  field: string,
  errors: string[],
  opts: { allowNull: boolean }
): void {
  if (value === undefined) return;
  if (value === null) {
    if (!opts.allowNull) {
      errors.push(`${field} null is not allowed on create`);
    }
    return;
  }
  parseNonNeg(value, field, errors);
}

function parseIso(value: unknown, field: string, errors: string[]) {
  if (value === undefined || value === null) return;
  const t = Date.parse(String(value));
  if (!Number.isFinite(t) || Number.isNaN(t)) {
    errors.push(`${field} must be a valid ISO timestamp`);
  }
}

function validateBalanceAsOfProposalPair(
  proposal: Record<string, unknown>,
  balanceKey: "settledCashBase" | "totalEquityBase",
  asOfKey: "settledCashAsOf" | "totalEquityAsOf",
  errors: string[]
): void {
  const hasBal = Object.prototype.hasOwnProperty.call(proposal, balanceKey);
  const hasAsOf = Object.prototype.hasOwnProperty.call(proposal, asOfKey);
  if (!hasBal && !hasAsOf) return;

  const bal = proposal[balanceKey];
  const asOf = proposal[asOfKey];

  if (hasBal && bal === null) {
    if (!hasAsOf || asOf !== null) {
      errors.push(
        `Clearing ${balanceKey} requires ${asOfKey}: null in the same proposal`
      );
    }
  }

  if (hasBal && bal !== null && bal !== undefined) {
    if (!hasAsOf) {
      errors.push(
        `Setting ${balanceKey} requires ${asOfKey} in the same proposal`
      );
    } else if (asOf === null || asOf === undefined || String(asOf).trim() === "") {
      errors.push(
        `Setting ${balanceKey} requires a valid ${asOfKey} (not null/empty)`
      );
    }
  }

  if (hasAsOf && asOf === null && !hasBal) {
    // Clearing only the timestamp while balance is omitted (preserved) is rejected.
    errors.push(
      `Clearing ${asOfKey} alone is not allowed while ${balanceKey} may remain configured — clear both or keep as-of`
    );
  }
}

export function validateCapitalConfigurationCreateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, CAPITAL_CONFIGURATION_CREATE_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  parseOptionalClearableNumber(
    proposal.settledCashBase,
    "proposal.settledCashBase",
    errors,
    { allowNull: false }
  );
  parseOptionalClearableNumber(
    proposal.totalEquityBase,
    "proposal.totalEquityBase",
    errors,
    { allowNull: false }
  );
  parseOptionalClearableNumber(
    proposal.liquidityBuffer,
    "proposal.liquidityBuffer",
    errors,
    { allowNull: false }
  );
  if (proposal.settledCashAsOf === null) {
    errors.push("proposal.settledCashAsOf null is not allowed on create");
  }
  if (proposal.totalEquityAsOf === null) {
    errors.push("proposal.totalEquityAsOf null is not allowed on create");
  }
  parseIso(proposal.settledCashAsOf, "proposal.settledCashAsOf", errors);
  parseIso(proposal.totalEquityAsOf, "proposal.totalEquityAsOf", errors);
  // Create balance/as-of pairs — shared invariant (no orphan balance or timestamp).
  errors.push(
    ...collectBalanceAsOfInvariantErrors(
      {
        settledCashBase:
          proposal.settledCashBase === undefined ||
          proposal.settledCashBase === null
            ? undefined
            : Number(proposal.settledCashBase),
        settledCashAsOf:
          proposal.settledCashAsOf === undefined ||
          proposal.settledCashAsOf === null
            ? undefined
            : String(proposal.settledCashAsOf),
        totalEquityBase:
          proposal.totalEquityBase === undefined ||
          proposal.totalEquityBase === null
            ? undefined
            : Number(proposal.totalEquityBase),
        totalEquityAsOf:
          proposal.totalEquityAsOf === undefined ||
          proposal.totalEquityAsOf === null
            ? undefined
            : String(proposal.totalEquityAsOf),
      },
      { requireAtLeastOneCompletePair: true }
    )
  );
  if (
    proposal.source !== undefined &&
    !(CAPITAL_CONFIG_SOURCES as readonly string[]).includes(
      String(proposal.source)
    )
  ) {
    errors.push(
      `proposal.source must be one of: ${CAPITAL_CONFIG_SOURCES.join("|")}`
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateCapitalConfigurationUpdateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, CAPITAL_CONFIGURATION_UPDATE_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.id ?? "").trim()) errors.push("proposal.id required");
  parseOptionalClearableNumber(
    proposal.settledCashBase,
    "proposal.settledCashBase",
    errors,
    { allowNull: true }
  );
  parseOptionalClearableNumber(
    proposal.totalEquityBase,
    "proposal.totalEquityBase",
    errors,
    { allowNull: true }
  );
  parseOptionalClearableNumber(
    proposal.liquidityBuffer,
    "proposal.liquidityBuffer",
    errors,
    { allowNull: true }
  );
  parseIso(
    proposal.settledCashAsOf === null ? undefined : proposal.settledCashAsOf,
    "proposal.settledCashAsOf",
    errors
  );
  parseIso(
    proposal.totalEquityAsOf === null ? undefined : proposal.totalEquityAsOf,
    "proposal.totalEquityAsOf",
    errors
  );
  validateBalanceAsOfProposalPair(
    proposal,
    "settledCashBase",
    "settledCashAsOf",
    errors
  );
  validateBalanceAsOfProposalPair(
    proposal,
    "totalEquityBase",
    "totalEquityAsOf",
    errors
  );
  if (
    proposal.status !== undefined &&
    proposal.status !== "active" &&
    proposal.status !== "archived"
  ) {
    errors.push('proposal.status must be "active" or "archived"');
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateCapitalReservationCreateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, CAPITAL_RESERVATION_CREATE_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.planId ?? "").trim()) {
    errors.push("proposal.planId required");
  }
  parseNonNeg(proposal.requestedCapital, "proposal.requestedCapital", errors);
  parseNonNeg(proposal.estimatedRisk, "proposal.estimatedRisk", errors);
  if (proposal.reservedCapital !== undefined) {
    parseNonNeg(proposal.reservedCapital, "proposal.reservedCapital", errors);
  }
  parseIso(proposal.expiresAt, "proposal.expiresAt", errors);
  if (
    proposal.status !== undefined &&
    !(CAPITAL_RESERVATION_STATUSES as readonly string[]).includes(
      String(proposal.status)
    )
  ) {
    errors.push(
      `proposal.status must be one of: ${CAPITAL_RESERVATION_STATUSES.join("|")}`
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateCapitalReservationUpdateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, CAPITAL_RESERVATION_UPDATE_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.id ?? "").trim()) errors.push("proposal.id required");
  if (proposal.requestedCapital !== undefined) {
    parseNonNeg(proposal.requestedCapital, "proposal.requestedCapital", errors);
  }
  if (proposal.reservedCapital !== undefined) {
    parseNonNeg(proposal.reservedCapital, "proposal.reservedCapital", errors);
  }
  if (proposal.estimatedRisk !== undefined) {
    parseNonNeg(proposal.estimatedRisk, "proposal.estimatedRisk", errors);
  }
  parseIso(
    proposal.expiresAt === null ? undefined : proposal.expiresAt,
    "proposal.expiresAt",
    errors
  );
  if (
    proposal.fundingDecision !== undefined &&
    !(FUNDING_DECISIONS as readonly string[]).includes(
      String(proposal.fundingDecision)
    )
  ) {
    errors.push(
      `proposal.fundingDecision must be one of: ${FUNDING_DECISIONS.join("|")}`
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateCapitalReservationReleaseProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, CAPITAL_RESERVATION_RELEASE_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.id ?? "").trim()) errors.push("proposal.id required");
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateCapitalLedgerAdjustmentProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, CAPITAL_LEDGER_ADJUSTMENT_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.idempotencyKey ?? "").trim()) {
    errors.push("proposal.idempotencyKey required");
  }
  parseNonNeg(proposal.amount, "proposal.amount", errors);
  parseIso(proposal.effectiveAt, "proposal.effectiveAt", errors);
  parseIso(proposal.settledAt, "proposal.settledAt", errors);
  return errors.length ? { ok: false, errors } : { ok: true };
}
