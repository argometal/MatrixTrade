/**
 * Canonical Scout Plan IDs: PLAN-<number>
 * - Minimum padding = 3 digits (PLAN-009), not a maximum length
 * - PLAN-999 → PLAN-1000 → PLAN-15432 are all valid
 * - Allocation is global (never ticker-scoped)
 */

export const PLAN_ID_PATTERN = /^PLAN-[0-9]+$/i;
/** Supabase CHECK / SQL equivalent (case-sensitive uppercase PLAN-). */
export const PLAN_ID_SQL_REGEX = "^PLAN-[0-9]+$";

export class PlanIdCollisionError extends Error {
  readonly code = "PLAN_ID_COLLISION" as const;
  readonly planId: string;

  constructor(planId: string, message?: string) {
    super(message ?? `Plan ID ${planId} already exists.`);
    this.name = "PlanIdCollisionError";
    this.planId = planId;
  }
}

export function isCanonicalPlanId(id: string): boolean {
  return PLAN_ID_PATTERN.test(String(id ?? "").trim());
}

/** Parse numeric suffix; returns null if not PLAN-<digits>. */
export function parsePlanIdNumber(id: string): number | null {
  const match = /^PLAN-(\d+)$/i.exec(String(id ?? "").trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Format n as PLAN-xxx with min 3-digit padding (no upper length cap). */
export function formatPlanId(n: number): string {
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    throw new Error(`Invalid plan id number: ${n}`);
  }
  return `PLAN-${String(n).padStart(3, "0")}`;
}

/** Highest PLAN-<n> among plans (global). Non-canonical ids ignored. */
export function maxPlanIdNumber(
  plans: ReadonlyArray<{ id: string }>
): number {
  let max = 0;
  for (const plan of plans) {
    const n = parsePlanIdNumber(plan.id);
    if (n !== null) max = Math.max(max, n);
  }
  return max;
}

/**
 * Pure next-id from an in-memory plan list (and optional high-water mark).
 * Does not mutate anything — stores use this after locking / sequencing.
 */
export function nextPlanIdFromMax(maxInclusive: number): string {
  return formatPlanId(Math.max(0, maxInclusive) + 1);
}

export function nextPlanId(plans: ReadonlyArray<{ id: string }>): string {
  return nextPlanIdFromMax(maxPlanIdNumber(plans));
}

/**
 * scout-plan-create must not accept client-supplied ids.
 * Returns an error message when id/planId is present (even empty string after trim of object key).
 */
export function rejectClientSuppliedPlanId(
  proposal: Record<string, unknown>
): string | null {
  if (Object.prototype.hasOwnProperty.call(proposal, "id")) {
    return "proposal.id must not be supplied; server allocates PLAN ids";
  }
  if (Object.prototype.hasOwnProperty.call(proposal, "planId")) {
    return "proposal.planId must not be supplied; server allocates PLAN ids";
  }
  return null;
}
