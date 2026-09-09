/**
 * Narrow DELETE for clearly contaminated Plan records.
 *
 * Not a general Plan lifecycle workflow.
 * Allowed only when outcomeKind=duplicate_creation and no legitimate
 * trade/MAF/accounting evidence is attached.
 */

import { getPlanById } from "./plans";
import { getPlansStore } from "./plans-store";
import { getLearningOutcomes } from "./learning-outcome-store";
import { getLearningOutcomesStore } from "./learning-outcomes-store";
import { getTrades } from "./storage";
import { getMafExperiments } from "./maf-store";
import { getObservationByPlanId } from "./observation-store";
import { assertMxtPersistenceWriteAllowed } from "./mxt-readonly";
import { isDuplicateCreationPlan } from "./duplicate-observation";

export const CONTAMINATED_PLAN_DELETE_CONFIRMATION =
  "DELETE_CONTAMINATED_PLAN" as const;

export type ContaminatedPlanDeleteResult =
  | {
      ok: true;
      planId: string;
      deletedLearningOutcomeIds: string[];
      deletedObservationIds: string[];
    }
  | { ok: false; errors: string[] };

async function integrityErrorsForDelete(planId: string): Promise<string[]> {
  const errors: string[] = [];
  const plan = await getPlanById(planId);
  if (!plan) {
    errors.push(`Plan ${planId} not found.`);
    return errors;
  }
  if (!isDuplicateCreationPlan(plan)) {
    errors.push(
      `Plan ${planId} is not outcomeKind=duplicate_creation — contaminated DELETE refused.`
    );
  }
  if (plan.linkedTradeId) {
    errors.push(
      `Plan ${planId} has linkedTradeId ${plan.linkedTradeId} — DELETE refused.`
    );
  }
  if (plan.outcome?.tradeExecuted === true) {
    errors.push(`Plan ${planId} has tradeExecuted=true — DELETE refused.`);
  }
  if (
    plan.outcome?.realizedResultR != null &&
    plan.outcome.realizedResultR !== 0
  ) {
    errors.push(
      `Plan ${planId} has non-zero realizedResultR — DELETE refused.`
    );
  }

  const trades = await getTrades();
  const linkedTrades = trades.filter(
    (t) => t.planId?.toUpperCase() === planId.toUpperCase()
  );
  if (linkedTrades.length > 0) {
    errors.push(
      `Plan ${planId} is referenced by trade(s) ${linkedTrades
        .map((t) => t.id)
        .join(", ")} — DELETE refused.`
    );
  }

  const maf = await getMafExperiments().catch(() => []);
  const mafHits = maf.filter(
    (row) => row.planId?.toUpperCase() === planId.toUpperCase()
  );
  if (mafHits.length > 0) {
    errors.push(
      `Plan ${planId} has MAF experiment(s) ${mafHits
        .map((row) => row.id)
        .join(", ")} — DELETE refused.`
    );
  }

  const los = await getLearningOutcomes();
  const planLos = los.filter(
    (lo) => lo.planId?.toUpperCase() === planId.toUpperCase()
  );
  for (const lo of planLos) {
    if (lo.kind !== "duplicate_creation") {
      errors.push(
        `Plan ${planId} has non-duplicate Learning Outcome ${lo.id} (${lo.kind}) — DELETE refused.`
      );
    }
    if (lo.tradeId) {
      errors.push(
        `Learning Outcome ${lo.id} links trade ${lo.tradeId} — DELETE refused.`
      );
    }
  }

  const observation = await getObservationByPlanId(planId).catch(() => undefined);
  if (observation) {
    errors.push(
      `Plan ${planId} has Observation ${observation.id} — DELETE refused in this minimal pass.`
    );
  }

  return errors;
}

/**
 * Delete a contaminated duplicate Plan and exclusively dependent LO garbage.
 * Does not delete Stock Files, Playbooks, Trades, or other Plans.
 */
export async function deleteContaminatedPlan(input: {
  planId: string;
  confirmation: string;
  reason: string;
}): Promise<ContaminatedPlanDeleteResult> {
  const planId = input.planId.trim().toUpperCase();
  if (!planId) return { ok: false, errors: ["planId required"] };
  if (input.confirmation !== CONTAMINATED_PLAN_DELETE_CONFIRMATION) {
    return {
      ok: false,
      errors: [
        `confirmation must be exactly ${CONTAMINATED_PLAN_DELETE_CONFIRMATION}`,
      ],
    };
  }
  if (input.reason.trim().length < 8) {
    return {
      ok: false,
      errors: ["reason must be at least 8 characters"],
    };
  }

  const errors = await integrityErrorsForDelete(planId);
  if (errors.length > 0) return { ok: false, errors };

  assertMxtPersistenceWriteAllowed(`contaminated-plan-delete:${planId}`);

  const los = (await getLearningOutcomes()).filter(
    (lo) => lo.planId?.toUpperCase() === planId
  );

  const loStore = getLearningOutcomesStore();
  const deletedLearningOutcomeIds: string[] = [];
  if (typeof loStore.deleteById !== "function") {
    return {
      ok: false,
      errors: [
        "Learning Outcomes store has no deleteById — cannot safely remove exclusive LO garbage.",
      ],
    };
  }
  for (const lo of los) {
    await loStore.deleteById(lo.id);
    deletedLearningOutcomeIds.push(lo.id);
  }

  const plansStore = getPlansStore();
  if (typeof plansStore.deleteById !== "function") {
    return {
      ok: false,
      errors: ["Plans store has no deleteById — cannot delete contaminated Plan."],
    };
  }
  await plansStore.deleteById(planId);

  return {
    ok: true,
    planId,
    deletedLearningOutcomeIds,
    deletedObservationIds: [],
  };
}
