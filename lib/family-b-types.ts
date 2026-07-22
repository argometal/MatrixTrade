/** Family B — Bull Trend Continuation assessment (runtime synthesis; optional plan persist). */

export const BULL_TREND_ENTRY_STATES = [
  "watch",
  "starter_available",
  "preferred_entry_available",
  "deep_entry_available",
  "extended_no_chase",
  "structure_damaged",
  "invalidated",
] as const;

export type BullTrendEntryState = (typeof BULL_TREND_ENTRY_STATES)[number];

export const BULL_TREND_LAYER_ROLES = [
  "starter",
  "preferred_pullback",
  "deep_pullback",
  "reclaim_confirmation",
  "custom",
] as const;

export type BullTrendLayerRole = (typeof BULL_TREND_LAYER_ROLES)[number];

export type FamilyBTrendIntegrity =
  | "strong"
  | "intact"
  | "questionable"
  | "broken"
  | "unknown";

export type FamilyBExtension =
  | "not_extended"
  | "moderate"
  | "high"
  | "extreme"
  | "unknown";

export type FamilyBPullbackQuality =
  | "none"
  | "shallow_valid"
  | "preferred"
  | "deep_valid"
  | "structural_damage"
  | "unknown";

export type FamilyBParticipationCase =
  | "none"
  | "starter"
  | "preferred"
  | "deep"
  | "reclaim"
  | "wait";

/** Optional Fib context — never standalone entry authorization. */
export type FibonacciContext = {
  anchorLow?: number;
  anchorHigh?: number;
  candidateLevels?: Array<{
    ratio: number;
    price: number;
    role?: "entry_context" | "target_context";
  }>;
  note?: string;
};

export type FamilyBEntryAssessment = {
  state: BullTrendEntryState;
  trendIntegrity: FamilyBTrendIntegrity;
  extension: FamilyBExtension;
  pullbackQuality: FamilyBPullbackQuality;
  participationCase: FamilyBParticipationCase;
  evidenceFor: string[];
  evidenceAgainst: string[];
  unresolved: string[];
  fibonacci?: FibonacciContext;
  /** Human/AI proposal metadata — Matrix does not invent levels. */
  proposedBy?: {
    human: boolean;
    ai: boolean;
  };
  humanValidated?: boolean;
  /** ISO — when assessment was last synthesized or accepted. */
  assessedAt?: string;
  /** Cancellation / no-chase notes for this window. */
  cancelConditions?: string[];
};

export const BULL_TREND_STATE_LABELS: Record<BullTrendEntryState, string> = {
  watch: "Watch",
  starter_available: "Starter available",
  preferred_entry_available: "Preferred entry available",
  deep_entry_available: "Deep entry available",
  extended_no_chase: "Extended — no chase",
  structure_damaged: "Structure damaged",
  invalidated: "Invalidated",
};

export const FAMILY_B_STARTER_MAX_ALLOCATION_PERCENT = 30;
