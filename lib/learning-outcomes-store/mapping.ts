/**
 * LearningOutcome ↔ Supabase row — preserve 0 / false / null (no truthiness drops).
 */
import type {
  LearningOutcome,
  LearningOutcomeKind,
  LearningOutcomeLifecycle,
  LearningOutcomeSource,
} from "../learning-outcome-types";

export interface LearningOutcomeRow {
  id: string;
  kind: string;
  ticker: string;
  stock_thesis_id: string | null;
  plan_id: string | null;
  trade_id: string | null;
  playbook_id: string | null;
  observation_id: string | null;
  maf_experiment_id: string | null;
  r_achieved: number | null;
  realized_r: number | null;
  counterfactual_r: number | null;
  realized_pnl: number | null;
  counterfactual_dollar_result: number | null;
  entry_reached: boolean | null;
  stop_reached_before_target: boolean | null;
  target_reached_before_stop: boolean | null;
  non_execution_reason: string | null;
  excluded_from_metrics: boolean;
  lifecycle_status: string;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Preserve explicit null (e.g. unavailable counterfactual $). */
function numOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function bool(value: unknown): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return undefined;
}

export function learningOutcomeRowToRecord(row: LearningOutcomeRow): LearningOutcome {
  const dollar = numOrNull(row.counterfactual_dollar_result);
  return {
    id: String(row.id).toUpperCase(),
    kind: row.kind as LearningOutcomeKind,
    ticker: String(row.ticker).toUpperCase(),
    stockThesisId: str(row.stock_thesis_id),
    planId: str(row.plan_id)?.toUpperCase(),
    tradeId: str(row.trade_id)?.toUpperCase(),
    playbookId: str(row.playbook_id),
    observationId: str(row.observation_id)?.toUpperCase(),
    mafExperimentId: str(row.maf_experiment_id)?.toUpperCase(),
    rAchieved: num(row.r_achieved),
    realizedR: num(row.realized_r),
    counterfactualR: num(row.counterfactual_r),
    realizedPnL: num(row.realized_pnl),
    counterfactualDollarResult: dollar === undefined ? undefined : dollar,
    entryReached: bool(row.entry_reached),
    stopReachedBeforeTarget: bool(row.stop_reached_before_target),
    targetReachedBeforeStop: bool(row.target_reached_before_stop),
    nonExecutionReason: str(row.non_execution_reason),
    excludedFromMetrics: row.excluded_from_metrics === true,
    lifecycleStatus: row.lifecycle_status as LearningOutcomeLifecycle,
    // Preserve DB null — do not coerce cleared notes to undefined.
    notes: row.notes === null ? null : str(row.notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    source: (str(row.source) as LearningOutcomeSource) ?? "manual",
  };
}

export function learningOutcomeToRow(row: LearningOutcome): LearningOutcomeRow {
  return {
    id: row.id.toUpperCase(),
    kind: row.kind,
    ticker: row.ticker.toUpperCase(),
    stock_thesis_id: row.stockThesisId ?? null,
    plan_id: row.planId?.toUpperCase() ?? null,
    trade_id: row.tradeId?.toUpperCase() ?? null,
    playbook_id: row.playbookId ?? null,
    observation_id: row.observationId?.toUpperCase() ?? null,
    maf_experiment_id: row.mafExperimentId?.toUpperCase() ?? null,
    r_achieved: row.rAchieved ?? null,
    realized_r: row.realizedR ?? null,
    counterfactual_r: row.counterfactualR ?? null,
    realized_pnl: row.realizedPnL ?? null,
    counterfactual_dollar_result:
      row.counterfactualDollarResult === undefined
        ? null
        : row.counterfactualDollarResult,
    entry_reached: row.entryReached ?? null,
    stop_reached_before_target: row.stopReachedBeforeTarget ?? null,
    target_reached_before_stop: row.targetReachedBeforeStop ?? null,
    non_execution_reason: row.nonExecutionReason ?? null,
    excluded_from_metrics: row.excludedFromMetrics === true,
    lifecycle_status: row.lifecycleStatus,
    // undefined → null for insert; explicit null stays null (intentional clear).
    notes: row.notes === undefined ? null : row.notes,
    source: row.source ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
