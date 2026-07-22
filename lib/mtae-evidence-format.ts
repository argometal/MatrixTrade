/**
 * Evidence-first MTAE presentation — default human/AI readable layout.
 * Timeframes first (Supports → Resistances/Targets → Bias → Confidence),
 * then Integrated, then Profile Notes. Never Scout capital decisions.
 */
import type {
  MtaeAssessment,
  MtaeMomentumAssessment,
  MtaeRankedLevel,
  MtaeTimeframeReport,
} from "./mtae-types";
import {
  formatExpansionLabel,
  formatMomentumAssessmentBlock,
  MTAE_NOT_ASSESSED_LABEL,
} from "./mtae-momentum-format";

function formatLevel(level: MtaeRankedLevel): string {
  if (level.zone) {
    return `${level.zone.low}–${level.zone.high}`;
  }
  if (level.price !== undefined) return String(level.price);
  return level.reason.trim() || "—";
}

function formatLevelList(levels: MtaeRankedLevel[]): string {
  if (!levels.length) return "—";
  const sorted = [...levels].sort((a, b) => a.rank - b.rank);
  return sorted.map((l) => formatLevel(l)).join(" · ");
}

function formatTargets(tf: MtaeTimeframeReport): string {
  const parts: string[] = [];
  if (tf.resistances.length) parts.push(formatLevelList(tf.resistances));
  if (tf.probableTarget !== undefined) parts.push(`probable ${tf.probableTarget}`);
  if (tf.extendedTarget !== undefined) parts.push(`extended ${tf.extendedTarget}`);
  return parts.length ? parts.join(" · ") : "—";
}

/** One optional explanation sentence — strip excess prose. */
export function oneSentenceExplanation(summary: string | undefined): string | undefined {
  const raw = String(summary ?? "").trim();
  if (!raw) return undefined;
  const first = raw.split(/(?<=[.!?])\s+/)[0]?.trim() ?? raw;
  const clipped = first.length > 140 ? `${first.slice(0, 137)}…` : first;
  return clipped || undefined;
}

export type EvidenceFirstTimeframeBlock = {
  timeframe: string;
  supports: string;
  resistancesTargets: string;
  bias: string;
  confidence: number;
  explanation?: string;
};

export function formatEvidenceFirstTimeframe(
  tf: MtaeTimeframeReport
): EvidenceFirstTimeframeBlock {
  return {
    timeframe: tf.timeframe,
    supports: formatLevelList(tf.supports),
    resistancesTargets: formatTargets(tf),
    bias: tf.trend,
    confidence: tf.trendConfidence,
    explanation: oneSentenceExplanation(tf.summary),
  };
}

export type EvidenceFirstIntegrated = {
  overallTechnicalThesis: string;
  momentumAssessment: string;
  structuralRisks: string[];
  importantNotes: string[];
};

export function formatEvidenceFirstIntegrated(
  assessment: MtaeAssessment
): EvidenceFirstIntegrated {
  const ts = assessment.technicalSummary;
  const integrated = assessment.integrated;
  const momentum = formatMomentumAssessmentBlock(integrated.momentumAssessment);

  const structuralRisks: string[] = [];
  if (ts.structuralInvalidation.trim()) {
    structuralRisks.push(`Invalidation: ${ts.structuralInvalidation.trim()}`);
  }
  for (const c of [...ts.contradictions, ...integrated.contradictions]) {
    const line = c.trim();
    if (line && !structuralRisks.includes(line)) structuralRisks.push(line);
  }
  if (!structuralRisks.length) structuralRisks.push("—");

  const importantNotes: string[] = [];
  if (integrated.opportunityNote.trim()) importantNotes.push(integrated.opportunityNote.trim());
  if (integrated.executionContext.trim()) importantNotes.push(integrated.executionContext.trim());
  if (!importantNotes.length) importantNotes.push("—");

  const thesis =
    integrated.structureSpine.trim() ||
    ts.structureNote.trim() ||
    MTAE_NOT_ASSESSED_LABEL;

  return {
    overallTechnicalThesis: thesis,
    momentumAssessment: momentum,
    structuralRisks,
    importantNotes,
  };
}

/** Full Evidence First text — default MTAE human presentation. */
export function formatMtaeEvidenceFirstView(
  assessment: MtaeAssessment,
  options?: { profileNotes?: string | null }
): string {
  const header = [
    `=== MTAE · ${assessment.ticker} · ${assessment.id} ===`,
    assessment.asOfPrice !== undefined ? `asOfPrice: ${assessment.asOfPrice}` : null,
    "",
    "EVIDENCE FIRST — timeframes (compare quickly; no narrative here)",
  ].filter((l) => l !== null) as string[];

  const tfBlocks: string[] = [];
  for (const tf of assessment.perTimeframe) {
    const b = formatEvidenceFirstTimeframe(tf);
    tfBlocks.push(
      [
        b.timeframe,
        `Supports: ${b.supports}`,
        `Resistances / Targets: ${b.resistancesTargets}`,
        `Bias: ${b.bias}`,
        `Confidence: ${b.confidence}`,
        b.explanation ? b.explanation : null,
        "",
      ]
        .filter((l) => l !== null)
        .join("\n")
    );
  }

  const integ = formatEvidenceFirstIntegrated(assessment);
  const integratedBlock = [
    "INTEGRATED",
    `Overall Technical Thesis: ${integ.overallTechnicalThesis}`,
    "",
    "Momentum Assessment (expansion quality — not a trade decision):",
    integ.momentumAssessment,
    "",
    "Structural Risks:",
    ...integ.structuralRisks.map((r) => `- ${r}`),
    "",
    "Important Notes:",
    ...integ.importantNotes.map((n) => `- ${n}`),
    "",
  ].join("\n");

  const notes = String(options?.profileNotes ?? "").trim();
  const profileBlock = [
    "PROFILE NOTES",
    notes || "(none)",
    "",
    "Scout owns go/wait/no, entry optimization, sizing, and capital allocation — not MTAE.",
  ].join("\n");

  return [...header, "", ...tfBlocks, integratedBlock, profileBlock].join("\n");
}

/** @deprecated Prefer formatMtaeEvidenceFirstView — kept for callers. */
export function formatMtaeAssessmentSnapshot(assessment: MtaeAssessment): string {
  return formatMtaeEvidenceFirstView(assessment);
}

export function formatMomentumForUi(
  momentum: MtaeMomentumAssessment | undefined
): {
  expansion: string;
  state: string;
  implication: string;
  concern: boolean;
  confidence: number;
  rationale: string[];
} | null {
  if (!momentum) return null;
  return {
    expansion: formatExpansionLabel(momentum.expansionPotential),
    state: formatExpansionLabel(momentum.currentState),
    implication: formatExpansionLabel(momentum.scoutImplication),
    concern: momentum.capitalEfficiencyConcern,
    confidence: momentum.confidence,
    rationale: momentum.rationale,
  };
}
