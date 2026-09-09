/**
 * Research Universe descriptor — compose-only governance contract.
 *
 * States for one analysis:
 *   N / eligible / exclusions / unavailable / observation window / unit of analysis
 *
 * Does NOT invent a universal unit of analysis.
 * Does NOT authorize predictive, causal, or recommendation claims.
 * Different Comparison/Learning paths may legitimately use different units.
 */

export type ResearchUnitOfAnalysis =
  | "non_executed_modern_case_path"
  | "checkpoint_within_opportunity_path"
  | "opportunity_sequence_with_trades"
  | "independent_economic_case"
  | "learning_outcome_bucket"
  | "actual_trade";

export type ResearchUniverseObservationWindow = {
  /** Explicit when Case-bound Reality windows govern the analysis. */
  kind: "case_bound_reality_window" | "not_applicable" | "mixed_or_unspecified";
  label: string;
  /** True when "no return" / pullback claims are bounded to a preserved window. */
  windowBounded: boolean;
};

export type ResearchUniverseDescriptor = {
  /** Eligible independent observations for this analysis (primary N). */
  n: number;
  eligible: number;
  excluded: number;
  unavailable: number | null;
  unitOfAnalysis: ResearchUnitOfAnalysis;
  unitLabel: string;
  observationWindow: ResearchUniverseObservationWindow;
  /**
   * Explicit reminder: raw records, eligible observations, and independent
   * economic observations are not interchangeable denominators.
   */
  denominatorNote: string;
  /** Descriptive-only — never a recommendation. */
  claimLevel: "descriptive";
};

export function buildParticipationResearchUniverse(input: {
  eligibleOpportunityCount: number;
  excludedOpportunityCount: number;
  unavailableOpportunityCount: number;
  eligibleWindowLabel: string;
}): ResearchUniverseDescriptor {
  return {
    n: input.eligibleOpportunityCount,
    eligible: input.eligibleOpportunityCount,
    excluded: input.excludedOpportunityCount,
    unavailable: input.unavailableOpportunityCount,
    unitOfAnalysis: "non_executed_modern_case_path",
    unitLabel:
      "Eligible non-executed modern Case/Opportunity path (not Trade; not checkpoint)",
    observationWindow: {
      kind: "case_bound_reality_window",
      label: input.eligibleWindowLabel,
      windowBounded: true,
    },
    denominatorNote:
      "Checkpoints nested under a path are trajectory observations, not independent trades. duplicate_creation and excludedFromMetrics do not increase independent N.",
    claimLevel: "descriptive",
  };
}

export function buildCheckpointResearchUniverse(input: {
  thresholdR: number;
  reachedCount: number;
  observationWindowEligibleCount: number;
}): ResearchUniverseDescriptor {
  return {
    n: input.observationWindowEligibleCount,
    eligible: input.observationWindowEligibleCount,
    excluded: Math.max(0, input.reachedCount - input.observationWindowEligibleCount),
    unavailable: null,
    unitOfAnalysis: "checkpoint_within_opportunity_path",
    unitLabel: `Checkpoint observation at ${input.thresholdR}R within an eligible Opportunity Path`,
    observationWindow: {
      kind: "case_bound_reality_window",
      label:
        "Post-checkpoint path observations are bounded to the preserved Case Reality window after first crossing.",
      windowBounded: true,
    },
    denominatorNote:
      "Multiple checkpoints from one Opportunity Path do not become independent trades or independent opportunities.",
    claimLevel: "descriptive",
  };
}

export function buildSequenceResearchUniverse(input: {
  eligibleOpportunityCount: number;
  duplicateZeroWeightCount: number;
  indeterminateLineageCount: number;
  summaryNote: string;
}): ResearchUniverseDescriptor {
  return {
    n: input.eligibleOpportunityCount,
    eligible: input.eligibleOpportunityCount,
    excluded: input.duplicateZeroWeightCount,
    unavailable: input.indeterminateLineageCount,
    unitOfAnalysis: "opportunity_sequence_with_trades",
    unitLabel:
      "Opportunity sequence with ≥1 canonically linked Trade attempt (cumulative actual Realized R)",
    observationWindow: {
      kind: "not_applicable",
      label:
        "Sequence accounting uses Trade chronology on linked Plans; it does not use Market Reality path windows.",
      windowBounded: false,
    },
    denominatorNote: input.summaryNote,
    claimLevel: "descriptive",
  };
}

export function buildCaseSpineResearchUniverse(input: {
  independentEconomicCaseCount: number;
  rawCaseRowCount: number;
}): ResearchUniverseDescriptor {
  const excluded = Math.max(
    0,
    input.rawCaseRowCount - input.independentEconomicCaseCount
  );
  return {
    n: input.independentEconomicCaseCount,
    eligible: input.independentEconomicCaseCount,
    excluded,
    unavailable: null,
    unitOfAnalysis: "independent_economic_case",
    unitLabel: "Independent economic Case (duplicate_creation zero-weight)",
    observationWindow: {
      kind: "mixed_or_unspecified",
      label:
        "Case spine rates use filtered independent economic Cases; Reality windows are Case-specific when present.",
      windowBounded: false,
    },
    denominatorNote:
      "Raw Case rows may include historical duplicate records. Insights cards/rates use independent economic observations only.",
    claimLevel: "descriptive",
  };
}
