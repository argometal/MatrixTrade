/**
 * Canonical Insights Case spine builder (MXT 016-P08 S1) — server-only.
 * Reuses Learning pipeline — does not reclassify in React.
 */

import { getPlans } from "./plans";
import type { TradePlan } from "./plan-types";
import { resolvePlanEntryForRR } from "./plan-risk";
import { getTrades } from "./storage";
import type { Trade } from "./types";
import { getLearningOutcomes } from "./learning-outcome-store";
import type { LearningOutcome } from "./learning-outcome-types";
import { resolveLearningOutcomeForPlan } from "./learning-outcome-resolve";
import {
  findDuplicateCreationLearningOutcome,
  isDuplicateEconomicObservation,
} from "./duplicate-observation";
import {
  buildCase,
  type BuildCaseDeps,
} from "./thesis-case";
import { evaluateCase, ohlcvEvidenceFromMarketReality } from "./case-evaluation";
import type { CaseOhlcvEvidence } from "./case-evaluation-types";
import { diagnoseCase } from "./case-diagnosis";
import { participationFromVerdict } from "./learning-overview";
import { findMarketRealityWindow } from "./market-reality-store";
import {
  buildMarketRealityViewModel,
  geometryForCaseEvaluation,
} from "./market-reality";
import { getStockThesisById } from "./stock-theses";
import { mxtPath } from "./mxt-paths";
import type { InsightsCaseRow } from "./insights-case-spine-types";
import {
  familyFromDiagnosis,
  noEntryDiagnosisFrom,
} from "./insights-case-spine-view";
import { getMafExperiments } from "./maf-store";
import type { MafExperiment } from "./maf-types";
import { attachMafToInsightsCaseRows } from "./insights-maf-join";
import type { ThesisT0Freeze } from "./thesis-t0-types";
import {
  buildHistoricalCaseAttribution,
  isHistoricalTradeCandidate,
  resolveMafForTrade,
} from "./historical-case-attribution";
import type { CaseDiagnosis } from "./case-diagnosis-types";
import { derivePlanCaseLifecycle } from "./plan-case-lifecycle";

export type { InsightsCaseRow } from "./insights-case-spine-types";
export {
  buildInsightsCaseSpineView,
  filterInsightsCaseRows,
  familyFromDiagnosis,
  noEntryDiagnosisFrom,
  independentEconomicCaseRows,
  pickCasesNeedingReview,
} from "./insights-case-spine-view";
export { resolveLearningOutcomeForPlan } from "./learning-outcome-resolve";
export type {
  InsightsCaseFamily,
  InsightsCaseSpineFilters,
  InsightsCaseSpineView,
} from "./insights-case-spine-types";

async function cachedOhlcvForPlan(
  plan: TradePlan,
  freeze?: ThesisT0Freeze | null
): Promise<CaseOhlcvEvidence | null> {
  const window = await findMarketRealityWindow({
    planId: plan.id,
    windowKind: "retrospective_observation",
  });
  if (!window) return null;
  let thesis = null;
  if (plan.stockThesisId) {
    try {
      thesis = await getStockThesisById(plan.stockThesisId);
    } catch {
      thesis = null;
    }
  }
  const geometry = geometryForCaseEvaluation({
    freeze: freeze ?? null,
    plan,
    thesis,
  });
  const retrospective = buildMarketRealityViewModel({
    window,
    geometry,
    exAnteIntegrity: "supported_legacy",
  });
  return ohlcvEvidenceFromMarketReality({
    planId: plan.id,
    retrospective,
  });
}

export type BuildInsightsCaseSpineDeps = BuildCaseDeps & {
  getPlans?: () => Promise<TradePlan[]>;
  getTrades?: () => Promise<Trade[]>;
  getLearningOutcomes?: () => Promise<LearningOutcome[]>;
  getCachedOhlcv?: (
    plan: TradePlan,
    freeze?: ThesisT0Freeze | null
  ) => Promise<CaseOhlcvEvidence | null>;
  /** Optional MAF experiments (defaults to local JSON store). */
  getMafExperiments?: () => Promise<MafExperiment[]>;
  /** Optional human reconstruction notes keyed by tradeId (never T0). */
  historicalReconstructionNotes?: Record<string, string>;
};

/**
 * Build Case spine for all Plans with a committed ScoutDecision.
 */
export async function buildInsightsCaseSpine(
  deps?: BuildInsightsCaseSpineDeps
): Promise<InsightsCaseRow[]> {
  const listPlans = deps?.getPlans ?? getPlans;
  const listTrades = deps?.getTrades ?? getTrades;
  const listLos = deps?.getLearningOutcomes ?? getLearningOutcomes;
  const listMaf = deps?.getMafExperiments ?? getMafExperiments;

  const [plans, trades, learningOutcomes, mafExperiments] = await Promise.all([
    listPlans(),
    listTrades(),
    listLos(),
    listMaf().catch(() => [] as MafExperiment[]),
  ]);
  const decided = plans.filter((p) => p.decision != null);

  const caseDeps: BuildCaseDeps = {
    ...deps,
    skipExpire: deps?.skipExpire ?? true,
  };

  const rows: InsightsCaseRow[] = [];
  const loTradeByPlan = new Map<
    string,
    { learningOutcomeId?: string | null; tradeId?: string | null }
  >();

  for (const plan of decided) {
    const thesisCase = await buildCase(plan.id, caseDeps);
    if (!thesisCase) continue;
    const ohlcv = deps?.getCachedOhlcv
      ? await deps.getCachedOhlcv(plan, thesisCase.freeze)
      : await cachedOhlcvForPlan(plan, thesisCase.freeze);
    const evaluation = evaluateCase({ thesisCase, ohlcv });
    const participation = participationFromVerdict(
      thesisCase.t0Evidence.decision?.verdict ??
        (thesisCase.postDecision.execution.kind === "no_trade"
          ? thesisCase.postDecision.execution.scoutVerdict
          : null)
    );
    const duplicateLo = findDuplicateCreationLearningOutcome(
      plan.id,
      learningOutcomes
    );
    const isDuplicate = isDuplicateEconomicObservation({
      plan,
      learningOutcome: duplicateLo,
    });
    const lo = isDuplicate
      ? duplicateLo
      : resolveLearningOutcomeForPlan({
          plan,
          learningOutcomes,
          trades,
        });
    const diagnosis = diagnoseCase({
      thesisCase,
      evaluation,
      participation,
      counterfactualR: lo?.counterfactualR ?? null,
    });
    const family = familyFromDiagnosis(diagnosis);
    const noEntryDiagnosis = noEntryDiagnosisFrom(diagnosis);
    const caseDSubtype =
      diagnosis.classification.kind === "case_d"
        ? diagnosis.classification.value
        : diagnosis.caseDSubtype ?? null;
    const isExecuted =
      lo?.kind === "executed_win" || lo?.kind === "executed_loss";
    const date =
      lo?.updatedAt ||
      lo?.createdAt ||
      plan.decision?.decidedAt ||
      plan.updatedAt ||
      plan.createdAt;

    const evidenceSummary = diagnosis.inputsUsed
      .slice(0, 3)
      .map((e) => `${e.inputKey}=${e.value}`)
      .join("; ");

    const tradeId =
      lo?.tradeId ??
      plan.linkedTradeId ??
      trades.find((t) => t.planId?.toUpperCase() === plan.id.toUpperCase())
        ?.id ??
      null;

    loTradeByPlan.set(plan.id.toUpperCase(), {
      learningOutcomeId: lo?.id ?? null,
      tradeId,
    });

    const freezePlaybook =
      thesisCase.freeze?.plan.playbookId?.trim() || null;
    const playbookId = plan.playbookId ?? freezePlaybook;
    const thesisLink = plan.stockThesisId?.trim()
      ? ("linked" as const)
      : ("UNLINKED" as const);
    const playbookLink = playbookId?.trim()
      ? ("linked" as const)
      : ("UNLINKED" as const);
    const tradePlanLink = tradeId
      ? ("linked" as const)
      : ("UNLINKED" as const);

    // Realized R: fills only for executed; no-entry / Scout CF stays 0 when known.
    const realizedR = isExecuted
      ? lo?.realizedR ?? lo?.rAchieved ?? null
      : lo?.realizedR === 0 || lo?.kind != null
        ? lo?.realizedR ?? 0
        : participation === "no_entry"
          ? 0
          : null;
    const resolvedEntry = resolvePlanEntryForRR(plan);
    const geometricRR =
      resolvedEntry != null &&
      plan.stopPrice != null &&
      plan.targetPrice != null &&
      resolvedEntry > plan.stopPrice
        ? (plan.targetPrice - resolvedEntry) / (resolvedEntry - plan.stopPrice)
        : null;
    const rrCorrectableIssue =
      geometricRR != null &&
      plan.plannedRR != null &&
      Number.isFinite(plan.plannedRR) &&
      Math.abs(plan.plannedRR - geometricRR) > 1e-6;
    const lifecycle = derivePlanCaseLifecycle({
      caseOrigin: "modern",
      planStatus: plan.status,
      t0Available: thesisCase.t0Evidence.available,
      hasValidityWindow: Boolean(plan.validFrom || plan.validUntil),
      hasReality:
        evaluation.realityRelationship.value !== "INDETERMINATE" ||
        thesisCase.postDecision.marketReality.observations.length > 0 ||
        Boolean(ohlcv?.available),
      hasExecutionEvidence:
        Boolean(tradeId) ||
        Boolean(plan.outcome?.outcomeKind) ||
        Boolean(plan.outcome?.nonExecutionReason) ||
        Boolean(lo?.kind),
      hasOutcomeEvidence:
        Boolean(plan.outcome?.recordedAt) ||
        Boolean(lo?.kind) ||
        realizedR != null ||
        lo?.counterfactualR != null,
      classificationComplete: family !== "INDETERMINATE",
      hasLearningEvidence: Boolean(lo?.id),
      hasAcceptedMaf: Boolean(
        mafExperiments.find(
          (item) => item.planId?.toUpperCase() === plan.id.toUpperCase()
        )
      ),
      rrCorrectableIssue,
      rrIssueNote:
        rrCorrectableIssue && geometricRR != null && plan.plannedRR != null
          ? `Persisted plannedRR ${plan.plannedRR} != geometric ${Number(
              geometricRR.toFixed(4)
            )}.`
          : null,
    });

    rows.push({
      planId: plan.id,
      caseId: plan.id,
      ticker: plan.ticker,
      date,
      playbookId: playbookId ?? null,
      stockThesisId: plan.stockThesisId ?? null,
      caseOrigin: "modern",
      independentEconomicObservation: !isDuplicate,
      participation,
      verdict:
        thesisCase.t0Evidence.decision?.verdict ??
        (thesisCase.postDecision.execution.kind === "no_trade"
          ? thesisCase.postDecision.execution.scoutVerdict
          : null),
      family,
      noEntryDiagnosis,
      caseDSubtype,
      equationId: diagnosis.equationId,
      decisionQuality: evaluation.decisionQuality.value,
      executionQuality: evaluation.executionQuality.value,
      reality: evaluation.realityRelationship.value,
      outcomeLabel: lo?.kind ?? null,
      loKind: lo?.kind ?? null,
      realizedR,
      realizedPnL: isExecuted ? lo?.realizedPnL ?? null : null,
      counterfactualR: !isExecuted ? lo?.counterfactualR ?? null : null,
      t0Available: thesisCase.t0Evidence.available,
      t0RecordKind: null,
      lifecycle,
      missingInputs: [...diagnosis.missingInputs],
      diagnosisReason: diagnosis.reason,
      evidenceSummary,
      caseHref: mxtPath(`/scout/case?plan=${encodeURIComponent(plan.id)}`),
      diagnosis,
      linkage: {
        tradeId,
        planThesis: thesisLink,
        planPlaybook: playbookLink,
        tradePlan: tradePlanLink,
      },
    });
  }

  // Historical / pre-MXT closed trades without Plan decision spine membership
  const linkedTradeIds = new Set(
    rows
      .map((r) => r.linkage?.tradeId?.toUpperCase())
      .filter((id): id is string => Boolean(id))
  );
  for (const trade of trades) {
    if (!isHistoricalTradeCandidate(trade)) continue;
    if (linkedTradeIds.has(trade.id.toUpperCase())) continue;

    let thesisReconstructed = false;
    // Stock thesis link is not on Trade — detect reconstructed only via LO notes if present
    const lo = learningOutcomes.find(
      (x) => x.tradeId?.toUpperCase() === trade.id.toUpperCase()
    );
    if (lo?.stockThesisId) {
      try {
        const st = await getStockThesisById(lo.stockThesisId);
        const blob = `${st?.thesis ?? ""} ${st?.currentHypothesis ?? ""}`;
        thesisReconstructed = /\[reconstructed\]/i.test(blob);
      } catch {
        thesisReconstructed = false;
      }
    }

    const maf = resolveMafForTrade(trade.id, mafExperiments);
    const noteFromTrade =
      trade.notes?.trim() ||
      trade.thesis?.trim() ||
      null;
    const hist = buildHistoricalCaseAttribution({
      trade,
      maf,
      stockThesisReconstructed: thesisReconstructed,
      reconstructionNote:
        deps?.historicalReconstructionNotes?.[trade.id] ?? noteFromTrade,
    });

    const histDiagnosis: CaseDiagnosis = {
      planId: `HIST:${trade.id}`,
      classification: { kind: "unclassified", value: "INDETERMINATE" },
      equationId: "HIST-ATTRIBUTION",
      inputsUsed: hist.evidence.slice(0, 6).map((e) => ({
        inputKey: e.key,
        value: e.value,
        evidenceRef: `provenance=${e.provenance}`,
      })),
      missingInputs: ["t0_freeze"],
      reason: hist.summary,
    };

    const isLoss =
      trade.exit != null &&
      ((trade.direction !== "short" && trade.exit < trade.entry) ||
        (trade.direction === "short" && trade.exit > trade.entry));
    const realizedR =
      trade.riskRewardActual ??
      (trade.exit != null && trade.entry !== trade.stop
        ? ((trade.direction === "short" ? -1 : 1) *
            (trade.exit - trade.entry)) /
          Math.abs(trade.entry - trade.stop)
        : null);

    rows.push({
      planId: `HIST:${trade.id}`,
      caseId: trade.id,
      ticker: trade.ticker,
      date: trade.closedAt ?? trade.createdAt,
      playbookId: trade.playbookId ?? null,
      stockThesisId: lo?.stockThesisId ?? null,
      caseOrigin: "historical_trade",
      independentEconomicObservation: true,
      participation: "entry",
      verdict: null,
      family: "INDETERMINATE",
      noEntryDiagnosis: null,
      equationId: "HIST-ATTRIBUTION",
      decisionQuality: "INDETERMINATE",
      executionQuality: "INDETERMINATE",
      reality: "INDETERMINATE",
      outcomeLabel: isLoss ? "executed_loss" : "executed_win",
      loKind: lo?.kind ?? null,
      realizedR,
      realizedPnL:
        trade.exit != null
          ? (trade.direction === "short" ? -1 : 1) *
            (trade.exit - trade.entry) *
            trade.shares
          : null,
      counterfactualR: null,
      t0Available: false,
      lifecycle: derivePlanCaseLifecycle({
        caseOrigin: "historical_trade",
        planStatus: null,
        t0Available: false,
        hasValidityWindow: false,
        hasReality: Boolean(hist.evidence.length),
        hasExecutionEvidence: true,
        hasOutcomeEvidence: realizedR != null || trade.exit != null,
        classificationComplete: false,
        hasLearningEvidence: Boolean(lo?.id),
        hasAcceptedMaf: Boolean(maf?.id),
        rrCorrectableIssue: false,
      }),
      missingInputs: ["t0_freeze"],
      diagnosisReason: hist.summary,
      evidenceSummary: hist.components
        .map((c) => `${c.component}:${c.band}/${c.provenance}`)
        .join("; "),
      caseHref: mxtPath(`/trades/${encodeURIComponent(trade.id)}`),
      diagnosis: histDiagnosis,
      linkage: {
        tradeId: trade.id,
        planThesis: lo?.stockThesisId ? "linked" : "UNLINKED",
        planPlaybook: trade.playbookId
          ? "linked"
          : trade.playbookHistoricallyAbsent
            ? "UNLINKED"
            : "UNLINKED",
        tradePlan: trade.planHistoricallyAbsent || !trade.planId
          ? "UNLINKED"
          : "linked",
      },
      historicalAttribution: hist,
    });
  }

  const withMaf = attachMafToInsightsCaseRows(
    rows,
    mafExperiments,
    loTradeByPlan
  );

  return withMaf.sort(
    (a, b) => b.date.localeCompare(a.date) || a.planId.localeCompare(b.planId)
  );
}
