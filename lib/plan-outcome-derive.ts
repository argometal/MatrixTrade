/**
 * Server-derived Scout outcome values — never trust AI-supplied counterfactualR / realizedR.
 */
import type { TradePlan } from "./plan-types";
import { computePlannedRR } from "./plan-risk";
import type { NonExecutionReason } from "./plan-outcome-types";

export type UnexecutedPlanLossServerValues = {
  realizedR: 0;
  realizedPnL: 0;
  counterfactualR: -1;
  counterfactualDollarResult: number | null;
};

export type MissedOpportunityServerValues = {
  realizedR: 0;
  realizedPnL: 0;
  /** Missed planned move magnitude (+R from plan geometry); not a fill. */
  counterfactualR: number;
  counterfactualDollarResult: number | null;
};

export function planHasCounterfactualGeometry(plan: TradePlan): boolean {
  return (
    plan.plannedEntry !== undefined &&
    Number.isFinite(plan.plannedEntry) &&
    plan.stopPrice !== undefined &&
    Number.isFinite(plan.stopPrice) &&
    plan.targetPrice !== undefined &&
    Number.isFinite(plan.targetPrice)
  );
}

export function resolveAuthorizedRiskAmount(plan: TradePlan): number | null {
  const raw = plan.layeredEntry?.authorizedRiskAmount;
  if (raw === undefined || raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Planned R from persisted geometry (or stored plannedRR). */
export function resolvePlanCounterfactualRR(plan: TradePlan): number | null {
  if (
    plan.plannedEntry !== undefined &&
    plan.stopPrice !== undefined &&
    plan.targetPrice !== undefined
  ) {
    const computed = computePlannedRR(
      plan.plannedEntry,
      plan.stopPrice,
      plan.targetPrice
    );
    if (computed && Number.isFinite(computed.rr) && computed.rr > 0) {
      return Math.round(computed.rr * 100) / 100;
    }
  }
  if (plan.plannedRR !== undefined && Number.isFinite(plan.plannedRR) && plan.plannedRR > 0) {
    return Math.round(plan.plannedRR * 100) / 100;
  }
  return null;
}

/** Derive UPL account + counterfactual Scout results. Dollar only from persisted risk. */
export function deriveUnexecutedPlanLossServerValues(
  plan: TradePlan
): UnexecutedPlanLossServerValues {
  const authorized = resolveAuthorizedRiskAmount(plan);
  return {
    realizedR: 0,
    realizedPnL: 0,
    counterfactualR: -1,
    counterfactualDollarResult: authorized !== null ? -authorized : null,
  };
}

/**
 * Missed opportunity: no fill (realized 0); counterfactual = +planned R
 * (what the Scout would have captured had entry been available — not a pretend fill).
 */
export function deriveMissedOpportunityServerValues(
  plan: TradePlan
): MissedOpportunityServerValues | { error: string } {
  const rr = resolvePlanCounterfactualRR(plan);
  if (rr === null) {
    return {
      error:
        "Plan lacks computable planned R (plannedEntry/stop/target or plannedRR) for missed_opportunity counterfactual",
    };
  }
  const authorized = resolveAuthorizedRiskAmount(plan);
  return {
    realizedR: 0,
    realizedPnL: 0,
    counterfactualR: rr,
    counterfactualDollarResult:
      authorized !== null ? Math.round(authorized * rr * 100) / 100 : null,
  };
}

export function planEligibleForOutcomeClosure(plan: TradePlan): boolean {
  if (
    plan.status === "failed" ||
    plan.status === "expired" ||
    plan.status === "skipped"
  ) {
    return true;
  }
  if (plan.validUntil && Number.isFinite(Date.parse(plan.validUntil))) {
    if (Date.parse(plan.validUntil) < Date.now()) return true;
  }
  // Active plans may still be closed via explicit outcome when human confirms terminal path.
  if (plan.status === "watching" || plan.status === "ready") return true;
  return false;
}

export type UplEligibilityInput = {
  entryReached: boolean;
  stopReachedBeforeTarget: boolean;
  targetReachedBeforeStop: boolean;
  nonExecutionReason?: NonExecutionReason;
};

export function validateUnexecutedPlanLossEligibility(
  plan: TradePlan,
  input: UplEligibilityInput,
  opts?: { linkedTradeIds?: string[] }
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!planEligibleForOutcomeClosure(plan)) {
    errors.push(
      `Plan ${plan.id} is not terminal or eligible for outcome closure (status=${plan.status})`
    );
  }
  if (plan.linkedTradeId) {
    errors.push(
      `Plan ${plan.id} has linkedTradeId ${plan.linkedTradeId} — use executed outcome path, not unexecuted_plan_loss`
    );
  }
  if (opts?.linkedTradeIds?.length) {
    errors.push(
      `Plan ${plan.id} has linked Trade/fill (${opts.linkedTradeIds.join(", ")}) — unexecuted_plan_loss rejected`
    );
  }
  if (!planHasCounterfactualGeometry(plan)) {
    errors.push(
      "Plan lacks persisted plannedEntry/stopPrice/targetPrice required to derive counterfactual result"
    );
  }
  if (input.entryReached !== true) {
    errors.push("unexecuted_plan_loss requires entryReached: true");
  }
  if (input.stopReachedBeforeTarget !== true) {
    errors.push("unexecuted_plan_loss requires stopReachedBeforeTarget: true");
  }
  if (input.targetReachedBeforeStop !== false) {
    errors.push("unexecuted_plan_loss requires targetReachedBeforeStop: false");
  }
  if (!input.nonExecutionReason) {
    errors.push("unexecuted_plan_loss requires nonExecutionReason");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

export type MissEligibilityInput = {
  entryReached: boolean;
  stopReachedBeforeTarget: boolean;
  targetReachedBeforeStop: boolean;
  nonExecutionReason?: NonExecutionReason;
};

export function validateMissedOpportunityEligibility(
  plan: TradePlan,
  input: MissEligibilityInput,
  opts?: { linkedTradeIds?: string[] }
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!planEligibleForOutcomeClosure(plan)) {
    errors.push(
      `Plan ${plan.id} is not terminal or eligible for outcome closure (status=${plan.status})`
    );
  }
  if (plan.linkedTradeId) {
    errors.push(
      `Plan ${plan.id} has linkedTradeId ${plan.linkedTradeId} — use executed outcome path, not missed_opportunity`
    );
  }
  if (opts?.linkedTradeIds?.length) {
    errors.push(
      `Plan ${plan.id} has linked Trade/fill (${opts.linkedTradeIds.join(", ")}) — missed_opportunity rejected`
    );
  }
  if (!planHasCounterfactualGeometry(plan)) {
    errors.push(
      "Plan lacks persisted plannedEntry/stopPrice/targetPrice required for missed_opportunity"
    );
  }
  if (input.entryReached !== false) {
    errors.push("missed_opportunity requires entryReached: false");
  }
  if (input.targetReachedBeforeStop !== true) {
    errors.push("missed_opportunity requires targetReachedBeforeStop: true");
  }
  if (input.stopReachedBeforeTarget !== false) {
    errors.push("missed_opportunity requires stopReachedBeforeTarget: false");
  }
  if (input.nonExecutionReason !== "entry_not_reached") {
    errors.push("missed_opportunity requires nonExecutionReason: entry_not_reached");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
