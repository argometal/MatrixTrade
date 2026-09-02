/**
 * Learning Overview aggregation (MXT 016-P05).
 * Pipeline: Plans → buildCase → evaluateCase → counts/rows.
 * Does not mutate T0, does not fetch Yahoo, does not run Case equations.
 * Future deterministic filters (MXT 015) should plug in after evaluateCase
 * (or replace noEntryDiagnosis) — keep classification out of React.
 */

import { getPlans } from "./plans";
import type { TradePlan } from "./plan-types";
import {
  buildCase,
  type BuildCaseDeps,
} from "./thesis-case";
import { evaluateCase, ohlcvEvidenceFromMarketReality } from "./case-evaluation";
import type {
  CaseEvaluation,
  CaseOhlcvEvidence,
  DecisionQuality,
  ExecutionQuality,
  RealityRelationshipLane,
} from "./case-evaluation-types";
import type { ThesisCase } from "./thesis-case-types";
import { findMarketRealityWindow } from "./market-reality-store";
import {
  buildMarketRealityViewModel,
  geometryFromPlanAndThesis,
} from "./market-reality";
import { getStockThesisById } from "./stock-theses";
import { mxtPath } from "./mxt-paths";
import type {
  CaseParticipationClass,
  LaneCountMap,
  LearningOverview,
  LearningOverviewRow,
} from "./learning-overview-types";
import type { DecisionVerdict } from "./scout-decision-types";

const DECISION_QUALITY_VALUES: DecisionQuality[] = [
  "supported",
  "weakly_supported",
  "not_supported",
  "INDETERMINATE",
];

const EXECUTION_QUALITY_VALUES: ExecutionQuality[] = [
  "respected",
  "violated",
  "not_applicable",
  "INDETERMINATE",
];

const REALITY_VALUES: RealityRelationshipLane[] = [
  "invalidated",
  "condition_met",
  "condition_not_met",
  "mixed",
  "INDETERMINATE",
];

function emptyLaneCounts<T extends string>(keys: T[]): LaneCountMap<T> {
  const out = {} as LaneCountMap<T>;
  for (const k of keys) out[k] = 0;
  return out;
}

export function participationFromVerdict(
  verdict: DecisionVerdict | null | undefined
): CaseParticipationClass | null {
  if (!verdict) return null;
  if (verdict === "go") return "entry";
  if (verdict === "wait" || verdict === "no") return "no_entry";
  if (verdict === "probe") return "probe";
  return null;
}

function rowFromCase(
  c: ThesisCase,
  evaluation: CaseEvaluation
): LearningOverviewRow {
  const t0Verdict = c.t0Evidence.decision?.verdict ?? null;
  const execVerdict =
    c.postDecision.execution.kind === "no_trade"
      ? c.postDecision.execution.scoutVerdict
      : null;
  const effectiveVerdict = t0Verdict ?? execVerdict;

  return {
    planId: c.identity.anchorPlanId,
    ticker: c.identity.ticker,
    stockThesisId: c.identity.stockThesisId,
    participation: participationFromVerdict(effectiveVerdict),
    verdict: effectiveVerdict,
    t0Available: c.t0Evidence.available,
    t0Integrity: c.t0Evidence.integrity,
    decisionQuality: evaluation.decisionQuality.value,
    executionQuality: evaluation.executionQuality.value,
    realityRelationship: evaluation.realityRelationship.value,
    outcomeFacts: [...evaluation.outcome.facts],
    uncertainty: [...evaluation.uncertainty],
    caseHref: mxtPath(
      `/scout/case?plan=${encodeURIComponent(c.identity.anchorPlanId)}`
    ),
  };
}

/**
 * Attach Case-bound OHLCV from local cache only — never Yahoo ensure/fetch.
 * Orphan windows for other plan ids are rejected by ohlcvEvidenceFromMarketReality.
 */
async function cachedOhlcvForPlan(plan: TradePlan) {
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
  const geometry = geometryFromPlanAndThesis(plan, thesis);
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

function reviewPriority(row: LearningOverviewRow): number {
  let score = 0;
  if (!row.t0Available) score += 100;
  if (row.decisionQuality === "INDETERMINATE") score += 40;
  if (row.executionQuality === "violated") score += 35;
  if (row.realityRelationship === "INDETERMINATE") score += 15;
  score += Math.min(row.uncertainty.length * 10, 50);
  if (row.decisionQuality === "not_supported") score += 20;
  if (row.decisionQuality === "weakly_supported") score += 10;
  return score;
}

export type BuildLearningOverviewDeps = BuildCaseDeps & {
  getPlans?: () => Promise<TradePlan[]>;
  /** Cached OHLCV only — must not fetch/ensure Yahoo. */
  getCachedOhlcv?: (plan: TradePlan) => Promise<CaseOhlcvEvidence | null>;
};

/**
 * Aggregate Learning Overview from Plans that have a committed ScoutDecision.
 * Identity: one Case per such Plan (existing Case projection).
 */
export async function buildLearningOverview(
  deps?: BuildLearningOverviewDeps
): Promise<LearningOverview> {
  const listPlans = deps?.getPlans ?? getPlans;
  const plans = await listPlans();
  const decided = plans.filter((p) => p.decision != null);

  const caseDeps: BuildCaseDeps = {
    ...deps,
    skipExpire: deps?.skipExpire ?? true,
  };

  const getOhlcv = deps?.getCachedOhlcv ?? cachedOhlcvForPlan;

  const rows: LearningOverviewRow[] = [];
  for (const plan of decided) {
    const thesisCase = await buildCase(plan.id, caseDeps);
    if (!thesisCase) continue;
    const ohlcv = await getOhlcv(plan);
    const evaluation = evaluateCase({ thesisCase, ohlcv });
    rows.push(rowFromCase(thesisCase, evaluation));
  }

  const decisionQuality = emptyLaneCounts(DECISION_QUALITY_VALUES);
  const executionQuality = emptyLaneCounts(EXECUTION_QUALITY_VALUES);
  const realityRelationship = emptyLaneCounts(REALITY_VALUES);

  let entryCases = 0;
  let noEntryCases = 0;
  let probeCases = 0;
  let missingT0Cases = 0;

  for (const row of rows) {
    decisionQuality[row.decisionQuality] += 1;
    executionQuality[row.executionQuality] += 1;
    realityRelationship[row.realityRelationship] += 1;
    if (row.participation === "entry") entryCases += 1;
    else if (row.participation === "no_entry") noEntryCases += 1;
    else if (row.participation === "probe") probeCases += 1;
    if (!row.t0Available) missingT0Cases += 1;
  }

  const casesForReview = [...rows]
    .sort((a, b) => reviewPriority(b) - reviewPriority(a) || a.planId.localeCompare(b.planId))
    .filter((r) => reviewPriority(r) > 0)
    .slice(0, 25);

  return {
    generatedAt: new Date().toISOString(),
    totalCases: rows.length,
    entryCases,
    noEntryCases,
    probeCases,
    missingT0Cases,
    decisionQuality,
    executionQuality,
    realityRelationship,
    noEntryDiagnosis: {
      available: false,
      reason:
        "Good Filter / Possible Over-optimization classification contract is not yet defined. Do not infer from favorable Reality after WAIT/NO.",
      noEntryUniverse: noEntryCases,
    },
    casesForReview,
    allCases: rows.sort((a, b) => a.planId.localeCompare(b.planId)),
  };
}
