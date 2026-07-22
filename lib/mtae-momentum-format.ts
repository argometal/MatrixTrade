import type {
  MtaeAssessment,
  MtaeMomentumAssessment,
  MtaeMovementCharacter,
} from "./mtae-types";

const NOT_ASSESSED = "Not assessed";

export function formatExpansionLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function formatMovementCharacterLine(
  mc: MtaeMovementCharacter | undefined
): string {
  if (!mc) return NOT_ASSESSED;
  const parts: string[] = [];
  if (mc.state) {
    parts.push(
      `${formatExpansionLabel(mc.state)} · eff ${mc.directionalEfficiency ?? "—"} · range ${mc.rangeProgression ?? "—"}`
    );
  }
  if (mc.primary) {
    parts.push(`pattern ${formatExpansionLabel(mc.primary)}`);
  }
  parts.push(`conf ${mc.confidence}`);
  return parts.join(" · ");
}

export function formatMomentumAssessmentBlock(
  assessment: MtaeMomentumAssessment | undefined | null
): string {
  if (!assessment) return NOT_ASSESSED;
  return [
    `Expansion potential: ${formatExpansionLabel(assessment.expansionPotential)}`,
    `Current state: ${formatExpansionLabel(assessment.currentState)}`,
    `Capital efficiency concern: ${assessment.capitalEfficiencyConcern ? "yes" : "no"}`,
    `Scout implication: ${formatExpansionLabel(assessment.scoutImplication)}`,
    `Confidence: ${assessment.confidence}`,
    "Rationale:",
    ...assessment.rationale.map((line) => `- ${line}`),
  ].join("\n");
}

/** Human-readable snapshot section for a stored MTAE assessment. */
export function formatMtaeAssessmentSnapshot(assessment: MtaeAssessment): string {
  const momentum = formatMomentumAssessmentBlock(
    assessment.integrated.momentumAssessment
  );
  const tfLines = assessment.perTimeframe.map((tf) => {
    const mc = tf.participation?.movementCharacter;
    return `- ${tf.timeframe}: ${formatMovementCharacterLine(mc)}`;
  });

  return [
    `=== MTAE ASSESSMENT · ${assessment.id} ===`,
    `ticker:${assessment.ticker}`,
    `stockProfileId:${assessment.stockProfileId}`,
    assessment.asOfPrice !== undefined ? `asOfPrice:${assessment.asOfPrice}` : null,
    `createdAt:${assessment.createdAt}`,
    "",
    "STRUCTURE (summary)",
    assessment.integrated.structureSpine,
    assessment.technicalSummary.structureNote,
    `Invalidation: ${assessment.technicalSummary.structuralInvalidation}`,
    "",
    "MOMENTUM / EXPANSION",
    momentum,
    "",
    "PER-TF MOVEMENT",
    ...tfLines,
    "",
    "Note: Momentum Assessment is technical context only — not a Scout verdict,",
    "not Entry Solver, not capital allocation. Low expansion ≠ thesis invalidation.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export const MTAE_NOT_ASSESSED_LABEL = NOT_ASSESSED;
