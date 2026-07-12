import { computePlannedRR } from "./plan-risk";

export type ScoutContractInput = {
  plannedEntry?: number;
  supportLevel?: number;
  stopPrice?: number;
  targetPrice?: number;
};

function parseRequiredPrice(
  value: unknown,
  field: string,
  errors: string[]
): number | undefined {
  if (value === undefined || value === null || value === "") {
    errors.push(`${field} is required.`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    errors.push(`${field} must be a valid number.`);
    return undefined;
  }
  if (n <= 0) {
    errors.push(`${field} must be greater than zero.`);
    return undefined;
  }
  return n;
}

/**
 * Hard Scout executability contract — every path that creates or backfills a Scout Plan.
 * When initialScout is present, plannedEntry/stopPrice/targetPrice are mandatory.
 */
export function validateScoutContract(
  scout: ScoutContractInput | undefined | null,
  options?: { prefix?: string; requirePresent?: boolean }
): { ok: true; plannedEntry: number; stopPrice: number; targetPrice: number; rr?: number } | { ok: false; errors: string[] } {
  const prefix = options?.prefix ?? "initialScout";
  const errors: string[] = [];

  if (!scout) {
    if (options?.requirePresent) {
      return { ok: false, errors: [`${prefix} is required.`] };
    }
    return { ok: false, errors: [`${prefix} is missing.`] };
  }

  if (scout.supportLevel !== undefined && scout.plannedEntry === undefined) {
    errors.push(
      `${prefix}.plannedEntry is required. Profile support zones are not a substitute for an exact operational entry.`
    );
  }

  const plannedEntry = parseRequiredPrice(scout.plannedEntry, `${prefix}.plannedEntry`, errors);
  const stopPrice = parseRequiredPrice(scout.stopPrice, `${prefix}.stopPrice`, errors);
  const targetPrice = parseRequiredPrice(scout.targetPrice, `${prefix}.targetPrice`, errors);

  if (errors.length) {
    return { ok: false, errors: [...errors, "No records were created."] };
  }

  const entry = plannedEntry!;
  const stop = stopPrice!;
  const target = targetPrice!;

  if (!(stop < entry && entry < target)) {
    return {
      ok: false,
      errors: [
        `${prefix}: for a long setup, stopPrice (${stop}) must be less than plannedEntry (${entry}), which must be less than targetPrice (${target}).`,
        "No records were created.",
      ],
    };
  }

  const rr = computePlannedRR(entry, stop, target)?.rr;
  return { ok: true, plannedEntry: entry, stopPrice: stop, targetPrice: target, rr };
}

export function validateOptionalInitialScoutContract(
  scout: ScoutContractInput | undefined | null,
  prefix = "initialScout"
): { ok: true; plannedEntry?: number; stopPrice?: number; targetPrice?: number; rr?: number } | { ok: false; errors: string[] } {
  if (scout === undefined || scout === null) {
    return { ok: true };
  }
  const hasAny =
    scout.plannedEntry !== undefined ||
    scout.stopPrice !== undefined ||
    scout.targetPrice !== undefined ||
    scout.supportLevel !== undefined;
  if (!hasAny) {
    return { ok: true };
  }
  return validateScoutContract(scout, { prefix, requirePresent: true });
}
