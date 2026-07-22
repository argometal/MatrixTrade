import {
  getObservationById,
  getObservationByPlanId,
  getObservationByTradeId,
} from "./observation-store";
import { applyObservationUpdate, updateObservationById } from "./observation";
import { validateObservationUpdateProposal } from "./observation-validate";
import { upsertObservation } from "./observation-store";
import type { ObservationRecord } from "./observation-types";
import { getLearningOutcomeByTradeId, getLearningOutcomeByPlanId } from "./learning-outcome-store";
import { upsertLearningOutcome } from "./learning-outcome-store";

export async function applyObservationUpdateProposal(
  proposal: Record<string, unknown>
): Promise<{ observation?: ObservationRecord; errors?: string[] }> {
  const parsed = validateObservationUpdateProposal(proposal);
  if (!parsed.ok) return { errors: parsed.errors };

  const { observationId, tradeId, planId, patch } = parsed.value;
  let existing =
    (observationId ? await getObservationById(observationId) : undefined) ??
    (tradeId ? await getObservationByTradeId(tradeId) : undefined) ??
    (planId ? await getObservationByPlanId(planId) : undefined);

  if (!existing) {
    return {
      errors: [
        `No observation found for ${observationId ?? tradeId ?? planId}. Close a losing trade or record a plan miss first.`,
      ],
    };
  }

  const updated = applyObservationUpdate(existing, {
    ...patch,
    dataSource: patch.dataSource ?? "ai",
  });
  await upsertObservation(updated);

  // If observation concluded, nudge learning outcome toward attribution-ready.
  if (updated.status === "concluded" && updated.learningOutcomeId) {
    const lo =
      (updated.tradeId
        ? await getLearningOutcomeByTradeId(updated.tradeId)
        : undefined) ??
      (updated.planId ? await getLearningOutcomeByPlanId(updated.planId) : undefined);
    if (lo && lo.lifecycleStatus === "observing") {
      await upsertLearningOutcome({
        ...lo,
        lifecycleStatus: "ready_for_attribution",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return { observation: updated };
}

export { updateObservationById };
