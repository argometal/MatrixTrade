/**
 * Sync plan-outcome validation + derivation (no fs / store imports — safe for bridge).
 */

import { computePlannedRR } from "./plan-risk";
import type { TradePlan } from "./plan-types";
import {
  isPlanNonExecutionReason,
  isPlanOutcomeKind,
  PLAN_OUTCOME_PROPOSAL_ALLOWED_KEYS,
  type PlanOutcomeKind,
  type PlanOutcomeProposal,
  type PlanNonExecutionReason,
} from "./plan-outcome-types";

export type DerivedPlanOutcomeMetrics = {
  realizedR: number;
  realizedPnL: number;
  counterfactualR?: number;
  counterfactualDollarResult?: number;
  excludedFromMetrics: boolean;
};

function asBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  return undefined;
}

export function parsePlanOutcomeProposal(
  proposal: Record<string, unknown>
): { ok: true; value: PlanOutcomeProposal } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const unknown = Object.keys(proposal).filter(
    (k) =>
      !(PLAN_OUTCOME_PROPOSAL_ALLOWED_KEYS as readonly string[]).includes(k)
  );
  if (unknown.length) {
    errors.push(
      `proposal has unknown keys (schema-first): ${unknown.join(", ")}. Allowed: ${PLAN_OUTCOME_PROPOSAL_ALLOWED_KEYS.join(", ")}`
    );
  }

  const planId = String(proposal.planId ?? "")
    .trim()
    .toUpperCase();
  if (!planId) errors.push("proposal.planId required");

  if (!isPlanOutcomeKind(proposal.outcome)) {
    errors.push(
      proposal.outcome === undefined
        ? "proposal.outcome required"
        : `proposal.outcome unsupported (got ${String(proposal.outcome)})`
    );
  }

  const entryReached = asBool(proposal.entryReached);
  const stopReachedBeforeTarget = asBool(proposal.stopReachedBeforeTarget);
  const targetReachedBeforeStop = asBool(proposal.targetReachedBeforeStop);

  if (proposal.entryReached !== undefined && entryReached === undefined) {
    errors.push("proposal.entryReached must be boolean");
  }
  if (
    proposal.stopReachedBeforeTarget !== undefined &&
    stopReachedBeforeTarget === undefined
  ) {
    errors.push("proposal.stopReachedBeforeTarget must be boolean");
  }
  if (
    proposal.targetReachedBeforeStop !== undefined &&
    targetReachedBeforeStop === undefined
  ) {
    errors.push("proposal.targetReachedBeforeStop must be boolean");
  }

  let nonExecutionReason: PlanNonExecutionReason | undefined;
  if (proposal.nonExecutionReason !== undefined) {
    if (!isPlanNonExecutionReason(proposal.nonExecutionReason)) {
      errors.push(
        `proposal.nonExecutionReason unsupported (got ${String(proposal.nonExecutionReason)})`
      );
    } else {
      nonExecutionReason = proposal.nonExecutionReason;
    }
  }

  if (
    proposal.strategyStillValid !== undefined &&
    typeof proposal.strategyStillValid !== "boolean"
  ) {
    errors.push("proposal.strategyStillValid must be boolean");
  }

  if (errors.length) return { ok: false, errors };

  const outcome = proposal.outcome as PlanOutcomeKind;
  return {
    ok: true,
    value: {
      planId,
      outcome,
      entryReached,
      stopReachedBeforeTarget,
      targetReachedBeforeStop,
      nonExecutionReason,
      notes:
        proposal.notes !== undefined
          ? String(proposal.notes).trim() || undefined
          : undefined,
      canonicalPlanId:
        proposal.canonicalPlanId !== undefined
          ? String(proposal.canonicalPlanId).trim().toUpperCase() || undefined
          : undefined,
      strategyStillValid:
        typeof proposal.strategyStillValid === "boolean"
          ? proposal.strategyStillValid
          : undefined,
    },
  };
}

/** Sync field validation (no IO) — used by validateProposalPayload. */
export function validatePlanOutcomeProposalFields(
  proposal: Record<string, unknown>
): string[] {
  const parsed = parsePlanOutcomeProposal(proposal);
  if (!parsed.ok) return parsed.errors;
  const p = parsed.value;
  const errors: string[] = [];

  if (p.stopReachedBeforeTarget === true && p.targetReachedBeforeStop === true) {
    errors.push(
      "stopReachedBeforeTarget and targetReachedBeforeStop cannot both be true"
    );
  }

  if (p.outcome === "unexecuted_plan_loss") {
    if (p.entryReached !== true) {
      errors.push("unexecuted_plan_loss requires entryReached=true");
    }
    if (p.stopReachedBeforeTarget !== true) {
      errors.push("unexecuted_plan_loss requires stopReachedBeforeTarget=true");
    }
    if (p.targetReachedBeforeStop === true) {
      errors.push(
        "unexecuted_plan_loss requires targetReachedBeforeStop=false or absent"
      );
    }
  }

  if (p.outcome === "duplicate_creation") {
    if (
      p.nonExecutionReason !== undefined &&
      p.nonExecutionReason !== "duplicate_creation"
    ) {
      errors.push("duplicate_creation must use nonExecutionReason=duplicate_creation");
    }
  }

  return errors;
}

export function resolveAuthorizedRiskAmount(plan: TradePlan): number | undefined {
  const n = plan.layeredEntry?.authorizedRiskAmount;
  if (n !== undefined && Number.isFinite(n) && n > 0) return n;
  return undefined;
}

export function deriveCounterfactualR(
  plan: TradePlan,
  flags: {
    entryReached?: boolean;
    stopReachedBeforeTarget?: boolean;
    targetReachedBeforeStop?: boolean;
  }
): number | undefined {
  const entry = plan.plannedEntry;
  const stop = plan.stopPrice;
  const target = plan.targetPrice;
  if (
    entry === undefined ||
    stop === undefined ||
    target === undefined ||
    !(entry > stop) ||
    !(target > entry)
  ) {
    return undefined;
  }

  if (flags.entryReached && flags.stopReachedBeforeTarget && !flags.targetReachedBeforeStop) {
    return -1;
  }
  if (flags.entryReached && flags.targetReachedBeforeStop && !flags.stopReachedBeforeTarget) {
    const rr = computePlannedRR(entry, stop, target)?.rr;
    return rr !== undefined ? Math.round(rr * 10000) / 10000 : undefined;
  }
  return undefined;
}

export function derivePlanOutcomeMetrics(
  plan: TradePlan,
  outcome: PlanOutcomeKind,
  flags: {
    entryReached?: boolean;
    stopReachedBeforeTarget?: boolean;
    targetReachedBeforeStop?: boolean;
  }
): DerivedPlanOutcomeMetrics {
  const excludedFromMetrics = outcome === "duplicate_creation";
  if (excludedFromMetrics) {
    return {
      realizedR: 0,
      realizedPnL: 0,
      excludedFromMetrics: true,
    };
  }

  const counterfactualR = deriveCounterfactualR(plan, flags);
  const authorized = resolveAuthorizedRiskAmount(plan);
  let counterfactualDollarResult: number | undefined;
  if (
    counterfactualR !== undefined &&
    authorized !== undefined &&
    outcome === "unexecuted_plan_loss"
  ) {
    counterfactualDollarResult = -authorized;
  } else if (
    counterfactualR !== undefined &&
    authorized !== undefined &&
    counterfactualR > 0
  ) {
    counterfactualDollarResult =
      Math.round(authorized * counterfactualR * 100) / 100;
  }

  return {
    realizedR: 0,
    realizedPnL: 0,
    counterfactualR,
    counterfactualDollarResult,
    excludedFromMetrics: false,
  };
}
