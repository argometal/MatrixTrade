/**
 * Canonical Insights Case spine builder (MXT 016-P08 S1) — server-only.
 * Reuses Learning pipeline — does not reclassify in React.
 */

import { getPlans } from "./plans";
import type { TradePlan } from "./plan-types";
import { getTrades } from "./storage";
import type { Trade } from "./types";
import { getLearningOutcomes } from "./learning-outcome-store";
import type { LearningOutcome } from "./learning-outcome-types";
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

export type { InsightsCaseRow } from "./insights-case-spine-types";
export {
  buildInsightsCaseSpineView,
  filterInsightsCaseRows,
  familyFromDiagnosis,
  noEntryDiagnosisFrom,
} from "./insights-case-spine-view";
export type {
  InsightsCaseFamily,
  InsightsCaseSpineFilters,
  InsightsCaseSpineView,
} from "./insights-case-spine-types";

/**
 * Join LO unambiguously: prefer planId;
 * else tradeId only when exactly one trade maps to this plan.
 */
export function resolveLearningOutcomeForPlan(input: {
  plan: TradePlan;
  learningOutcomes: LearningOutcome[];
  trades: Trade[];
}): LearningOutcome | null {
  const planId = input.plan.id.toUpperCase();
  const byPlan = input.learningOutcomes.filter(
    (lo) =>
      lo.planId?.toUpperCase() === planId &&
      lo.excludedFromMetrics !== true &&
      lo.kind !== "duplicate_creation"
  );
  if (byPlan.length === 1) return byPlan[0]!;
  if (byPlan.length > 1) {
    const scoutOnly = byPlan.filter((lo) => !lo.tradeId);
    if (scoutOnly.length === 1) return scoutOnly[0]!;
    return null;
  }

  const linked =
    input.plan.linkedTradeId?.toUpperCase() ??
    input.trades.find((t) => t.planId?.toUpperCase() === planId)?.id.toUpperCase();
  if (!linked) return null;

  const tradesForPlan = input.trades.filter(
    (t) =>
      t.id.toUpperCase() === linked ||
      t.planId?.toUpperCase() === planId
  );
  if (tradesForPlan.length !== 1) return null;

  const byTrade = input.learningOutcomes.filter(
    (lo) =>
      lo.tradeId?.toUpperCase() === tradesForPlan[0]!.id.toUpperCase() &&
      lo.excludedFromMetrics !== true
  );
  if (byTrade.length === 1) return byTrade[0]!;
  return null;
}

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
    const diagnosis = diagnoseCase({ thesisCase, evaluation });
    const participation = participationFromVerdict(
      thesisCase.t0Evidence.decision?.verdict ??
        (thesisCase.postDecision.execution.kind === "no_trade"
          ? thesisCase.postDecision.execution.scoutVerdict
          : null)
    );
    const lo = resolveLearningOutcomeForPlan({
      plan,
      learningOutcomes,
      trades,
    });
    const family = familyFromDiagnosis(diagnosis);
    const noEntryDiagnosis = noEntryDiagnosisFrom(diagnosis);
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

    rows.push({
      planId: plan.id,
      caseId: plan.id,
      ticker: plan.ticker,
      date,
      playbookId: playbookId ?? null,
      stockThesisId: plan.stockThesisId ?? null,
      participation,
      verdict:
        thesisCase.t0Evidence.decision?.verdict ??
        (thesisCase.postDecision.execution.kind === "no_trade"
          ? thesisCase.postDecision.execution.scoutVerdict
          : null),
      family,
      noEntryDiagnosis,
      equationId: diagnosis.equationId,
      decisionQuality: evaluation.decisionQuality.value,
      executionQuality: evaluation.executionQuality.value,
      reality: evaluation.realityRelationship.value,
      outcomeLabel: lo?.kind ?? null,
      loKind: lo?.kind ?? null,
      realizedR: isExecuted
        ? lo?.realizedR ?? lo?.rAchieved ?? null
        : null,
      realizedPnL: isExecuted ? lo?.realizedPnL ?? null : null,
      counterfactualR: !isExecuted ? lo?.counterfactualR ?? null : null,
      t0Available: thesisCase.t0Evidence.available,
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

  const withMaf = attachMafToInsightsCaseRows(
    rows,
    mafExperiments,
    loTradeByPlan
  );

  return withMaf.sort(
    (a, b) => b.date.localeCompare(a.date) || a.planId.localeCompare(b.planId)
  );
}
