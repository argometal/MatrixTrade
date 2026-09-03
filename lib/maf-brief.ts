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
    "Observation (before attribution):",
    "- May be partial while the 90-day post-stop window is open (status observing).",
    "- Deterministic evidence only — never invent prices, timestamps, MFE/MAE, or event order.",
    "- Observation ≠ attribution; does not auto-set lossClassification or create MAF.",
    "- Final study completion: 90-day window end OR earlier thesis invalidation (status concluded).",
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
    "Historical / pre-MXT closed trades may attribute by tradeId alone (Plan/T0 may be absent).",
    "trade-review and reconstructed historical hints are evidence — not accepted MAF until human Accept.",
  ].join("\n");
}
