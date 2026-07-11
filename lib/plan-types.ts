import type { ScoutDecision, ScoutLifecycleStatus } from "./scout-decision-types";
import type { LayeredEntryPlan } from "./layered-entry-types";
import type { Probe } from "./scout-probe-types";

export type PlanStatus =
  | "watching"
  | "ready"
  | "entered"
  | "skipped"
  | "failed"
  | "expired";

export type PlanFailReason =
  | "no_trigger"
  | "stopped_early"
  | "news"
  | "slippage"
  | "discipline"
  | "other";

export const PLAN_TIMEFRAMES = [
  "6M",
  "3M",
  "1W",
  "1D",
  "1H",
  "30m",
  "15m",
  "5m",
] as const;

export type PlanTimeframe = (typeof PLAN_TIMEFRAMES)[number];

export const PLAN_TIMEFRAME_ORDER: Record<PlanTimeframe, number> = {
  "6M": 0,
  "3M": 1,
  "1W": 2,
  "1D": 3,
  "1H": 4,
  "30m": 5,
  "15m": 6,
  "5m": 7,
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  watching: "Watching",
  ready: "Ready",
  entered: "Entered",
  skipped: "Skipped",
  failed: "Failed",
  expired: "Expired",
};

export const PLAN_FAIL_REASON_LABELS: Record<PlanFailReason, string> = {
  no_trigger: "No trigger",
  stopped_early: "Stopped early",
  news: "News / event",
  slippage: "Slippage",
  discipline: "Discipline",
  other: "Other",
};

export const PLAN_EXTERNAL_FACTORS = [
  "earnings",
  "gap",
  "low_volume",
  "macro",
  "timing",
] as const;

export interface PlanOutcome {
  recordedAt: string;
  reason?: PlanFailReason;
  strategyStillValid?: boolean;
  externalFactors?: string[];
  lesson?: string;
}

export interface TradePlan {
  id: string;
  ticker: string;
  playbookId?: string;
  stockThesisId?: string;
  status: PlanStatus;
  analysisTimeframes: PlanTimeframe[];
  entryTimeframe: PlanTimeframe;
  plannedEntry?: number;
  supportLevel?: number;
  stopPrice?: number;
  targetPrice?: number;
  plannedRR?: number;
  validFrom?: string;
  validUntil?: string;
  thesis?: string;
  chatNotes?: string;
  linkedTradeId?: string;
  outcome?: PlanOutcome;
  /** Latest decision snapshot (V2 Decision Engine). */
  decision?: ScoutDecision;
  /** Append-only decision chain. */
  decisionHistory?: ScoutDecision[];
  /** Derived scout lifecycle — updated on decision/probe changes. */
  scoutLifecycle?: ScoutLifecycleStatus;
  /** Probe authorization artifact — legacy; prefer layeredEntry for entry optimization. */
  probe?: Probe;
  /** Layered limit entry plan — entry optimization without changing thesis/stop/targets/size. */
  layeredEntry?: LayeredEntryPlan;
  /** Which execution experiment is active on this scout (e.g. layered_limits). */
  executionMethod?: LayeredEntryPlan["executionMethod"];
  createdAt: string;
  updatedAt: string;
}

export type SavePlanInput = {
  id?: string;
  ticker: string;
  playbookId?: string;
  stockThesisId?: string;
  analysisTimeframes: PlanTimeframe[];
  entryTimeframe: PlanTimeframe;
  plannedEntry?: number;
  supportLevel?: number;
  stopPrice?: number;
  targetPrice?: number;
  plannedRR?: number;
  validFrom?: string;
  validUntil?: string;
  thesis?: string;
  chatNotes?: string;
};

export type RecordPlanOutcomeInput = {
  reason?: PlanFailReason;
  strategyStillValid: boolean;
  externalFactors?: string[];
  lesson?: string;
};
