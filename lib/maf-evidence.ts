import type { Trade } from "./types";
import type { TradePlan } from "./plan-types";
import type { TradeEvaluation } from "./trade-evaluation-types";
import type { ObservationRecord } from "./observation-types";
import type { LearningOutcome } from "./learning-outcome-types";
import { computeRMultiple } from "./review";
import type {
  MafFillStatus,
  MafObservableEvidence,
  MafObservationSupplement,
} from "./maf-types";

function hoursBetween(startIso?: string, endIso?: string): number | undefined {
  if (!startIso || !endIso) return undefined;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10;
}

function resolveFillStatus(trade?: Trade, plan?: TradePlan): MafFillStatus {
  if (trade) {
    if (trade.status === "open" || trade.status === "closed" || trade.status === "pending") {
      return "filled";
    }
  }
  if (plan) {
    if (plan.status === "skipped") return "missed";
    if (plan.status === "failed") {
      const reason = plan.outcome?.reason;
      if (reason === "discipline" || reason === "other") return "cancelled";
      return "missed";
    }
    if (plan.status === "expired") return "missed";
    if (plan.layeredEntry?.status === "missed") return "missed";
  }
  return "unknown";
}

/**
 * Assemble measurable evidence from Trade + Plan + evaluation + observation + learning outcome.
 * Does not invent prices. Observation supplement only merges explicitly provided fields.
 */
export function buildMafEvidence(input: {
  trade?: Trade;
  plan?: TradePlan;
  evaluation?: TradeEvaluation;
  observationRecord?: ObservationRecord;
  learningOutcome?: LearningOutcome;
  observation?: MafObservationSupplement;
}): MafObservableEvidence {
  const { trade, plan, evaluation, observationRecord, learningOutcome, observation } = input;
  const study = trade?.postStopStudy;

  const evidence: MafObservableEvidence = {
    fillStatus: resolveFillStatus(trade, plan),
    plannedEntry: plan?.plannedEntry,
    executedEntry: trade?.entry,
    plannedStop: plan?.stopPrice,
    executedStop: trade?.stop,
    plannedTarget: plan?.targetPrice,
    executedTarget: trade?.target,
    targetReachedAfterStop:
      observationRecord?.targetReached ?? study?.targetReached,
    thesisInvalidated:
      observationRecord?.thesisInvalidated ?? study?.thesisInvalidated,
    targetReachedAt: observationRecord?.targetReachedAt ?? study?.targetReachedAt,
    invalidationReachedAt:
      observationRecord?.invalidationReachedAt ?? study?.invalidationReachedAt,
    firstTerminalEvent:
      observationRecord?.firstTerminalEvent ?? study?.firstTerminalEvent,
    mfe: observationRecord?.mfe ?? study?.mfe,
    mae: observationRecord?.mae ?? study?.mae,
    mfeMaeUnit: observationRecord?.mfeMaeUnit ?? study?.mfeMaeUnit,
    betterEntryAvailable: observationRecord?.betterEntryAvailable,
    betterEntryPrice: observationRecord?.betterEntryPrice,
    exitReason: trade?.exitReason,
    lossClassification: trade?.lossClassification,
    thesisOutcome: evaluation?.thesisOutcome,
    timingOutcome: evaluation?.timingOutcome,
    executionOutcome: evaluation?.executionOutcome,
    learningOutcomeKind: learningOutcome?.kind,
    observationId: observationRecord?.id,
    sources: {
      trade: Boolean(trade),
      plan: Boolean(plan),
      postStopStudy: Boolean(study),
      evaluation: Boolean(evaluation),
      observationRecord: Boolean(observationRecord),
      observationSupplement: false,
      learningOutcome: Boolean(learningOutcome),
    },
  };

  if (trade) {
    const r = computeRMultiple(trade);
    if (r !== null) evidence.rAchieved = Math.round(r * 100) / 100;

    if (
      trade.exitReason === "target" &&
      (trade.openedAt || trade.createdAt) &&
      trade.closedAt
    ) {
      evidence.timeUntilTargetHours = hoursBetween(
        trade.openedAt ?? trade.createdAt,
        trade.closedAt
      );
    }

    if (
      plan?.plannedEntry !== undefined &&
      Number.isFinite(plan.plannedEntry) &&
      Number.isFinite(trade.entry)
    ) {
      evidence.slippageVsPlan = Math.round((trade.entry - plan.plannedEntry) * 100) / 100;
    }
  }

  if (plan?.layeredEntry) {
    const le = plan.layeredEntry;
    evidence.layeredEntryStatus = le.status;
    evidence.layeredFillPercent = le.fillPercent;
    evidence.layeredAverageEntry = le.averageEntry;
    evidence.layeredEntryImprovementVsFirst = le.entryImprovementVsFirst;
    evidence.layeredRiskUsedAmount = le.riskUsedAmount;
    evidence.layeredAuthorizedRiskAmount = le.authorizedRiskAmount;
    evidence.layeredBlendedRR = le.blendedRR;
    evidence.layeredCombinedRR = le.combinedRR;
    evidence.layeredSizingMode = le.sizingMode;
    evidence.layeredStopModel = le.stopModel;
    evidence.layeredLimitsFilled = le.limits.filter((l) => l.filled).length;
    if (
      evidence.slippageVsPlan === undefined &&
      le.averageEntry !== undefined &&
      trade &&
      Number.isFinite(trade.entry)
    ) {
      evidence.slippageVsPlan = Math.round((trade.entry - le.averageEntry) * 100) / 100;
    }
  }

  if (observationRecord?.targetReachedAt && observationRecord.startedAt) {
    evidence.timeUntilTargetHours =
      evidence.timeUntilTargetHours ??
      hoursBetween(observationRecord.startedAt, observationRecord.targetReachedAt);
  }
  if (observationRecord?.invalidationReachedAt && observationRecord.startedAt) {
    evidence.timeUntilInvalidationHours = hoursBetween(
      observationRecord.startedAt,
      observationRecord.invalidationReachedAt
    );
  }

  if (observation) {
    return mergeObservationSupplement(evidence, observation);
  }

  return evidence;
}

export function mergeObservationSupplement(
  base: MafObservableEvidence,
  observation: MafObservationSupplement
): MafObservableEvidence {
  const next: MafObservableEvidence = {
    ...base,
    sources: {
      ...base.sources,
      observationSupplement: true,
    },
  };

  if (observation.mfe !== undefined) next.mfe = observation.mfe;
  if (observation.mae !== undefined) next.mae = observation.mae;
  if (observation.mfeMaeUnit !== undefined) next.mfeMaeUnit = observation.mfeMaeUnit;
  if (observation.timeUntilTargetHours !== undefined) {
    next.timeUntilTargetHours = observation.timeUntilTargetHours;
  }
  if (observation.timeUntilInvalidationHours !== undefined) {
    next.timeUntilInvalidationHours = observation.timeUntilInvalidationHours;
  }
  if (observation.betterEntryAvailable !== undefined) {
    next.betterEntryAvailable = observation.betterEntryAvailable;
  }
  if (observation.betterEntryPrice !== undefined) {
    next.betterEntryPrice = observation.betterEntryPrice;
  }
  if (observation.targetReachedAfterStop !== undefined) {
    next.targetReachedAfterStop = observation.targetReachedAfterStop;
  }
  if (observation.thesisInvalidated !== undefined) {
    next.thesisInvalidated = observation.thesisInvalidated;
  }

  return next;
}
