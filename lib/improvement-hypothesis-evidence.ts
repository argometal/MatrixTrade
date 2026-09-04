/**
 * MXT 028 — aggregate future Case evidence against an Improvement Hypothesis.
 */
import type { InsightsCaseRow } from "./insights-case-spine-types";
import { getImprovementHypothesisById } from "./improvement-hypothesis-store";
import type { ImprovementEvidenceSummary } from "./improvement-hypothesis-types";
import { summarizeImprovementEvidence } from "./improvement-hypothesis-evidence-summary";

export {
  IMPROVEMENT_EVIDENCE_REVIEW_READY_MIN,
  summarizeImprovementEvidence,
} from "./improvement-hypothesis-evidence-summary";

export async function getImprovementEvidenceSummary(
  hypothesisId: string,
  caseSpine: InsightsCaseRow[]
): Promise<ImprovementEvidenceSummary | null> {
  const h = await getImprovementHypothesisById(hypothesisId);
  if (!h) return null;
  return summarizeImprovementEvidence({
    hypothesisId: h.id,
    originPlanId: h.originPlanId,
    evidencePlanIds: h.evidencePlanIds,
    caseSpine,
  });
}
