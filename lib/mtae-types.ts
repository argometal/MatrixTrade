/** Matrix Technical Analysis Engine (MTAE) — schema types. See md/matrix/mtae-technical-analysis-engine.md */

export type MtaeTrend = "bullish" | "neutral" | "bearish";
export type MtaeReachProbability = "high" | "medium" | "low";
export type MtaeAsymmetryQuality = "acceptable" | "good" | "excellent";

export type MtaeTimeframeCode =
  | "1Y"
  | "6M"
  | "3M"
  | "1M"
  | "1W"
  | "1D"
  | "4H"
  | "1H"
  | "15m"
  | string;

export type MtaeTimeframeRole =
  | "strategic_tf"
  | "opportunity_tf"
  | "refinement_tf"
  | "execution_tf"
  | "execution_detail_tf";

export type MtaeTimeframeRoles = {
  strategic_tf: MtaeTimeframeCode;
  opportunity_tf: MtaeTimeframeCode;
  refinement_tf: MtaeTimeframeCode;
  execution_tf: MtaeTimeframeCode;
  execution_detail_tf?: MtaeTimeframeCode;
};

export type MtaeTimeframeMapPreset = {
  id: string;
  label: string;
  description?: string;
  roles: MtaeTimeframeRoles;
};

export type MtaePriceZone = {
  low: number;
  high: number;
};

export type MtaeRankedLevel = {
  rank: number;
  price?: number;
  zone?: MtaePriceZone;
  strength?: number;
  reason: string;
  confidence: number;
};

export type MtaeBattleZone = {
  id: string;
  low: number;
  high: number;
  reachProbability: MtaeReachProbability;
  asymmetryQuality: MtaeAsymmetryQuality;
  technicalImportance: number;
  reason: string;
};

export type MtaeStructureFlags = {
  higherHighs?: boolean;
  higherLows?: boolean;
  channel?: boolean;
  range?: boolean;
  distribution?: boolean;
  compression?: boolean;
  broken?: boolean;
  note?: string;
};

/** Phase A — Participation Layer. See md/matrix/mtae-participation-layer.md */

export const MTAE_VOLUME_STATES = [
  "expanding",
  "contracting",
  "muted",
  "climactic",
  "mixed",
  "indeterminate",
] as const;
export type MtaeVolumeState = (typeof MTAE_VOLUME_STATES)[number];

export const MTAE_VOLUME_DIRECTIONAL_BIASES = [
  "buying",
  "selling",
  "neutral",
  "indeterminate",
] as const;
export type MtaeVolumeDirectionalBias = (typeof MTAE_VOLUME_DIRECTIONAL_BIASES)[number];

export const MTAE_PRICE_VOLUME_RELATIONSHIPS = [
  "confirming",
  "diverging",
  "inconclusive",
] as const;
export type MtaePriceVolumeRelationship = (typeof MTAE_PRICE_VOLUME_RELATIONSHIPS)[number];

export const MTAE_RELATIVE_VOLUMES = ["high", "normal", "low", "unknown"] as const;
export type MtaeRelativeVolume = (typeof MTAE_RELATIVE_VOLUMES)[number];

export type MtaeVolumeBehavior = {
  state: MtaeVolumeState;
  directionalBias: MtaeVolumeDirectionalBias;
  priceVolumeRelationship: MtaePriceVolumeRelationship;
  relativeVolume: MtaeRelativeVolume;
  interpretation: string;
  confidence: number;
};

export const MTAE_MOVEMENT_CHARACTERS = [
  "orderly_correction",
  "deep_correction",
  "volatility_compression",
  "short_squeeze",
  "liquidity_sweep",
  "trend_reversal_attempt",
  "confirmed_trend_reversal",
  "distribution",
  "accumulation",
  "indeterminate",
] as const;
export type MtaeMovementCharacterLabel = (typeof MTAE_MOVEMENT_CHARACTERS)[number];

export type MtaeMovementCharacter = {
  primary: MtaeMovementCharacterLabel;
  secondary?: MtaeMovementCharacterLabel[];
  evidence: string[];
  confidence: number;
  caveat?: string;
};

export const MTAE_VOLUME_CONFIRMATIONS = ["present", "absent", "unknown"] as const;
export type MtaeVolumeConfirmation = (typeof MTAE_VOLUME_CONFIRMATIONS)[number];

export const MTAE_WICK_NET_MESSAGES = [
  "seller_rejection",
  "buyer_rejection",
  "absorption",
  "mixed",
  "inconclusive",
] as const;
export type MtaeWickNetMessage = (typeof MTAE_WICK_NET_MESSAGES)[number];

export type MtaeWickRejection = {
  zone: MtaePriceZone;
  frequency: number;
  strength: number;
  volumeConfirmation: MtaeVolumeConfirmation;
  interpretation: string;
};

export type MtaeWickAnalysis = {
  upperRejections: MtaeWickRejection[];
  lowerRejections: MtaeWickRejection[];
  liquiditySweeps: MtaeWickRejection[];
  netMessage: MtaeWickNetMessage;
};

export const MTAE_CANDLE_PATTERNS = [
  "doji",
  "hammer",
  "shooting_star",
  "engulfing",
  "inside_bar",
  "outside_bar",
  "rejection_candle",
  "wide_range_candle",
  "failed_breakout_candle",
] as const;
export type MtaeCandlePattern = (typeof MTAE_CANDLE_PATTERNS)[number];

export const MTAE_CANDLE_CONFIRMATIONS = [
  "pending",
  "confirmed",
  "invalidated",
  "unknown",
] as const;
export type MtaeCandleConfirmation = (typeof MTAE_CANDLE_CONFIRMATIONS)[number];

export type MtaeCandleSignal = {
  pattern: MtaeCandlePattern;
  location: string;
  context: string;
  confirmation: MtaeCandleConfirmation;
  symbolicMeaning: string;
  confidence: number;
};

export type MtaeHistoricalReactionZone = {
  zone: MtaePriceZone;
  reactionCount: number;
  successfulDefenses?: number;
  averageReactionPercent?: number;
  volumeCharacter?: string;
  confidence: number;
  interpretation: string;
};

export const MTAE_PARTICIPANT_SIGNALS = [
  "possible_accumulation",
  "possible_distribution",
  "absorption",
  "indeterminate",
  "none",
] as const;
export type MtaeParticipantSignal = (typeof MTAE_PARTICIPANT_SIGNALS)[number];

export type MtaeLargeParticipantFootprint = {
  signal: MtaeParticipantSignal;
  evidence: string[];
  confidence: number;
};

export type MtaeParticipation = {
  volumeBehavior?: MtaeVolumeBehavior;
  wickAnalysis?: MtaeWickAnalysis;
  candleSignals?: MtaeCandleSignal[];
  movementCharacter?: MtaeMovementCharacter;
  historicalReactionZones?: MtaeHistoricalReactionZone[];
  largeParticipantFootprint?: MtaeLargeParticipantFootprint;
};

export const MTAE_DOMINANT_CONDITIONS = [
  "accumulation",
  "distribution",
  "correction",
  "squeeze",
  "mixed",
  "indeterminate",
] as const;
export type MtaeDominantCondition = (typeof MTAE_DOMINANT_CONDITIONS)[number];

export type MtaeParticipationSynthesis = {
  dominantCondition: MtaeDominantCondition;
  buyingEvidence: string[];
  sellingEvidence: string[];
  unresolvedSignals: string[];
  confidence: number;
};

export type MtaeTimeframeReport = {
  timeframe: MtaeTimeframeCode;
  role?: MtaeTimeframeRole;
  trend: MtaeTrend;
  trendConfidence: number;
  structure: MtaeStructureFlags;
  supports: MtaeRankedLevel[];
  resistances: MtaeRankedLevel[];
  battleZones: MtaeBattleZone[];
  probableTarget?: number;
  extendedTarget?: number;
  structuralInvalidation: string;
  contradictions: string[];
  summary: string;
  /** Phase A optional — structure + participation. */
  participation?: MtaeParticipation;
};

export type MtaeIntegratedView = {
  structureSpine: string;
  opportunityNote: string;
  battleZoneRanking: MtaeBattleZone[];
  executionContext: string;
  contradictions: string[];
  /** Phase A optional. */
  participationSynthesis?: MtaeParticipationSynthesis;
};

export type MtaeTechnicalSummary = {
  trend: MtaeTrend;
  structureNote: string;
  majorSupport?: number;
  majorResistance?: number;
  primaryBattleZone?: MtaePriceZone;
  secondaryBattleZone?: MtaePriceZone;
  probableTarget?: number;
  extendedTarget?: number;
  structuralInvalidation: string;
  contradictions: string[];
  confidence: number;
};

export type MtaeAssessment = {
  id: string;
  stockProfileId: string;
  ticker: string;
  asOfPrice?: number;
  timeframeMapId?: string;
  timeframeRoles: MtaeTimeframeRoles;
  perTimeframe: MtaeTimeframeReport[];
  integrated: MtaeIntegratedView;
  technicalSummary: MtaeTechnicalSummary;
  createdAt: string;
  source?: string;
};

export type MtaeCalibrationErrorType =
  | "support_hierarchy"
  | "resistance_hierarchy"
  | "battle_zone"
  | "probable_target"
  | "extended_target"
  | "structural_invalidation"
  | "trend"
  | "structure"
  | "volume_behavior"
  | "movement_character"
  | "wick_hierarchy"
  | "candle_signal_context"
  | "historical_reaction_rank"
  | "participant_footprint_overclaim"
  | "other";

export type MtaeCalibration = {
  id: string;
  assessmentId: string;
  stockProfileId: string;
  ticker: string;
  errorType: MtaeCalibrationErrorType;
  fieldPath: string;
  aiValue: unknown;
  humanValue: unknown;
  magnitude?: string;
  confidenceAdjustment?: number;
  reason: string;
  createdAt: string;
};
