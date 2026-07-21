import { MAF_COMPONENT_IDS, MAF_QUALITY_BANDS } from "./maf-types";

/**
 * Short protocol for external AI — paste when attributing a closed experiment.
 * Full rules live in Mechanics brief + md/matrix/maf-matrix-attribution-framework.md.
 */
export function buildMafProtocolBrief(): string {
  return [
    "=== MAF · MATRIX ATTRIBUTION FRAMEWORK ===",
    "Purpose: attribute expectancy change to decision-pipeline COMPONENTS — not journal P/L.",
    "Pipeline: Playbook → Stock File → Scout Plan → Trade → MAF.",
    "Atomic unit: Scout → Trade|Missed → Close → Observation → Attribution.",
    "",
    "AI is NOT source of truth for prices, dates, R, MFE, MAE, or event order.",
    "Deterministic Matrix code assembles evidence from Trade + Plan + PostStopStudy + TradeEvaluation.",
    "You may SUPPLY observation numbers the human stated — never invent them.",
    "",
    "Components:",
    ...MAF_COMPONENT_IDS.map((id) => `- ${id}`),
    "",
    "Classifications:",
    MAF_QUALITY_BANDS.join(" | "),
    "",
    "Each component row needs:",
    "component, classification, aiInterpretationConfidence (0-100), reasoning;",
    "optional: tag, suggestedImprovement, evidenceRefs.",
    "aiInterpretationConfidence = confidence that EVIDENCE supports the classification (not a statistical probability).",
    "",
    "Return ONE JSON block: type attribution.",
    "proposal: tradeId (and/or planId), components[], optional summary, primaryDragComponent, observation{}.",
  ].join("\n");
}
