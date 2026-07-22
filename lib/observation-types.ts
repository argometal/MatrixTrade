/** Post-trade / post-scout Observation Engine. Complements PostStopStudy on Trade. */

export const OBSERVATION_STATUSES = ["observing", "concluded"] as const;
export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number];

export const OBSERVATION_TERMINAL_EVENTS = [
  "target",
  "invalidation",
  "window_end",
  "none",
  "inconclusive",
] as const;
export type ObservationTerminalEvent = (typeof OBSERVATION_TERMINAL_EVENTS)[number];

export const OBSERVATION_DATA_SOURCES = [
  "manual",
  "ai",
  "post_stop_study",
  "market_feed",
] as const;
export type ObservationDataSource = (typeof OBSERVATION_DATA_SOURCES)[number];

export const DEFAULT_OBSERVATION_DAYS = 90;

export type ObservationRecord = {
  id: string;
  learningOutcomeId?: string;
  tradeId?: string;
  planId?: string;
  ticker: string;
  status: ObservationStatus;
  startedAt: string;
  endsAt: string;
  durationDays: number;
  /** Planned / original reference levels (never invent). */
  referenceEntry?: number;
  referenceStop?: number;
  referenceTargets?: number[];
  thesisInvalidationNote?: string;
  targetReached?: boolean;
  targetReachedAt?: string;
  thesisInvalidated?: boolean;
  invalidationReachedAt?: string;
  firstTerminalEvent?: ObservationTerminalEvent;
  maxPrice?: number;
  minPrice?: number;
  /** Max favorable / adverse excursion — unit in mfeMaeUnit. */
  mfe?: number;
  mae?: number;
  mfeMaeUnit?: "price" | "r";
  betterEntryAvailable?: boolean;
  betterEntryPrice?: number;
  dataSource?: ObservationDataSource;
  notes?: string;
  createdAt: string;
  lastUpdatedAt: string;
};

/** Fields an AI/human may supply on observation-update (never invent prices). */
export type ObservationUpdateInput = {
  targetReached?: boolean;
  targetReachedAt?: string;
  thesisInvalidated?: boolean;
  invalidationReachedAt?: string;
  firstTerminalEvent?: ObservationTerminalEvent;
  maxPrice?: number;
  minPrice?: number;
  mfe?: number;
  mae?: number;
  mfeMaeUnit?: "price" | "r";
  betterEntryAvailable?: boolean;
  betterEntryPrice?: number;
  notes?: string;
  status?: ObservationStatus;
  dataSource?: ObservationDataSource;
};
