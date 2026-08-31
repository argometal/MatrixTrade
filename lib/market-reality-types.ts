/**
 * Prompt #12C — Market Reality evidence atoms (Case-bound OHLCV).
 * Per #12A contract. Not a market warehouse.
 */

export const MARKET_REALITY_SOURCE_YAHOO = "yahoo_finance_chart_v8" as const;

export type MarketRealitySourceId =
  | typeof MARKET_REALITY_SOURCE_YAHOO
  | string;

/** One OHLCV bar — minimum Reality atom. */
export type MarketRealityBar = {
  /** Bar open time (ISO UTC). */
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Case-bound window of bars — store/evaluate the Case, not the market. */
export type MarketRealityCaseWindow = {
  id: string;
  planId: string;
  ticker: string;
  timeframe: "1d";
  source: MarketRealitySourceId;
  /** Decision-boundary / post-decision window start (ISO). */
  decisionBoundaryAt: string;
  windowStart: string;
  windowEnd: string;
  /** Optional label: original_plan_window | retrospective_observation */
  windowKind: "original_plan_window" | "retrospective_observation";
  retrievedAt: string;
  /** Yahoo note: adjusted close used when available; equity regular session. */
  sessionNote: string;
  bars: MarketRealityBar[];
};

export type LevelReach = "YES" | "NO" | "UNKNOWN";

export type MarketRealityLevelGeometry = {
  plannedEntry: number | null;
  supportLow: number | null;
  supportHigh: number | null;
  stop: number | null;
  target: number | null;
};

export type MarketRealityFactualSummary = {
  entryLevelReached: LevelReach;
  thesisZoneReached: LevelReach;
  stopLevelReached: LevelReach;
  targetReached: LevelReach;
  windowHigh: number | null;
  windowLow: number | null;
  windowHighAt: string | null;
  windowLowAt: string | null;
  /** Favorable excursion vs plannedEntry (long assumption): max(high) - entry. */
  mfePrice: number | null;
  /** Adverse excursion vs plannedEntry (long): entry - min(low). */
  maePrice: number | null;
  firstZoneTouchAt: string | null;
  firstEntryTouchAt: string | null;
  firstStopTouchAt: string | null;
  firstTargetTouchAt: string | null;
};

export type RelativeVolumePoint = {
  timestamp: string;
  volume: number;
  /** volume / mean(volume of prior baselineBars in series). null if baseline insufficient. */
  relativeVolume: number | null;
};

export type MarketRealityViewModel = {
  available: boolean;
  reason?: string;
  window: MarketRealityCaseWindow | null;
  /** Same window bars with relative volume context when derivable. */
  relativeVolume: RelativeVolumePoint[];
  relativeVolumeBaselineBars: number;
  relativeVolumeDefinition: string;
  summary: MarketRealityFactualSummary | null;
  geometry: MarketRealityLevelGeometry;
  exAnteIntegrity: "supported_legacy" | "verified_t0" | "unavailable";
};
