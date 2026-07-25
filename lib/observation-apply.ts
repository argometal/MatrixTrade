import {
  getObservationById,
  getObservationByPlanId,
  getObservationsByTradeId,
  upsertObservation,
} from "./observation-store";
import {
  applyObservationUpdate,
  ensureObservationForClosedTrade,
  startObservationForPlanMiss,
} from "./observation";
import { validateObservationUpdateProposal } from "./observation-validate";
import type { ObservationRecord } from "./observation-types";
import {
  getLearningOutcomeByTradeId,
  getLearningOutcomeByPlanId,
  upsertLearningOutcome,
} from "./learning-outcome-store";
import { getTradeById } from "./storage";
import { getPlanById } from "./plans";

/** Pure identity resolution for observation-update (Prompt 25-10F). */
export function resolveObservationApplyTarget(input: {
  observationId?: string;
  tradeId?: string;
  planId?: string;
  byId?: ObservationRecord;
  byTrade: ObservationRecord[];
  byPlan?: ObservationRecord;
}):
  | { ok: true; existing?: ObservationRecord; createVia: "trade" | "plan" | null }
  | { ok: false; errors: string[] } {
  const { observationId, tradeId, planId, byId, byTrade, byPlan } = input;

  if (observationId && !byId) {
    return { ok: false, errors: [`Observation ${observationId} not found.`] };
  }
  if (byTrade.length > 1) {
    return {
      ok: false,
      errors: [
        `Ambiguous: ${byTrade.length} ObservationRecords for tradeId ${tradeId}. Use observationId.`,
      ],
    };
  }
  if (byId) {
    if (tradeId && byId.tradeId && byId.tradeId.toUpperCase() !== tradeId) {
      return {
        ok: false,
        errors: [
          `observationId ${observationId} belongs to trade ${byId.tradeId}, not ${tradeId}`,
        ],
      };
    }
    if (planId && byId.planId && byId.planId.toUpperCase() !== planId) {
      return {
        ok: false,
        errors: [
          `observationId ${observationId} belongs to plan ${byId.planId}, not ${planId}`,
        ],
      };
    }
    if (
      byTrade.length === 1 &&
      byTrade[0].id.toUpperCase() !== byId.id.toUpperCase()
    ) {
      return {
        ok: false,
        errors: [
          `Ambiguous identity: observationId ${observationId} disagrees with tradeId ${tradeId} observation ${byTrade[0].id}`,
        ],
      };
    }
  }

  const existing =
    byId ?? (byTrade.length === 1 ? byTrade[0] : undefined) ?? byPlan;
  if (existing) {
    return { ok: true, existing, createVia: null };
  }
  if (tradeId) return { ok: true, existing: undefined, createVia: "trade" };
  if (planId) return { ok: true, existing: undefined, createVia: "plan" };
  return {
    ok: false,
    errors: [
      `No observation found for ${observationId ?? tradeId ?? planId}.`,
    ],
  };
}

export async function applyObservationUpdateProposal(
  proposal: Record<string, unknown>
): Promise<{ observation?: ObservationRecord; errors?: string[] }> {
  const identityParsed = validateObservationUpdateProposal(proposal);
  if (!identityParsed.ok) return { errors: identityParsed.errors };

  const { observationId, tradeId, planId, patch } = identityParsed.value;

  const byId = observationId
    ? await getObservationById(observationId)
    : undefined;
  const byTrade = tradeId ? await getObservationsByTradeId(tradeId) : [];
  const byPlan = planId ? await getObservationByPlanId(planId) : undefined;

  const resolved = resolveObservationApplyTarget({
    observationId,
    tradeId,
    planId,
    byId,
    byTrade,
    byPlan,
  });
  if (!resolved.ok) return { errors: resolved.errors };

  let existing = resolved.existing;

  if (existing) {
    const recheck = validateObservationUpdateProposal(proposal, existing);
    if (!recheck.ok) return { errors: recheck.errors };
  }

  if (!existing && resolved.createVia === "trade" && tradeId) {
    const trade = await getTradeById(tradeId);
    if (!trade) {
      return { errors: [`Trade ${tradeId} not found.`] };
    }
    if (trade.status !== "closed") {
      return {
        errors: [
          `Trade ${tradeId} is not closed — observation-update create requires a closed trade.`,
        ],
      };
    }
    const lo = await getLearningOutcomeByTradeId(trade.id);
    existing = await ensureObservationForClosedTrade(trade, {
      learningOutcomeId: lo?.id,
    });
  }

  if (!existing && resolved.createVia === "plan" && planId) {
    const plan = await getPlanById(planId);
    if (!plan) {
      return { errors: [`Plan ${planId} not found.`] };
    }
    const lo = await getLearningOutcomeByPlanId(plan.id);
    existing = await startObservationForPlanMiss(plan, {
      learningOutcomeId: lo?.id,
    });
  }

  if (!existing) {
    return {
      errors: [
        `No observation found for ${observationId ?? tradeId ?? planId}. Close the trade first, or paste tradeId on a closed fill / planId for a missed scout.`,
      ],
    };
  }

  // Never invent — apply only supplied patch fields; omit leaves existing unchanged.
  // Does not mutate Trade, lossClassification, or create MAF attribution.
  const updated = applyObservationUpdate(existing, {
    ...patch,
    dataSource: patch.dataSource ?? existing.dataSource ?? "ai",
  });
  await upsertObservation(updated);

  // Concluded observation may nudge LO lifecycle only — never mutates Trade or lossClassification.
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

export { updateObservationById } from "./observation";