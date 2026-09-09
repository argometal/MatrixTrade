/**
 * Duplicate Scout windows — administrative records, not independent economic observations.
 *
 * Canonical mark: plan.outcome.outcomeKind === "duplicate_creation"
 * and/or Learning Outcome kind duplicate_creation (excludedFromMetrics).
 *
 * Does NOT invent parent/root linkage. Contaminated duplicate rows should be
 * deleted from the canonical store when safe; these helpers protect aggregates
 * if a duplicate_creation mark still exists.
 */

import type { LearningOutcome } from "./learning-outcome-types";
import type { TradePlan } from "./plan-types";

export function isDuplicateCreationLearningOutcome(
  lo: Pick<LearningOutcome, "kind" | "excludedFromMetrics"> | null | undefined
): boolean {
  if (!lo) return false;
  return lo.kind === "duplicate_creation" || lo.excludedFromMetrics === true;
}

export function isDuplicateCreationPlan(
  plan: Pick<TradePlan, "outcome"> | null | undefined
): boolean {
  return plan?.outcome?.outcomeKind === "duplicate_creation";
}

/**
 * True when this Plan/LO must not count as an independent Case/economic observation.
 * Zero independent weight — prefer DELETE of contaminated duplicates when safe.
 */
export function isDuplicateEconomicObservation(input: {
  plan?: Pick<TradePlan, "outcome"> | null;
  learningOutcome?: Pick<LearningOutcome, "kind" | "excludedFromMetrics"> | null;
}): boolean {
  if (isDuplicateCreationPlan(input.plan)) return true;
  if (input.learningOutcome?.kind === "duplicate_creation") return true;
  return false;
}

/** Prefer explicit plan outcome; fall back to LO kind for legacy joins. */
export function findDuplicateCreationLearningOutcome(
  planId: string,
  learningOutcomes: LearningOutcome[]
): LearningOutcome | null {
  const key = planId.toUpperCase();
  return (
    learningOutcomes.find(
      (lo) =>
        lo.planId?.toUpperCase() === key && lo.kind === "duplicate_creation"
    ) ?? null
  );
}

export function isIndependentEconomicObservation(input: {
  plan?: Pick<TradePlan, "outcome"> | null;
  learningOutcome?: Pick<LearningOutcome, "kind" | "excludedFromMetrics"> | null;
}): boolean {
  return !isDuplicateEconomicObservation(input);
}
