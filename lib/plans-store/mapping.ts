import type { PlanOutcome, TradePlan } from "../plan-types";
import { PLAN_TIMEFRAMES, type PlanTimeframe } from "../plan-types";
import type { LayeredEntryPlan } from "../layered-entry-types";
import type { FamilyBEntryAssessment } from "../family-b-types";
import type { ScoutDecision, ScoutLifecycleStatus } from "../scout-decision-types";
import type { Probe } from "../scout-probe-types";

type LayeredEntryRow = LayeredEntryPlan & {
  familyBAssessment?: FamilyBEntryAssessment;
};

interface PlanRow {
  id: string;
  ticker: string;
  playbook_id: string | null;
  stock_thesis_id: string | null;
  status: TradePlan["status"];
  analysis_timeframes: string[];
  entry_timeframe: string;
  planned_entry: number | null;
  support_level: number | null;
  stop_price: number | null;
  target_price: number | null;
  planned_rr: number | null;
  valid_from: string | null;
  valid_until: string | null;
  thesis: string | null;
  chat_notes: string | null;
  linked_trade_id: string | null;
  outcome: PlanOutcome | null;
  decision: ScoutDecision | null;
  decision_history: ScoutDecision[] | null;
  scout_lifecycle: ScoutLifecycleStatus | null;
  probe: Probe | null;
  layered_entry: LayeredEntryRow | null;
  execution_method: string | null;
  created_at: string;
  updated_at: string;
}

function parseTimeframe(value: string): PlanTimeframe {
  const normalized = value.trim();
  if ((PLAN_TIMEFRAMES as readonly string[]).includes(normalized)) {
    return normalized as PlanTimeframe;
  }
  return "5m";
}

export function planRowToPlan(row: PlanRow): TradePlan {
  const layeredRaw = row.layered_entry ?? undefined;
  let layeredEntry: LayeredEntryPlan | undefined;
  let familyBAssessment: FamilyBEntryAssessment | undefined;
  if (layeredRaw) {
    const { familyBAssessment: nested, ...rest } = layeredRaw;
    layeredEntry = rest;
    familyBAssessment = nested;
  }
  return {
    id: row.id,
    ticker: row.ticker,
    playbookId: row.playbook_id ?? undefined,
    stockThesisId: row.stock_thesis_id ?? undefined,
    status: row.status,
    analysisTimeframes: (row.analysis_timeframes ?? []).map(parseTimeframe),
    entryTimeframe: parseTimeframe(row.entry_timeframe),
    plannedEntry: row.planned_entry ?? undefined,
    supportLevel: row.support_level ?? undefined,
    stopPrice: row.stop_price ?? undefined,
    targetPrice: row.target_price ?? undefined,
    plannedRR: row.planned_rr ?? undefined,
    validFrom: row.valid_from ?? undefined,
    validUntil: row.valid_until ?? undefined,
    thesis: row.thesis ?? undefined,
    chatNotes: row.chat_notes ?? undefined,
    linkedTradeId: row.linked_trade_id ?? undefined,
    outcome: row.outcome ?? undefined,
    decision: row.decision ?? undefined,
    decisionHistory: row.decision_history ?? undefined,
    scoutLifecycle: row.scout_lifecycle ?? undefined,
    probe: row.probe ?? undefined,
    layeredEntry,
    familyBAssessment,
    executionMethod:
      (row.execution_method as LayeredEntryPlan["executionMethod"] | null) ??
      layeredEntry?.executionMethod ??
      undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Supabase row for upsert — omits columns not yet on all prod schemas. */
export function planToSupabaseRow(plan: TradePlan): Omit<PlanRow, "execution_method"> {
  const row = planToRow(plan);
  const { execution_method: _omit, ...rest } = row;
  return rest;
}

export function planToRow(plan: TradePlan): PlanRow {
  return {
    id: plan.id,
    ticker: plan.ticker.toUpperCase(),
    playbook_id: plan.playbookId ?? null,
    stock_thesis_id: plan.stockThesisId ?? null,
    status: plan.status,
    analysis_timeframes: plan.analysisTimeframes,
    entry_timeframe: plan.entryTimeframe,
    planned_entry: plan.plannedEntry ?? null,
    support_level: plan.supportLevel ?? null,
    stop_price: plan.stopPrice ?? null,
    target_price: plan.targetPrice ?? null,
    planned_rr: plan.plannedRR ?? null,
    valid_from: plan.validFrom ?? null,
    valid_until: plan.validUntil ?? null,
    thesis: plan.thesis ?? null,
    chat_notes: plan.chatNotes ?? null,
    linked_trade_id: plan.linkedTradeId ?? null,
    outcome: plan.outcome ?? null,
    decision: plan.decision ?? null,
    decision_history: plan.decisionHistory ?? [],
    scout_lifecycle: plan.scoutLifecycle ?? null,
    probe: plan.probe ?? null,
    layered_entry: plan.layeredEntry
      ? {
          ...plan.layeredEntry,
          ...(plan.familyBAssessment
            ? { familyBAssessment: plan.familyBAssessment }
            : {}),
        }
      : null,
    execution_method: plan.executionMethod ?? null,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  };
}
