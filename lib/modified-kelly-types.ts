/** Modified Kelly Layered Entry — playbook execution experiment types. */

export const MODIFIED_KELLY_PLAYBOOK_ID = "modified-kelly-layered-entry";

export type KellyFractionMode = "quarter" | "half" | "full" | "custom";

export type ProbabilitySource = "subjective" | "historical" | "calibrated";

/** Limit role within Modified Kelly (extends LayerRole semantics for this experiment). */
export type ModifiedKellyLayerRole = "base" | "kelly_extension";

export type ModifiedKellyFillState =
  | "none"
  | "base_only"
  | "partial_extension"
  | "full"
  | "cancelled"
  | "stopped"
  | "target_reached";

export type ModifiedKellyConfig = {
  enabled: boolean;
  baseRiskR: number;
  additionalRiskR: number;
  totalAuthorizedRiskR: number;
  kellyFraction: KellyFractionMode;
  customKellyFraction?: number;
  estimatedWinProbability?: number;
  probabilitySource?: ProbabilitySource;
  maximumAdditionalRiskR: number;
  commonStopRequired: boolean;
  noChase: boolean;
  /** Default 30 — do not calibrate win probability below this sample. */
  minimumCalibrationSample?: number;
  /** Warn when layer risk distance is below this % of entry (default 2). */
  minStopDistancePercent?: number;
  allowFractionalShares?: boolean;
};

/** Attached to layeredEntry on a Scout Plan when using Modified Kelly. */
export type ModifiedKellyPlanState = {
  baseRiskR: number;
  additionalRiskR: number;
  totalAuthorizedRiskR: number;
  /** Dollar value of 1R (baseRiskDollar). */
  baseRiskDollar: number;
  kellyFraction: KellyFractionMode;
  customKellyFraction?: number;
  estimatedWinProbability?: number;
  probabilitySource?: ProbabilitySource;
  warning?: string;
  fillState?: ModifiedKellyFillState;
};

export type ModifiedKellyLayerCalc = {
  role: ModifiedKellyLayerRole;
  price: number;
  riskWeightR: number;
  allocationPercent: number;
  riskPerShare: number;
  riskDollars: number;
  sharesTheoretical: number;
  shares: number;
  capitalRequired: number;
  potentialProfit: number;
  layerR: number;
  distanceToStop: number;
  distanceToStopPercent: number;
  filled: boolean;
  fillPrice?: number;
  filledShares?: number;
};

export type ModifiedKellyCampaignSummary = {
  totalAuthorizedRiskR: number;
  totalAuthorizedRiskDollars: number;
  currentFilledRiskR: number;
  currentFilledRiskDollars: number;
  remainingRiskAuthorizationR: number;
  capitalRequiredIfFullyFilled: number;
  averageEntryIfFullyFilled: number;
  averageEntryFromFills?: number;
  maximumLoss: number;
  profitAtProbableTarget: number;
  /** Based on maximum planned risk (authorized). */
  authorizedCampaignR: number;
  /** Based only on filled layers' actual risk. */
  filledPositionR?: number;
  filledCapital?: number;
  totalSharesTheoretical: number;
  totalShares: number;
  fillState: ModifiedKellyFillState;
  warnings: string[];
};

export type ModifiedKellyComputeInput = {
  baseRiskDollar: number;
  baseRiskR: number;
  additionalRiskR: number;
  layers: Array<{
    price: number;
    riskWeightR: number;
    role: ModifiedKellyLayerRole;
    filled?: boolean;
    fillPrice?: number;
    filledShares?: number;
  }>;
  commonStopPrice: number;
  targetPrice: number;
  kellyFraction: KellyFractionMode;
  customKellyFraction?: number;
  estimatedWinProbability?: number;
  probabilitySource?: ProbabilitySource;
  maximumAdditionalRiskR?: number;
  capitalAvailable?: number;
  monthlyRiskRoom?: number;
  maxRiskPerTrade?: number;
  allowFractionalShares?: boolean;
  minStopDistancePercent?: number;
  fillStateOverride?: ModifiedKellyFillState;
};

/** Playbook experiment block stored on the playbook row. */
export type PlaybookModifiedKellyExperiment = {
  experimentNote: string;
  objective: string;
  hypothesis: string;
  defaults: ModifiedKellyConfig;
  hardRules: string[];
  metrics: string[];
  mafClassifications: string[];
  minimumCalibrationSample: number;
};

export const MODIFIED_KELLY_DEFAULT_CONFIG: ModifiedKellyConfig = {
  enabled: true,
  baseRiskR: 1,
  additionalRiskR: 0.65,
  totalAuthorizedRiskR: 1.65,
  kellyFraction: "quarter",
  maximumAdditionalRiskR: 0.65,
  commonStopRequired: true,
  noChase: true,
  minimumCalibrationSample: 30,
  minStopDistancePercent: 2,
  allowFractionalShares: true,
};

export const MODIFIED_KELLY_MAF_CLASSIFICATIONS = [
  "additional_risk_improved_expectancy",
  "additional_risk_increased_drawdown",
  "extension_not_filled",
  "extension_overweighted",
  "stop_too_close_for_layer",
  "capital_usage_inefficient",
  "base_entry_sufficient",
  "modified_kelly_unnecessary",
  "modified_kelly_effective",
] as const;

export const MODIFIED_KELLY_CHECKLIST = [
  "Scout thesis approved.",
  "Entry, stop and probable target defined.",
  "Base risk fixed.",
  "Additional Kelly risk capped.",
  "Fractional Kelly selected.",
  "Probability source recorded.",
  "Additional layers only at better prices.",
  "Common stop validated.",
  "Capital requirement validated.",
  "Monthly risk room validated.",
  "Partial-fill outcomes modeled.",
  "No-chase acknowledged.",
  "Outcome recorded for calibration.",
] as const;
