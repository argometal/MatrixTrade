import { getTradeById } from "./storage";
import { getPlanById } from "./plans";
import { getEvaluationByTradeId } from "./trade-evaluation";
import { buildMafEvidence } from "./maf-evidence";
import { inferMafRuleHints } from "./maf-inference";
import {
  getMafExperimentById,
  getMafExperimentByTradeId,
  getMafExperiments,
  nextMafExperimentId,
  upsertMafExperiment,
} from "./maf-store";
import { validateAttributionProposal } from "./maf-validate";
import type { MafExperiment } from "./maf-types";
import { getObservationByTradeId, getObservationByPlanId } from "./observation-store";
import {
  getLearningOutcomeByTradeId,
  getLearningOutcomeByPlanId,
} from "./learning-outcome-store";
import { markLearningOutcomeAttributed } from "./learning-outcome";

export async function applyAttribution(
  proposal: Record<string, unknown>
): Promise<{ experiment?: MafExperiment; errors?: string[] }> {
  const parsed = validateAttributionProposal(proposal);
  if (!parsed.ok) return { errors: parsed.errors };

  const value = parsed.value;
  let existing: MafExperiment | undefined;

  if (value.experimentId) {
    existing = await getMafExperimentById(value.experimentId);
    if (!existing) {
      return { errors: [`MAF experiment ${value.experimentId} not found.`] };
    }
  } else if (value.tradeId) {
    existing = await getMafExperimentByTradeId(value.tradeId);
  }

  const tradeId = value.tradeId ?? existing?.tradeId;
  const planId = value.planId ?? existing?.planId;

  const trade = tradeId ? await getTradeById(tradeId) : undefined;
  if (tradeId && !trade) {
    return { errors: [`Trade ${tradeId} not found.`] };
  }

  const plan = planId
    ? await getPlanById(planId)
    : trade?.planId
      ? await getPlanById(trade.planId)
      : undefined;

  if (planId && !plan) {
    return { errors: [`Scout Plan ${planId} not found.`] };
  }

  if (!trade && !plan && !existing) {
    return { errors: ["Need an existing trade, plan, or experiment to attribute."] };
  }

  const evaluation = tradeId ? await getEvaluationByTradeId(tradeId) : undefined;
  const observationRecord =
    (tradeId ? await getObservationByTradeId(tradeId) : undefined) ??
    (plan?.id ? await getObservationByPlanId(plan.id) : undefined);
  const learningOutcome =
    (tradeId ? await getLearningOutcomeByTradeId(tradeId) : undefined) ??
    (plan?.id ? await getLearningOutcomeByPlanId(plan.id) : undefined);

  const ticker = (
    trade?.ticker ??
    plan?.ticker ??
    existing?.ticker ??
    "UNK"
  ).toUpperCase();

  const evidence = buildMafEvidence({
    trade,
    plan,
    evaluation,
    observationRecord,
    learningOutcome,
    observation: value.observation,
  });

  const ruleHints = inferMafRuleHints(evidence);
  const now = new Date().toISOString();
  const all = await getMafExperiments();

  const experiment: MafExperiment = {
    id: existing?.id ?? nextMafExperimentId(all, ticker),
    tradeId: trade?.id ?? existing?.tradeId,
    planId: plan?.id ?? trade?.planId ?? existing?.planId,
    playbookId: trade?.playbookId ?? plan?.playbookId ?? existing?.playbookId,
    evaluationId: evaluation?.id ?? existing?.evaluationId,
    learningOutcomeId: learningOutcome?.id ?? existing?.learningOutcomeId,
    observationId: observationRecord?.id ?? existing?.observationId,
    ticker,
    status: value.humanApproved ? "concluded" : "attributed",
    evidence,
    attributions: value.components,
    ruleHints,
    summary: value.summary ?? existing?.summary,
    primaryDragComponent: value.primaryDragComponent ?? existing?.primaryDragComponent,
    humanApproved: value.humanApproved ?? existing?.humanApproved,
    observationNotes: value.observation?.notes ?? existing?.observationNotes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    source: "attribution",
  };

  await upsertMafExperiment(experiment);

  if (learningOutcome?.id) {
    await markLearningOutcomeAttributed(learningOutcome.id, experiment.id);
  }

  return { experiment };
}
