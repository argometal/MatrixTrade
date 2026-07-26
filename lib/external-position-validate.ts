/**
 * Apply validators for External Position mutations (26-13).
 */
import {
  EXIT_PLAN_STATUSES,
  EXTERNAL_ACQUISITION_SOURCES,
  EXTERNAL_CAPITAL_TREATMENTS,
  EXTERNAL_LIQUIDITY_STATUSES,
} from "./external-position-types";

export const EXTERNAL_POSITION_CREATE_ALLOWED_KEYS = [
  "id",
  "ticker",
  "shares",
  "averageCost",
  "currentPrice",
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
  "reviewAt",
  "notes",
  "liquidityStatus",
  "capitalTreatment",
  "acquisitionSource",
] as const;

export const EXTERNAL_POSITION_REDUCTION_ALLOWED_KEYS = [
  "positionId",
  "sharesReduced",
  "executionPrice",
  "executedAt",
  "fees",
  "notes",
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
    parseNonNegNumber(proposal.currentPrice, "proposal.currentPrice", errors);
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
    parseNonNegNumber(proposal.currentPrice, "proposal.currentPrice", errors);
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
  parsePositiveNumber(proposal.sharesReduced, "proposal.sharesReduced", errors);
  parseNonNegNumber(
    proposal.executionPrice,
    "proposal.executionPrice",
    errors
  );
  if (proposal.fees !== undefined) {
    parseNonNegNumber(proposal.fees, "proposal.fees", errors);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateExternalPositionExitPlanProposal(
  proposal: Record<string, unknown>
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
  for (const field of [
    "targetPrice",
    "targetShares",
    "defensivePrice",
  ] as const) {
    if (proposal[field] !== undefined) {
      parseNonNegNumber(proposal[field], `proposal.${field}`, errors);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
