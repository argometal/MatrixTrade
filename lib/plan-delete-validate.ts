/**
 * Client-safe plan-delete proposal validation.
 * Must NOT import stores, plans, or Node fs — bridge/ControlPanel use this on the client.
 *
 * Apply type: plan-delete (planId + reason). Server integrity checks live in
 * contaminated-plan-delete.ts (human Accept only).
 */

/** Schema-first Validate for Apply type plan-delete. */
export function validatePlanDeleteProposal(
  proposal: Record<string, unknown>
): { ok: true; planId: string; reason: string } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const planId = String(proposal.planId ?? "").trim().toUpperCase();
  if (!planId) errors.push("proposal.planId required");
  const reason = String(proposal.reason ?? "").trim();
  if (reason.length < 8) {
    errors.push("proposal.reason required (≥8 characters)");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, planId, reason };
}
