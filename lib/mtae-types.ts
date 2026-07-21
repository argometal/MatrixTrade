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
};

export type MtaeIntegratedView = {
  structureSpine: string;
  opportunityNote: string;
  battleZoneRanking: MtaeBattleZone[];
  executionContext: string;
  contradictions: string[];
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
