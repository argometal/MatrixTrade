import type { PostStopStudy, LossClassification } from "../asymmetry-types";
import {
  isLegacyAbsentPlanId,
  isLegacyAbsentPlaybookId,
  normalizeLegacyTradeLinks,
} from "../legacy-trade-completion";
import type { MistakeType, Trade, TradeDirection, TradeStatus } from "../types";

/** Fields computed at load time — never persisted. */
export function stripComputedTradeFields(trade: Trade): Trade {
  const { obsidianNote: _o, notePath: _n, inconsistent: _i, ...rest } = trade;
  return rest;
}

export interface TradeRow {
  id: string;
  ticker: string;
  entry: number | string;
  exit: number | string | null;
  stop: number | string;
  target: number | string | null;
  shares: number;
  status: TradeStatus;
  created_at: string;
  closed_at: string | null;
  setup_id: string | null;
  playbook_id: string | null;
  plan_id: string | null;
  playbook_historically_absent: boolean | null;
  plan_historically_absent: boolean | null;
  setup: string | null;
  direction: TradeDirection | null;
  planned_risk: number | string | null;
  actual_risk: number | string | null;
  risk_reward_planned: number | string | null;
  risk_reward_actual: number | string | null;
  mistakes: string[] | null;
  quality_entry: number | null;
  quality_exit: number | null;
  quality_mgmt: number | null;
  reviewed_at: string | null;
  lesson: string | null;
  action_item: string | null;
  thesis: string | null;
  psychology: string | null;
  lessons: string | null;
  notes: string | null;
  loss_classification: string | null;
  post_stop_study: PostStopStudy | null;
  dates_reconstructed: boolean | null;
  date_correction_note: string | null;
  date_correction_audit: Trade["dateCorrectionAudit"] | null;
}

function num(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function bool(value: boolean | null | undefined): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  return Boolean(value);
}

/** Never write Apply sentinels into FK / link columns. */
function sanitizePlaybookIdForRow(value: string | undefined): string | null {
  if (!value || isLegacyAbsentPlaybookId(value) || value === "__none__") return null;
  return value;
}

function sanitizePlanIdForRow(value: string | undefined): string | null {
  if (!value || isLegacyAbsentPlanId(value) || value === "__none__") return null;
  return value;
}

export function tradeRowToTrade(row: TradeRow): Trade {
  const rawPlaybook = str(row.playbook_id);
  const rawPlan = str(row.plan_id);
  const fromFlags = {
    playbookHistoricallyAbsent: bool(row.playbook_historically_absent),
    planHistoricallyAbsent: bool(row.plan_historically_absent),
  };
  // Recover if an older build wrote sentinels into the columns before 25-F8.
  const recovered = normalizeLegacyTradeLinks({
    playbookId: rawPlaybook,
    planId: rawPlan,
    playbookHistoricallyAbsent: fromFlags.playbookHistoricallyAbsent,
    planHistoricallyAbsent: fromFlags.planHistoricallyAbsent,
  });

  return {
    id: row.id.toUpperCase(),
    ticker: row.ticker.toUpperCase(),
    entry: num(row.entry) ?? 0,
    exit: num(row.exit),
    stop: num(row.stop) ?? 0,
    target: num(row.target),
    shares: row.shares,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at ?? undefined,
    setupId: str(row.setup_id),
    playbookId: recovered.playbookId,
    playbookHistoricallyAbsent: recovered.playbookHistoricallyAbsent || undefined,
    planId: recovered.planId,
    planHistoricallyAbsent: recovered.planHistoricallyAbsent || undefined,
    setup: str(row.setup),
    direction: row.direction ?? undefined,
    plannedRisk: num(row.planned_risk),
    actualRisk: num(row.actual_risk),
    riskRewardPlanned: num(row.risk_reward_planned),
    riskRewardActual: num(row.risk_reward_actual),
    mistakes: (row.mistakes ?? undefined) as MistakeType[] | undefined,
    qualityEntry: row.quality_entry ?? undefined,
    qualityExit: row.quality_exit ?? undefined,
    qualityMgmt: row.quality_mgmt ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    lesson: str(row.lesson),
    actionItem: str(row.action_item),
    thesis: str(row.thesis),
    psychology: str(row.psychology),
    lessons: str(row.lessons),
    notes: str(row.notes),
    lossClassification: str(row.loss_classification) as LossClassification | undefined,
    postStopStudy: row.post_stop_study ?? undefined,
    datesReconstructed: bool(row.dates_reconstructed) || undefined,
    dateCorrectionNote: str(row.date_correction_note),
    dateCorrectionAudit: Array.isArray(row.date_correction_audit)
      ? row.date_correction_audit
      : undefined,
  };
}

export function tradeToRow(trade: Trade): TradeRow {
  const stored = stripComputedTradeFields(trade);
  const links = normalizeLegacyTradeLinks({
    playbookId: stored.playbookId,
    planId: stored.planId,
    playbookHistoricallyAbsent: stored.playbookHistoricallyAbsent,
    planHistoricallyAbsent: stored.planHistoricallyAbsent,
  });
  return {
    id: stored.id.toUpperCase(),
    ticker: stored.ticker.toUpperCase(),
    entry: stored.entry,
    exit: stored.exit ?? null,
    stop: stored.stop,
    target: stored.target ?? null,
    shares: stored.shares,
    status: stored.status,
    created_at: stored.createdAt,
    closed_at: stored.closedAt ?? null,
    setup_id: stored.setupId ?? null,
    playbook_id: sanitizePlaybookIdForRow(links.playbookId),
    plan_id: sanitizePlanIdForRow(links.planId),
    playbook_historically_absent: links.playbookHistoricallyAbsent,
    plan_historically_absent: links.planHistoricallyAbsent,
    setup: stored.setup ?? null,
    direction: stored.direction ?? null,
    planned_risk: stored.plannedRisk ?? null,
    actual_risk: stored.actualRisk ?? null,
    risk_reward_planned: stored.riskRewardPlanned ?? null,
    risk_reward_actual: stored.riskRewardActual ?? null,
    mistakes: stored.mistakes ?? [],
    quality_entry: stored.qualityEntry ?? null,
    quality_exit: stored.qualityExit ?? null,
    quality_mgmt: stored.qualityMgmt ?? null,
    reviewed_at: stored.reviewedAt ?? null,
    lesson: stored.lesson ?? null,
    action_item: stored.actionItem ?? null,
    thesis: stored.thesis ?? null,
    psychology: stored.psychology ?? null,
    lessons: stored.lessons ?? null,
    notes: stored.notes ?? null,
    loss_classification: stored.lossClassification ?? null,
    post_stop_study: stored.postStopStudy ?? null,
    dates_reconstructed: Boolean(stored.datesReconstructed),
    date_correction_note: stored.dateCorrectionNote ?? null,
    date_correction_audit: stored.dateCorrectionAudit ?? [],
  };
}

/** Base trade row without asymmetry learning columns (pre-migration schema). */
export function tradeToRowWithoutLearningExtensions(
  trade: Trade
): Omit<TradeRow, "loss_classification" | "post_stop_study"> {
  const row = tradeToRow(trade);
  const { loss_classification: _l, post_stop_study: _p, ...base } = row;
  return base;
}

/** Row without plan_id / historically_absent columns (pre–25-F8 schema). Keeps learning cols. */
export function tradeToRowWithoutLegacyAbsenceColumns(
  trade: Trade
): Omit<TradeRow, "plan_id" | "playbook_historically_absent" | "plan_historically_absent"> {
  const row = tradeToRow(trade);
  const {
    plan_id: _plan,
    playbook_historically_absent: _pha,
    plan_historically_absent: _pla,
    ...base
  } = row;
  return base;
}

/** Most-compatible row: no learning cols and no legacy-absence cols. */
export function tradeToRowCoreOnly(
  trade: Trade
): Omit<
  TradeRow,
  | "loss_classification"
  | "post_stop_study"
  | "plan_id"
  | "playbook_historically_absent"
  | "plan_historically_absent"
> {
  const row = tradeToRowWithoutLegacyAbsenceColumns(trade);
  const { loss_classification: _l, post_stop_study: _p, ...base } = row;
  return base;
}

export function isMissingLearningColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("loss_classification") ||
    lower.includes("post_stop_study") ||
    (lower.includes("schema cache") && lower.includes("column"))
  );
}

export function isMissingLegacyAbsenceColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("playbook_historically_absent") ||
    lower.includes("plan_historically_absent") ||
    lower.includes("plan_id") ||
    (lower.includes("schema cache") && lower.includes("column"))
  );
}

export function isMissingDateCorrectionColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("dates_reconstructed") ||
    lower.includes("date_correction_note") ||
    lower.includes("date_correction_audit") ||
    (lower.includes("schema cache") && lower.includes("column"))
  );
}

export function tradeToRowWithoutDateCorrectionColumns(
  trade: Trade
): Omit<TradeRow, "dates_reconstructed" | "date_correction_note" | "date_correction_audit"> {
  const row = tradeToRow(trade);
  const {
    dates_reconstructed: _dr,
    date_correction_note: _dn,
    date_correction_audit: _da,
    ...base
  } = row;
  return base;
}
