/**
 * Apply validators for External Position mutations (26-13 / hardened 26-14).
 */
import {
  EXIT_PLAN_STATUSES,
  EXTERNAL_ACQUISITION_SOURCES,
  EXTERNAL_CAPITAL_TREATMENTS,
  EXTERNAL_LIQUIDITY_STATUSES,
  VALUATION_SOURCES,
  assertCompatibleCapitalState,
  type ExternalCapitalTreatment,
  type ExternalPositionStatus,
} from "./external-position-types";

export const EXTERNAL_POSITION_CREATE_ALLOWED_KEYS = [
  "id",
  "ticker",
  "shares",
  "averageCost",
  "currentPrice",
  "valuationSource",
  "acquisitionSource",
  "capitalTreatment",
  "liquidityStatus",
  "openedAt",
  "reviewAt",
  "notes",
] as const;

export const EXTERNAL_POSITION_UPDATE_ALLOWED_KEYS = [
  "id",
  "currentPrice",
  "valuationSource",
  "reviewAt",
  "notes",
  "liquidityStatus",
  "capitalTreatment",
  "acquisitionSource",
] as const;

export const EXTERNAL_POSITION_REDUCTION_ALLOWED_KEYS = [
  "positionId",
  "reductionId",
  "executionReference",
  "sharesReduced",
  "executionPrice",
  "executedAt",
  "fees",
  "notes",
] as const;

export const EXTERNAL_POSITION_SETTLE_ALLOWED_KEYS = [
  "positionId",
  "reductionId",
  "settledAt",
] as const;

export const EXTERNAL_POSITION_EXIT_PLAN_ALLOWED_KEYS = [
  "positionId",
  "targetPrice",
  "targetShares",
  "defensivePrice",
  "defensiveAction",
  "validUntil",
  "reviewRule",
  "notes",
  "status",
] as const;

function unknownKeys(
  proposal: Record<string, unknown>,
  allowed: readonly string[]
): string[] {
  const allow = new Set(allowed);
  return Object.keys(proposal).filter((k) => !allow.has(k));
}

function parsePositiveNumber(value: unknown, field: string, errors: string[]) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    errors.push(`${field} must be a positive number`);
    return undefined;
  }
  return n;
}

function parseNonNegNumber(value: unknown, field: string, errors: string[]) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    errors.push(`${field} must be a non-negative number`);
    return undefined;
  }
  return n;
}

function parseIsoTimestamp(
  value: unknown,
  field: string,
  errors: string[]
): void {
  if (value === undefined || value === null) return;
  const s = String(value).trim();
  if (!s) {
    errors.push(`${field} must be a valid ISO timestamp`);
    return;
  }
  const t = Date.parse(s);
  if (!Number.isFinite(t) || Number.isNaN(t)) {
    errors.push(`${field} must be a valid ISO timestamp`);
  }
}

export function validateExternalPositionCreateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, EXTERNAL_POSITION_CREATE_ALLOWED_KEYS);
  if (unknown.length) {
    errors.push(`Unknown keys: ${unknown.join(", ")}`);
  }
  const ticker = String(proposal.ticker ?? "").trim().toUpperCase();
  if (!ticker) errors.push("proposal.ticker required");
  parsePositiveNumber(proposal.shares, "proposal.shares", errors);
  parseNonNegNumber(proposal.averageCost, "proposal.averageCost", errors);
  if (proposal.currentPrice !== undefined) {
    parsePositiveNumber(proposal.currentPrice, "proposal.currentPrice", errors);
  }
  if (
    proposal.valuationSource !== undefined &&
    !(VALUATION_SOURCES as readonly string[]).includes(
      String(proposal.valuationSource)
    )
  ) {
    errors.push(
      `proposal.valuationSource must be one of: ${VALUATION_SOURCES.join("|")}`
    );
  }
  if (
    proposal.acquisitionSource !== undefined &&
    !(EXTERNAL_ACQUISITION_SOURCES as readonly string[]).includes(
      String(proposal.acquisitionSource)
    )
  ) {
    errors.push(
      `proposal.acquisitionSource must be one of: ${EXTERNAL_ACQUISITION_SOURCES.join("|")}`
    );
  }
  if (
    proposal.capitalTreatment !== undefined &&
    !(EXTERNAL_CAPITAL_TREATMENTS as readonly string[]).includes(
      String(proposal.capitalTreatment)
    )
  ) {
    errors.push(
      `proposal.capitalTreatment must be one of: ${EXTERNAL_CAPITAL_TREATMENTS.join("|")}`
    );
  } else if (proposal.capitalTreatment !== undefined) {
    try {
      assertCompatibleCapitalState(
        "open",
        String(proposal.capitalTreatment) as ExternalCapitalTreatment
      );
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (
    proposal.liquidityStatus !== undefined &&
    !(EXTERNAL_LIQUIDITY_STATUSES as readonly string[]).includes(
      String(proposal.liquidityStatus)
    )
  ) {
    errors.push(
      `proposal.liquidityStatus must be one of: ${EXTERNAL_LIQUIDITY_STATUSES.join("|")}`
    );
  }
  parseIsoTimestamp(proposal.openedAt, "proposal.openedAt", errors);
  parseIsoTimestamp(proposal.reviewAt, "proposal.reviewAt", errors);
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateExternalPositionUpdateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, EXTERNAL_POSITION_UPDATE_ALLOWED_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.id ?? "").trim()) errors.push("proposal.id required");
  if (proposal.currentPrice !== undefined) {
    parsePositiveNumber(proposal.currentPrice, "proposal.currentPrice", errors);
  }
  if (
    proposal.valuationSource !== undefined &&
    !(VALUATION_SOURCES as readonly string[]).includes(
      String(proposal.valuationSource)
    )
  ) {
    errors.push(
      `proposal.valuationSource must be one of: ${VALUATION_SOURCES.join("|")}`
    );
  }
  if (
    proposal.liquidityStatus !== undefined &&
    !(EXTERNAL_LIQUIDITY_STATUSES as readonly string[]).includes(
      String(proposal.liquidityStatus)
    )
  ) {
    errors.push(
      `proposal.liquidityStatus must be one of: ${EXTERNAL_LIQUIDITY_STATUSES.join("|")}`
    );
  }
  if (
    proposal.capitalTreatment !== undefined &&
    !(EXTERNAL_CAPITAL_TREATMENTS as readonly string[]).includes(
      String(proposal.capitalTreatment)
    )
  ) {
    errors.push(
      `proposal.capitalTreatment must be one of: ${EXTERNAL_CAPITAL_TREATMENTS.join("|")}`
    );
  }
  parseIsoTimestamp(
    proposal.reviewAt === null ? undefined : proposal.reviewAt,
    "proposal.reviewAt",
    errors
  );
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateExternalPositionReductionProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(
    proposal,
    EXTERNAL_POSITION_REDUCTION_ALLOWED_KEYS
  );
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.positionId ?? "").trim()) {
    errors.push("proposal.positionId required");
  }
  const reductionId = String(proposal.reductionId ?? "").trim();
  const executionReference = String(proposal.executionReference ?? "").trim();
  if (!reductionId && !executionReference) {
    errors.push(
      "proposal.reductionId or proposal.executionReference is required"
    );
  }
  parsePositiveNumber(proposal.sharesReduced, "proposal.sharesReduced", errors);
  parsePositiveNumber(
    proposal.executionPrice,
    "proposal.executionPrice",
    errors
  );
  if (proposal.fees !== undefined) {
    parseNonNegNumber(proposal.fees, "proposal.fees", errors);
  }
  parseIsoTimestamp(proposal.executedAt, "proposal.executedAt", errors);
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateExternalPositionSettleProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(proposal, EXTERNAL_POSITION_SETTLE_ALLOWED_KEYS);
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.positionId ?? "").trim()) {
    errors.push("proposal.positionId required");
  }
  parseIsoTimestamp(proposal.settledAt, "proposal.settledAt", errors);
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateExternalPositionExitPlanProposal(
  proposal: Record<string, unknown>,
  opts?: {
    positionShares?: number;
    positionStatus?: ExternalPositionStatus;
  }
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = unknownKeys(
    proposal,
    EXTERNAL_POSITION_EXIT_PLAN_ALLOWED_KEYS
  );
  if (unknown.length) errors.push(`Unknown keys: ${unknown.join(", ")}`);
  if (!String(proposal.positionId ?? "").trim()) {
    errors.push("proposal.positionId required");
  }
  if (
    proposal.status !== undefined &&
    !(EXIT_PLAN_STATUSES as readonly string[]).includes(String(proposal.status))
  ) {
    errors.push(
      `proposal.status must be one of: ${EXIT_PLAN_STATUSES.join("|")}`
    );
  }
  if (
    opts?.positionStatus !== undefined &&
    (opts.positionStatus === "closed" || opts.positionStatus === "archived") &&
    String(proposal.status ?? "") === "active"
  ) {
    errors.push(
      "closed/archived External Position cannot receive an active exit plan"
    );
  }
  for (const field of ["targetPrice", "defensivePrice"] as const) {
    if (proposal[field] !== undefined) {
      parsePositiveNumber(proposal[field], `proposal.${field}`, errors);
    }
  }
  if (proposal.targetShares !== undefined) {
    const n = parsePositiveNumber(
      proposal.targetShares,
      "proposal.targetShares",
      errors
    );
    if (
      n !== undefined &&
      opts?.positionShares !== undefined &&
      n > opts.positionShares + 1e-12
    ) {
      errors.push(
        `proposal.targetShares ${n} exceeds current position shares ${opts.positionShares}`
      );
    }
  }
  parseIsoTimestamp(proposal.validUntil, "proposal.validUntil", errors);
  return errors.length ? { ok: false, errors } : { ok: true };
}
