/**
 * Insights · Pipeline Performance (30-2C).
 * Composes Learning Outcomes, Plans, Observations, and MAF — never mixes
 * counterfactual Scout R into realized Trade P/L or win/loss stats.
 */
import {
  LEARNING_OUTCOME_KIND_LABELS,
  type LearningOutcome,
  type LearningOutcomeKind,
} from "./learning-outcome-types";
import {
  MAF_COMPONENT_IDS,
  MAF_COMPONENT_LABELS,
  type MafComponentId,
  type MafExperiment,
} from "./maf-types";
import type { ObservationRecord } from "./observation-types";
import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";
import { computeScoutLearningAggregates } from "./learning-scout-aggregates";

/** User-facing pipeline components required by 30-2C (subset of MAF ids). */
export const PIPELINE_PERFORMANCE_COMPONENTS = [
  "thesis_quality",
  "zone_quality",
  "entry_quality",
  "stop_quality",
  "execution_quality",
  "timing_quality",
  "capital_allocation_quality",
] as const satisfies readonly MafComponentId[];

export type PipelinePerformanceComponentId =
  (typeof PIPELINE_PERFORMANCE_COMPONENTS)[number];

export const PIPELINE_PERFORMANCE_COMPONENT_LABELS: Record<
  PipelinePerformanceComponentId,
  string
> = {
  thesis_quality: "Thesis",
  zone_quality: "Zone",
  entry_quality: "Entry",
  stop_quality: "Stop",
  execution_quality: "Execution",
  timing_quality: "Timing",
  capital_allocation_quality: "Capital allocation",
};

export const PIPELINE_OUTCOME_BUCKETS = [
  "executed_trades",
  "missed_opportunities",
  "unexecuted_plan_losses",
  "cancelled_plans",
  "expired_plans",
  "observations_pending",
] as const;

export type PipelineOutcomeBucket = (typeof PIPELINE_OUTCOME_BUCKETS)[number];

export const PIPELINE_OUTCOME_BUCKET_LABELS: Record<PipelineOutcomeBucket, string> = {
  executed_trades: "Executed trades",
  missed_opportunities: "Missed opportunities",
  unexecuted_plan_losses: "Unexecuted plan losses",
  cancelled_plans: "Cancelled plans",
  expired_plans: "Expired plans",
  observations_pending: "Observations pending",
};

export type PipelineExecutedMode = "all" | "executed" | "non_executed";

export type PipelinePerformanceFilters = {
  from?: string;
  to?: string;
  ticker?: string;
  playbookId?: string;
  outcomeType?: PipelineOutcomeBucket | "all";
  executedMode?: PipelineExecutedMode;
  pipelineComponent?: MafComponentId | "all";
};

export type PipelineDrillIdentity = {
  tradeId?: string;
  planId?: string;
  observationId?: string;
  learningOutcomeId?: string;
  mafExperimentId?: string;
  /** Primary drill-down href for the row. */
  href: string;
};

export type PipelineDrillRow = PipelineDrillIdentity & {
  id: string;
  outcomeType: PipelineOutcomeBucket;
  ticker: string;
  date: string;
  playbookId?: string;
  label: string;
  primaryDragComponent?: MafComponentId;
  /** Realized only — never populated from counterfactual Scout evidence. */
  realizedR?: number | null;
  realizedPnL?: number | null;
  /** Counterfactual only — never folded into realized P/L. */
  counterfactualR?: number | null;
};

export type PipelineComponentStat = {
  component: MafComponentId;
  label: string;
  evaluationCount: number;
  failureCount: number;
  dragCount: number;
};

export type PipelinePerformanceView = {
  summaryCounts: Record<PipelineOutcomeBucket, number>;
  componentDistribution: PipelineComponentStat[];
  repeatedDragComponents: Array<{
    component: MafComponentId;
    label: string;
    count: number;
  }>;
  pendingObservationCount: number;
  /** Executed Trade performance only. */
  realized: {
    tradeCount: number;
    wins: number;
    losses: number;
    realizedRSum: number;
    realizedPnLSum: number;
  };
  /** Scout / non-executed counterfactual — kept separate. */
  counterfactual: {
    scoutEvaluatedCount: number;
    unexecutedPlanLossCount: number;
    counterfactualRSum: number;
  };
  rows: PipelineDrillRow[];
  empty: boolean;
};

export type PipelinePerformanceInput = {
  learningOutcomes: LearningOutcome[];
  plans: TradePlan[];
  trades: Trade[];
  observations: ObservationRecord[];
  mafExperiments: MafExperiment[];
  filters?: PipelinePerformanceFilters;
};

function inRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return true;
  if (!from && !to) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  if (from && t < Date.parse(from)) return false;
  if (to && t > Date.parse(to)) return false;
  return true;
}

function drillHref(ids: {
  tradeId?: string;
  planId?: string;
}): string {
  if (ids.tradeId) return `/trades/${ids.tradeId}`;
  if (ids.planId) return `/planning?plan=${ids.planId}`;
  return "/planning";
}

function emptyCounts(): Record<PipelineOutcomeBucket, number> {
  return {
    executed_trades: 0,
    missed_opportunities: 0,
    unexecuted_plan_losses: 0,
    cancelled_plans: 0,
    expired_plans: 0,
    observations_pending: 0,
  };
}

function loBucket(kind: LearningOutcomeKind): PipelineOutcomeBucket | null {
  switch (kind) {
    case "executed_win":
    case "executed_loss":
      return "executed_trades";
    case "missed_opportunity":
      return "missed_opportunities";
    case "unexecuted_plan_loss":
      return "unexecuted_plan_losses";
    case "cancelled":
      return "cancelled_plans";
    case "expired":
      return "expired_plans";
    default:
      return null;
  }
}

function mafForLo(
  lo: LearningOutcome,
  mafByLo: Map<string, MafExperiment>,
  mafByTrade: Map<string, MafExperiment>,
  mafByPlan: Map<string, MafExperiment>
): MafExperiment | undefined {
  if (lo.mafExperimentId) {
    const byId = mafByLo.get(lo.mafExperimentId.toUpperCase());
    if (byId) return byId;
  }
  if (lo.tradeId) {
    const byTrade = mafByTrade.get(lo.tradeId.toUpperCase());
    if (byTrade) return byTrade;
  }
  if (lo.planId) return mafByPlan.get(lo.planId.toUpperCase());
  return undefined;
}

function passesBaseFilters(
  row: {
    ticker: string;
    playbookId?: string;
    date: string;
    outcomeType: PipelineOutcomeBucket;
    primaryDragComponent?: MafComponentId;
  },
  f: PipelinePerformanceFilters
): boolean {
  if (f.ticker && row.ticker.toUpperCase() !== f.ticker.toUpperCase()) return false;
  if (f.playbookId && row.playbookId !== f.playbookId) return false;
  if (!inRange(row.date, f.from, f.to)) return false;
  if (f.outcomeType && f.outcomeType !== "all" && row.outcomeType !== f.outcomeType) {
    return false;
  }
  if (f.executedMode === "executed" && row.outcomeType !== "executed_trades") {
    return false;
  }
  if (f.executedMode === "non_executed" && row.outcomeType === "executed_trades") {
    return false;
  }
  if (
    f.pipelineComponent &&
    f.pipelineComponent !== "all" &&
    row.primaryDragComponent !== f.pipelineComponent
  ) {
    return false;
  }
  return true;
}

/**
 * Build Pipeline Performance view from canonical MTA stores.
 * Missed Scouts never contribute to Trade win/loss / realized P/L.
 */
export function computePipelinePerformance(
  input: PipelinePerformanceInput
): PipelinePerformanceView {
  const f = input.filters ?? {};
  const mafById = new Map(
    input.mafExperiments.map((m) => [m.id.toUpperCase(), m] as const)
  );
  const mafByTrade = new Map<string, MafExperiment>();
  const mafByPlan = new Map<string, MafExperiment>();
  for (const m of input.mafExperiments) {
    if (m.tradeId) mafByTrade.set(m.tradeId.toUpperCase(), m);
    if (m.planId && !m.tradeId) mafByPlan.set(m.planId.toUpperCase(), m);
  }

  const rows: PipelineDrillRow[] = [];
  const coveredPlanIds = new Set<string>();
  const coveredObsIds = new Set<string>();

  for (const lo of input.learningOutcomes) {
    if (lo.excludedFromMetrics === true) continue;
    if (lo.kind === "duplicate_creation") continue;
    const bucket = loBucket(lo.kind);
    if (!bucket) continue;

    const maf = mafForLo(lo, mafById, mafByTrade, mafByPlan);
    const date = lo.updatedAt || lo.createdAt;
    const rowBase = {
      ticker: lo.ticker,
      playbookId: lo.playbookId,
      date,
      outcomeType: bucket,
      primaryDragComponent: maf?.primaryDragComponent,
    };
    if (!passesBaseFilters(rowBase, f)) continue;

    const isExecuted = bucket === "executed_trades";
    rows.push({
      id: `lo:${lo.id}`,
      outcomeType: bucket,
      ticker: lo.ticker,
      date,
      playbookId: lo.playbookId,
      label: LEARNING_OUTCOME_KIND_LABELS[lo.kind],
      primaryDragComponent: maf?.primaryDragComponent,
      // Strict separation: realized fields only for executed kinds.
      realizedR: isExecuted ? lo.realizedR ?? lo.rAchieved ?? null : null,
      realizedPnL: isExecuted ? lo.realizedPnL ?? null : null,
      counterfactualR: !isExecuted ? lo.counterfactualR ?? null : null,
      tradeId: lo.tradeId,
      planId: lo.planId,
      observationId: lo.observationId,
      learningOutcomeId: lo.id,
      mafExperimentId: maf?.id ?? lo.mafExperimentId,
      href: drillHref({ tradeId: lo.tradeId, planId: lo.planId }),
    });
    if (lo.planId) coveredPlanIds.add(lo.planId.toUpperCase());
    if (lo.observationId) coveredObsIds.add(lo.observationId.toUpperCase());
  }

  // Plans without LO: expired / skipped (cancelled analogue) only.
  for (const plan of input.plans) {
    if (coveredPlanIds.has(plan.id.toUpperCase())) continue;
    let bucket: PipelineOutcomeBucket | null = null;
    if (plan.status === "expired") bucket = "expired_plans";
    else if (plan.status === "skipped") bucket = "cancelled_plans";
    if (!bucket) continue;
    const date = plan.updatedAt || plan.createdAt;
    const rowBase = {
      ticker: plan.ticker,
      playbookId: plan.playbookId,
      date,
      outcomeType: bucket,
      primaryDragComponent: undefined as MafComponentId | undefined,
    };
    if (!passesBaseFilters(rowBase, f)) continue;
    rows.push({
      id: `plan:${plan.id}`,
      outcomeType: bucket,
      ticker: plan.ticker,
      date,
      playbookId: plan.playbookId,
      label: bucket === "expired_plans" ? "Expired plan" : "Cancelled plan",
      realizedR: null,
      realizedPnL: null,
      counterfactualR: plan.outcome?.theoreticalResultR ?? null,
      planId: plan.id,
      href: drillHref({ planId: plan.id }),
    });
  }

  for (const obs of input.observations) {
    if (obs.status !== "observing") continue;
    if (coveredObsIds.has(obs.id.toUpperCase())) {
      // Still count as pending observation row if filters allow.
    }
    const date = obs.startedAt;
    const rowBase = {
      ticker: obs.ticker,
      playbookId: undefined as string | undefined,
      date,
      outcomeType: "observations_pending" as const,
      primaryDragComponent: undefined as MafComponentId | undefined,
    };
    if (!passesBaseFilters(rowBase, f)) continue;
    rows.push({
      id: `obs:${obs.id}`,
      outcomeType: "observations_pending",
      ticker: obs.ticker,
      date,
      label: "Observation pending",
      realizedR: null,
      realizedPnL: null,
      counterfactualR: null,
      tradeId: obs.tradeId,
      planId: obs.planId,
      observationId: obs.id,
      learningOutcomeId: obs.learningOutcomeId,
      href: drillHref({ tradeId: obs.tradeId, planId: obs.planId }),
    });
  }

  rows.sort((a, b) => b.date.localeCompare(a.date));

  const summaryCounts = emptyCounts();
  for (const row of rows) {
    summaryCounts[row.outcomeType] += 1;
  }

  // Component distribution from MAF (filtered by ticker/playbook/date/component).
  const componentMap = new Map<MafComponentId, PipelineComponentStat>();
  for (const id of MAF_COMPONENT_IDS) {
    componentMap.set(id, {
      component: id,
      label:
        PIPELINE_PERFORMANCE_COMPONENT_LABELS[
          id as PipelinePerformanceComponentId
        ] ?? MAF_COMPONENT_LABELS[id],
      evaluationCount: 0,
      failureCount: 0,
      dragCount: 0,
    });
  }

  for (const exp of input.mafExperiments) {
    if (f.ticker && exp.ticker.toUpperCase() !== f.ticker.toUpperCase()) continue;
    if (f.playbookId && exp.playbookId !== f.playbookId) continue;
    if (!inRange(exp.updatedAt || exp.createdAt, f.from, f.to)) continue;
    if (
      f.pipelineComponent &&
      f.pipelineComponent !== "all" &&
      exp.primaryDragComponent !== f.pipelineComponent &&
      !exp.attributions.some((a) => a.component === f.pipelineComponent)
    ) {
      continue;
    }
    if (exp.primaryDragComponent) {
      const drag = componentMap.get(exp.primaryDragComponent);
      if (drag) drag.dragCount += 1;
    }
    for (const attr of exp.attributions) {
      const stat = componentMap.get(attr.component);
      if (!stat) continue;
      if (
        attr.classification === "inconclusive" ||
        attr.classification === "not_applicable"
      ) {
        continue;
      }
      stat.evaluationCount += 1;
      if (attr.classification === "failure" || attr.classification === "weak") {
        stat.failureCount += 1;
      }
    }
  }

  const componentDistribution = PIPELINE_PERFORMANCE_COMPONENTS.map(
    (id) => componentMap.get(id)!
  );

  const repeatedDragComponents = [...componentMap.values()]
    .filter((c) => c.dragCount > 0)
    .sort((a, b) => b.dragCount - a.dragCount || b.failureCount - a.failureCount)
    .map((c) => ({
      component: c.component,
      label: c.label,
      count: c.dragCount,
    }));

  // Realized: executed rows only — never missed/UPL/cancelled/expired.
  let realizedRSum = 0;
  let realizedPnLSum = 0;
  let wins = 0;
  let losses = 0;
  for (const row of rows) {
    if (row.outcomeType !== "executed_trades") continue;
    if (row.realizedR !== undefined && row.realizedR !== null) {
      realizedRSum += row.realizedR;
      if (row.realizedR > 0) wins += 1;
      else if (row.realizedR < 0) losses += 1;
    }
    if (row.realizedPnL !== undefined && row.realizedPnL !== null) {
      realizedPnLSum += row.realizedPnL;
    }
  }

  // Counterfactual via existing Scout aggregator (reused), then clamp to filter scope.
  const scoutAgg = computeScoutLearningAggregates({
    learningOutcomes: input.learningOutcomes,
    plans: input.plans,
    mafExperiments: input.mafExperiments,
    filters: {
      ticker: f.ticker,
      playbookId: f.playbookId,
      from: f.from,
      to: f.to,
    },
  });

  let counterfactualRSum = 0;
  for (const row of rows) {
    if (row.outcomeType === "executed_trades") continue;
    if (row.counterfactualR !== undefined && row.counterfactualR !== null) {
      counterfactualRSum += row.counterfactualR;
    }
  }

  const pendingObservationCount = summaryCounts.observations_pending;

  return {
    summaryCounts,
    componentDistribution,
    repeatedDragComponents,
    pendingObservationCount,
    realized: {
      tradeCount: summaryCounts.executed_trades,
      wins,
      losses,
      realizedRSum: Math.round(realizedRSum * 1000) / 1000,
      realizedPnLSum: Math.round(realizedPnLSum * 100) / 100,
    },
    counterfactual: {
      scoutEvaluatedCount: scoutAgg.evaluatedScoutCount,
      unexecutedPlanLossCount: scoutAgg.unexecutedPlanLossCount,
      counterfactualRSum: Math.round(counterfactualRSum * 1000) / 1000,
    },
    rows,
    empty: rows.length === 0,
  };
}

/** Guard helpers for tests / callers. */
export function isRealizedOutcomeBucket(bucket: PipelineOutcomeBucket): boolean {
  return bucket === "executed_trades";
}

export function isCounterfactualOutcomeBucket(
  bucket: PipelineOutcomeBucket
): boolean {
  return (
    bucket === "missed_opportunities" ||
    bucket === "unexecuted_plan_losses" ||
    bucket === "cancelled_plans" ||
    bucket === "expired_plans"
  );
}
