/**
 * Apply validators for Capital Planner mutations (26-15).
 */
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
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    errors.push(`${field} must be a non-negative finite number`);
    return undefined;
  }
  return n;
}

function parseIso(value: unknown, field: string, errors: string[]) {
  if (value === undefined || value === null) return;
  const t = Date.parse(String(value));
  if (!Number.isFinite(t) || Number.isNaN(t)) {
    errors.push(`${field} must be a valid ISO timestamp`);
  }
}

export function validateCapitalConfigurationCreateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, CAPITAL_CONFIGURATION_CREATE_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (proposal.settledCashBase !== undefined) {
    parseNonNeg(proposal.settledCashBase, "proposal.settledCashBase", errors);
  }
  if (proposal.totalEquityBase !== undefined) {
    parseNonNeg(proposal.totalEquityBase, "proposal.totalEquityBase", errors);
  }
  if (proposal.liquidityBuffer !== undefined) {
    parseNonNeg(proposal.liquidityBuffer, "proposal.liquidityBuffer", errors);
  }
  parseIso(proposal.settledCashAsOf, "proposal.settledCashAsOf", errors);
  parseIso(proposal.totalEquityAsOf, "proposal.totalEquityAsOf", errors);
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
  if (proposal.settledCashBase !== undefined && proposal.settledCashBase !== null) {
    parseNonNeg(proposal.settledCashBase, "proposal.settledCashBase", errors);
  }
  if (proposal.totalEquityBase !== undefined && proposal.totalEquityBase !== null) {
    parseNonNeg(proposal.totalEquityBase, "proposal.totalEquityBase", errors);
  }
  if (proposal.liquidityBuffer !== undefined && proposal.liquidityBuffer !== null) {
    parseNonNeg(proposal.liquidityBuffer, "proposal.liquidityBuffer", errors);
  }
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
