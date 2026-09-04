/**
 * MXT 028 — pure evidence rollup (safe for client components).
 * Origin Case is excluded. Never auto-claims Supported/Rejected.
 */
import type { InsightsCaseRow } from "./insights-case-spine-types";
import type { ImprovementEvidenceSummary } from "./improvement-hypothesis-types";

/** Minimum independent Cases before the UI suggests "review_ready" (provisional UI guidance — not a sealed MXT learning threshold). */
export const IMPROVEMENT_EVIDENCE_REVIEW_READY_MIN = 3;

export function summarizeImprovementEvidence(input: {
  hypothesisId: string;
  originPlanId: string;
  evidencePlanIds: string[];
  caseSpine: InsightsCaseRow[];
}): ImprovementEvidenceSummary {
  const origin = input.originPlanId.toUpperCase();
  const evidenceIds = [
    ...new Set(
      input.evidencePlanIds
        .map((id) => id.toUpperCase())
        .filter((id) => id && id !== origin)
    ),
  ];

  const familyCounts: Partial<Record<string, number>> = {};
  const decisionQualityCounts: Partial<Record<string, number>> = {};
  let casesWithSpine = 0;

  for (const planId of evidenceIds) {
    const row = input.caseSpine.find((r) => r.planId.toUpperCase() === planId);
    if (!row) continue;
    casesWithSpine += 1;
    familyCounts[row.family] = (familyCounts[row.family] ?? 0) + 1;
    decisionQualityCounts[row.decisionQuality] =
      (decisionQualityCounts[row.decisionQuality] ?? 0) + 1;
  }

  const independentEvidenceCount = evidenceIds.length;
  const enough =
    independentEvidenceCount >= IMPROVEMENT_EVIDENCE_REVIEW_READY_MIN &&
    casesWithSpine >= IMPROVEMENT_EVIDENCE_REVIEW_READY_MIN;

  return {
    hypothesisId: input.hypothesisId,
    originPlanId: input.originPlanId,
    evidencePlanIds: evidenceIds,
    independentEvidenceCount,
    casesWithSpine,
    familyCounts,
    decisionQualityCounts,
    suggestedIndication: enough ? "review_ready" : "insufficient_evidence",
    suggestionReason: enough
      ? `At least ${IMPROVEMENT_EVIDENCE_REVIEW_READY_MIN} independent future Cases with spine rows — human may set Supported / Rejected / Insufficient.`
      : `Independent future evidence is below the review threshold (${casesWithSpine}/${IMPROVEMENT_EVIDENCE_REVIEW_READY_MIN} Cases with spine; ${independentEvidenceCount} linked Plans). Do not claim learning yet.`,
  };
}
