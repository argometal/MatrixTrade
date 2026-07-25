import type {
  ObservationDataSource,
  ObservationRecord,
  ObservationStatus,
  ObservationTerminalEvent,
} from "../observation-types";

export interface ObservationRow {
  id: string;
  learning_outcome_id: string | null;
  trade_id: string | null;
  plan_id: string | null;
  ticker: string;
  status: string;
  started_at: string;
  ends_at: string;
  duration_days: number;
  reference_entry: number | null;
  reference_stop: number | null;
  reference_targets: number[] | null;
  thesis_invalidation_note: string | null;
  target_reached: boolean | null;
  target_reached_at: string | null;
  thesis_invalidated: boolean | null;
  invalidation_reached_at: string | null;
  first_terminal_event: string | null;
  max_price: number | null;
  min_price: number | null;
  mfe: number | null;
  mae: number | null;
  mfe_mae_unit: string | null;
  better_entry_available: boolean | null;
  better_entry_price: number | null;
  data_source: string | null;
  notes: string | null;
  created_at: string;
  last_updated_at: string;
}

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
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

export function observationRowToRecord(row: ObservationRow): ObservationRecord {
  const targets = Array.isArray(row.reference_targets)
    ? row.reference_targets.map(Number).filter(Number.isFinite)
    : undefined;
  return {
    id: String(row.id).toUpperCase(),
    learningOutcomeId: str(row.learning_outcome_id),
    tradeId: str(row.trade_id)?.toUpperCase(),
    planId: str(row.plan_id)?.toUpperCase(),
    ticker: String(row.ticker).toUpperCase(),
    status: row.status as ObservationStatus,
    startedAt: String(row.started_at),
    endsAt: String(row.ends_at),
    durationDays: Number(row.duration_days),
    referenceEntry: num(row.reference_entry),
    referenceStop: num(row.reference_stop),
    referenceTargets: targets?.length ? targets : undefined,
    thesisInvalidationNote: str(row.thesis_invalidation_note),
    targetReached: bool(row.target_reached),
    targetReachedAt: str(row.target_reached_at),
    thesisInvalidated: bool(row.thesis_invalidated),
    invalidationReachedAt: str(row.invalidation_reached_at),
    firstTerminalEvent: str(row.first_terminal_event) as
      | ObservationTerminalEvent
      | undefined,
    maxPrice: num(row.max_price),
    minPrice: num(row.min_price),
    mfe: num(row.mfe),
    mae: num(row.mae),
    mfeMaeUnit:
      row.mfe_mae_unit === "price" || row.mfe_mae_unit === "r"
        ? row.mfe_mae_unit
        : undefined,
    betterEntryAvailable: bool(row.better_entry_available),
    betterEntryPrice: num(row.better_entry_price),
    dataSource: str(row.data_source) as ObservationDataSource | undefined,
    notes: str(row.notes),
    createdAt: String(row.created_at),
    lastUpdatedAt: String(row.last_updated_at),
  };
}

export function observationToRow(row: ObservationRecord): ObservationRow {
  return {
    id: row.id.toUpperCase(),
    learning_outcome_id: row.learningOutcomeId ?? null,
    trade_id: row.tradeId?.toUpperCase() ?? null,
    plan_id: row.planId?.toUpperCase() ?? null,
    ticker: row.ticker.toUpperCase(),
    status: row.status,
    started_at: row.startedAt,
    ends_at: row.endsAt,
    duration_days: row.durationDays,
    reference_entry: row.referenceEntry ?? null,
    reference_stop: row.referenceStop ?? null,
    reference_targets: row.referenceTargets ?? null,
    thesis_invalidation_note: row.thesisInvalidationNote ?? null,
    target_reached: row.targetReached ?? null,
    target_reached_at: row.targetReachedAt ?? null,
    thesis_invalidated: row.thesisInvalidated ?? null,
    invalidation_reached_at: row.invalidationReachedAt ?? null,
    first_terminal_event: row.firstTerminalEvent ?? null,
    max_price: row.maxPrice ?? null,
    min_price: row.minPrice ?? null,
    mfe: row.mfe ?? null,
    mae: row.mae ?? null,
    mfe_mae_unit: row.mfeMaeUnit ?? null,
    better_entry_available: row.betterEntryAvailable ?? null,
    better_entry_price: row.betterEntryPrice ?? null,
    data_source: row.dataSource ?? null,
    notes: row.notes ?? null,
    created_at: row.createdAt,
    last_updated_at: row.lastUpdatedAt,
  };
}
