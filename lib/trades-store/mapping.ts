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

export function tradeRowToTrade(row: TradeRow): Trade {
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
    playbookId: str(row.playbook_id),
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
  };
}

export function tradeToRow(trade: Trade): TradeRow {
  const stored = stripComputedTradeFields(trade);
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
    playbook_id: stored.playbookId ?? null,
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
  };
}
