/**
 * Modified Kelly Layered Entry — deterministic calculation engine.
 * Playbook experiment only. Does not invent prices or execute broker orders.
 */

import {
  MODIFIED_KELLY_DEFAULT_CONFIG,
  type KellyFractionMode,
  type ModifiedKellyCampaignSummary,
  type ModifiedKellyComputeInput,
  type ModifiedKellyFillState,
  type ModifiedKellyLayerCalc,
  type ModifiedKellyLayerRole,
  type ModifiedKellyPlanState,
  type ProbabilitySource,
} from "./modified-kelly-types";

export const UNCALIBRATED_KELLY_WARNING =
  "Kelly estimate is experimental and uncalibrated.";

const EPS = 1e-9;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function kellyFractionValue(
  mode: KellyFractionMode,
  custom?: number
): number {
  if (mode === "quarter") return 0.25;
  if (mode === "half") return 0.5;
  if (mode === "full") return 1;
  if (mode === "custom" && custom !== undefined && Number.isFinite(custom)) {
    return Math.max(0, custom);
  }
  return 0.25;
}

/**
 * Cap additional Kelly risk by experiment max, monthly room, capital, and per-trade max.
 * Does not invent a probability-based size when inputs are missing — uses planned additionalRiskR.
 */
export function capAdditionalRiskR(input: {
  additionalRiskR: number;
  maximumAdditionalRiskR: number;
  baseRiskDollar: number;
  capitalAvailable?: number;
  monthlyRiskRoom?: number;
  maxRiskPerTrade?: number;
  baseRiskR: number;
}): { additionalRiskR: number; warnings: string[] } {
  const warnings: string[] = [];
  let additional = Math.max(0, input.additionalRiskR);
  const maxAdd = Math.max(0, input.maximumAdditionalRiskR);
  if (additional > maxAdd + EPS) {
    warnings.push(
      `Additional Kelly risk capped to experiment maximum (${maxAdd}R).`
    );
    additional = maxAdd;
  }

  const totalBefore = input.baseRiskR + additional;
  const totalDollars = totalBefore * input.baseRiskDollar;

  if (
    input.maxRiskPerTrade !== undefined &&
    Number.isFinite(input.maxRiskPerTrade) &&
    totalDollars > input.maxRiskPerTrade + EPS
  ) {
    const roomR = Math.max(0, input.maxRiskPerTrade / input.baseRiskDollar - input.baseRiskR);
    if (additional > roomR + EPS) {
      warnings.push("Additional Kelly risk capped by max risk per trade.");
      additional = Math.max(0, roomR);
    }
  }

  if (
    input.monthlyRiskRoom !== undefined &&
    Number.isFinite(input.monthlyRiskRoom) &&
    (input.baseRiskR + additional) * input.baseRiskDollar > input.monthlyRiskRoom + EPS
  ) {
    const roomR = Math.max(
      0,
      input.monthlyRiskRoom / input.baseRiskDollar - input.baseRiskR
    );
    if (additional > roomR + EPS) {
      warnings.push("Additional Kelly risk capped by monthly risk room.");
      additional = Math.max(0, roomR);
    }
  }

  // Capital can only size shares; risk dollars are constrained separately via warnings
  // when capitalRequired exceeds available — see collectWarnings.

  return { additionalRiskR: round4(additional), warnings };
}

export function resolveShares(
  theoretical: number,
  allowFractional: boolean
): number {
  if (!(theoretical > 0) || !Number.isFinite(theoretical)) return 0;
  if (allowFractional) return theoretical;
  return Math.floor(theoretical);
}

export function inferFillState(
  layers: Array<{ role: ModifiedKellyLayerRole; filled?: boolean }>,
  override?: ModifiedKellyFillState
): ModifiedKellyFillState {
  if (override) return override;
  const base = layers.find((l) => l.role === "base");
  const extensions = layers.filter((l) => l.role === "kelly_extension");
  const anyFilled = layers.some((l) => l.filled);
  if (!anyFilled) return "none";
  const baseFilled = Boolean(base?.filled);
  const extFilled = extensions.filter((l) => l.filled).length;
  const extTotal = extensions.length;
  if (baseFilled && extTotal > 0 && extFilled === 0) return "base_only";
  if (baseFilled && extFilled > 0 && extFilled < extTotal) return "partial_extension";
  if (layers.every((l) => l.filled)) return "full";
  if (!baseFilled && extFilled > 0) return "partial_extension";
  return "base_only";
}

function layerCalc(
  layer: ModifiedKellyComputeInput["layers"][number],
  commonStopPrice: number,
  targetPrice: number,
  baseRiskDollar: number,
  allowFractional: boolean
): ModifiedKellyLayerCalc {
  const riskPerShare = layer.price - commonStopPrice;
  const riskDollars = layer.riskWeightR * baseRiskDollar;
  const sharesTheoretical =
    riskPerShare > 0 && Number.isFinite(riskPerShare)
      ? riskDollars / riskPerShare
      : 0;
  const shares = resolveShares(sharesTheoretical, allowFractional);
  const capitalRequired = shares * layer.price;
  const potentialProfit = shares * (targetPrice - layer.price);
  const layerR =
    riskPerShare > 0 ? (targetPrice - layer.price) / riskPerShare : Number.NaN;
  const distanceToStop = riskPerShare;
  const distanceToStopPercent =
    layer.price > 0 ? (distanceToStop / layer.price) * 100 : 0;

  return {
    role: layer.role,
    price: layer.price,
    riskWeightR: layer.riskWeightR,
    allocationPercent: 0, // filled in computeModifiedKelly
    riskPerShare: round4(riskPerShare),
    riskDollars: round4(riskDollars),
    sharesTheoretical: round4(sharesTheoretical),
    shares: allowFractional ? round4(shares) : shares,
    capitalRequired: round2(capitalRequired),
    potentialProfit: round2(potentialProfit),
    layerR: Number.isFinite(layerR) ? round4(layerR) : Number.NaN,
    distanceToStop: round4(distanceToStop),
    distanceToStopPercent: round4(distanceToStopPercent),
    filled: Boolean(layer.filled),
    fillPrice: layer.fillPrice,
    filledShares: layer.filledShares,
  };
}

export function collectModifiedKellyWarnings(input: {
  layers: ModifiedKellyLayerCalc[];
  totalAuthorizedRiskR: number;
  sumRiskWeightR: number;
  sumAllocationPercent: number;
  kellyFraction: KellyFractionMode;
  estimatedWinProbability?: number;
  probabilitySource?: ProbabilitySource;
  capitalAvailable?: number;
  capitalRequiredIfFullyFilled: number;
  monthlyRiskRoom?: number;
  totalAuthorizedRiskDollars: number;
  minStopDistancePercent: number;
  commonStopPrice: number;
  noChase?: boolean;
}): string[] {
  const warnings: string[] = [];
  const base = input.layers.find((l) => l.role === "base");

  if (!input.probabilitySource || input.probabilitySource === "subjective") {
    if (input.estimatedWinProbability !== undefined) {
      warnings.push(
        "Win probability is a subjective estimate — not a proven statistic."
      );
    }
    warnings.push(UNCALIBRATED_KELLY_WARNING);
  } else if (input.probabilitySource === "historical") {
    warnings.push(
      "estimatedWinProbability lacks sufficient historical sample for calibration."
    );
    warnings.push(UNCALIBRATED_KELLY_WARNING);
  }

  if (input.kellyFraction === "full") {
    warnings.push("Full Kelly selected — high variance; not the default.");
  }

  for (const layer of input.layers) {
    if (!(layer.riskPerShare > 0)) {
      if (layer.price <= input.commonStopPrice) {
        warnings.push(
          `Stop is at or above long entry $${layer.price} (stop $${input.commonStopPrice}).`
        );
      }
    }
    if (
      layer.distanceToStopPercent > 0 &&
      layer.distanceToStopPercent < input.minStopDistancePercent
    ) {
      warnings.push(
        `Layer at $${layer.price} is too close to stop (${layer.distanceToStopPercent.toFixed(2)}% < ${input.minStopDistancePercent}%).`
      );
    }
  }

  if (base) {
    for (const layer of input.layers) {
      if (layer.role === "kelly_extension" && layer.price >= base.price - EPS) {
        warnings.push(
          `Kelly extension at $${layer.price} is not better than base $${base.price} (long: extensions must be lower).`
        );
      }
    }
  }

  const totalShares = input.layers.reduce((s, l) => s + l.shares, 0);
  if (totalShares > 0) {
    for (const layer of input.layers) {
      if (layer.shares / totalShares > 0.5 + EPS) {
        warnings.push(
          `Layer at $${layer.price} concentrates more than 50% of shares.`
        );
      }
    }
  }

  if (
    input.capitalAvailable !== undefined &&
    input.capitalRequiredIfFullyFilled > input.capitalAvailable + EPS
  ) {
    warnings.push("Capital required exceeds capital available.");
  }

  if (
    input.monthlyRiskRoom !== undefined &&
    input.totalAuthorizedRiskDollars > input.monthlyRiskRoom + EPS
  ) {
    warnings.push("Total authorized risk exceeds monthly risk room.");
  }

  if (Math.abs(input.sumAllocationPercent - 100) > 0.05) {
    warnings.push(
      `allocationPercent does not sum to 100% (got ${round2(input.sumAllocationPercent)}).`
    );
  }

  if (Math.abs(input.sumRiskWeightR - input.totalAuthorizedRiskR) > 0.02) {
    warnings.push(
      `riskWeightR sum (${round4(input.sumRiskWeightR)}) does not match totalAuthorizedRiskR (${input.totalAuthorizedRiskR}).`
    );
  }

  if (input.noChase === false) {
    warnings.push("No-chase must remain enabled for this experiment.");
  }

  return warnings;
}

export type ModifiedKellyComputeResult = {
  layers: ModifiedKellyLayerCalc[];
  summary: ModifiedKellyCampaignSummary;
  planState: ModifiedKellyPlanState;
  cappedAdditionalRiskR: number;
};

export function computeModifiedKelly(
  input: ModifiedKellyComputeInput
): ModifiedKellyComputeResult {
  const maximumAdditionalRiskR =
    input.maximumAdditionalRiskR ??
    MODIFIED_KELLY_DEFAULT_CONFIG.maximumAdditionalRiskR;
  const allowFractional = input.allowFractionalShares !== false;
  const minStopDistancePercent =
    input.minStopDistancePercent ??
    MODIFIED_KELLY_DEFAULT_CONFIG.minStopDistancePercent ??
    2;

  const capped = capAdditionalRiskR({
    additionalRiskR: input.additionalRiskR,
    maximumAdditionalRiskR,
    baseRiskDollar: input.baseRiskDollar,
    capitalAvailable: input.capitalAvailable,
    monthlyRiskRoom: input.monthlyRiskRoom,
    maxRiskPerTrade: input.maxRiskPerTrade,
    baseRiskR: input.baseRiskR,
  });

  const additionalRiskR = capped.additionalRiskR;
  const totalAuthorizedRiskR = round4(input.baseRiskR + additionalRiskR);
  const totalAuthorizedRiskDollars = round2(
    totalAuthorizedRiskR * input.baseRiskDollar
  );

  // Normalize layer weights if caller provided planned weights that still sum to planned total
  const layers = input.layers.map((layer) =>
    layerCalc(
      layer,
      input.commonStopPrice,
      input.targetPrice,
      input.baseRiskDollar,
      allowFractional
    )
  );

  const sumRiskWeightR = layers.reduce((s, l) => s + l.riskWeightR, 0);
  for (const layer of layers) {
    layer.allocationPercent =
      sumRiskWeightR > 0
        ? round2((layer.riskWeightR / sumRiskWeightR) * 100)
        : 0;
  }
  const sumAllocationPercent = layers.reduce(
    (s, l) => s + l.allocationPercent,
    0
  );

  const capitalRequiredIfFullyFilled = round2(
    layers.reduce((s, l) => s + l.capitalRequired, 0)
  );
  const totalSharesTheoretical = round4(
    layers.reduce((s, l) => s + l.sharesTheoretical, 0)
  );
  const totalShares = round4(layers.reduce((s, l) => s + l.shares, 0));
  const weightedEntryFull =
    totalShares > 0
      ? layers.reduce((s, l) => s + l.shares * l.price, 0) / totalShares
      : 0;
  const averageEntryIfFullyFilled = round4(weightedEntryFull);
  const maximumLossPlanned = round2(
    layers.reduce((s, l) => s + l.shares * Math.max(0, l.riskPerShare), 0)
  );
  const profitAtProbableTarget = round2(
    layers.reduce((s, l) => s + l.potentialProfit, 0)
  );
  const authorizedCampaignR =
    maximumLossPlanned > 0
      ? round4(profitAtProbableTarget / maximumLossPlanned)
      : Number.NaN;

  // Filled-position metrics — only filled layers; never use max authorized R for R if partial
  let filledRiskDollars = 0;
  let filledRiskR = 0;
  let filledSharesSum = 0;
  let filledNotional = 0;
  let profitFilled = 0;
  let lossAtStopFilled = 0;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const src = input.layers[i];
    if (!layer.filled) continue;
    const fillPrice = src.fillPrice ?? layer.price;
    const sh =
      src.filledShares !== undefined && Number.isFinite(src.filledShares)
        ? src.filledShares
        : layer.shares;
    const riskPerShareActual = fillPrice - input.commonStopPrice;
    filledRiskDollars += sh * Math.max(0, riskPerShareActual);
    filledRiskR +=
      input.baseRiskDollar > 0
        ? (sh * Math.max(0, riskPerShareActual)) / input.baseRiskDollar
        : 0;
    filledSharesSum += sh;
    filledNotional += sh * fillPrice;
    profitFilled += sh * (input.targetPrice - fillPrice);
    lossAtStopFilled += sh * Math.max(0, riskPerShareActual);
  }

  const averageEntryFromFills =
    filledSharesSum > 0 ? round4(filledNotional / filledSharesSum) : undefined;
  const filledPositionR =
    lossAtStopFilled > 0 ? round4(profitFilled / lossAtStopFilled) : undefined;

  const fillState = inferFillState(input.layers, input.fillStateOverride);

  const warnings = [
    ...capped.warnings,
    ...collectModifiedKellyWarnings({
      layers,
      totalAuthorizedRiskR,
      sumRiskWeightR,
      sumAllocationPercent,
      kellyFraction: input.kellyFraction,
      estimatedWinProbability: input.estimatedWinProbability,
      probabilitySource: input.probabilitySource,
      capitalAvailable: input.capitalAvailable,
      capitalRequiredIfFullyFilled,
      monthlyRiskRoom: input.monthlyRiskRoom,
      totalAuthorizedRiskDollars,
      minStopDistancePercent,
      commonStopPrice: input.commonStopPrice,
      noChase: true,
    }),
  ];

  // Integer rounding unused risk
  if (!allowFractional) {
    const usedRisk = layers.reduce(
      (s, l) => s + l.shares * Math.max(0, l.riskPerShare),
      0
    );
    const unused = totalAuthorizedRiskDollars - usedRisk;
    if (unused > 0.5) {
      warnings.push(
        `Integer share rounding leaves unused authorized risk (~$${round2(unused)}).`
      );
    }
  }

  // Slippage: filled risk above planned layer risk
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const src = input.layers[i];
    if (!layer.filled) continue;
    const fillPrice = src.fillPrice ?? layer.price;
    if (fillPrice > layer.price + EPS) {
      warnings.push(
        `Slippage on $${layer.price} layer: fill $${fillPrice} increases actual risk vs plan.`
      );
    }
  }

  const primaryWarning =
    warnings.find((w) => w === UNCALIBRATED_KELLY_WARNING) ?? warnings[0];

  const summary: ModifiedKellyCampaignSummary = {
    totalAuthorizedRiskR,
    totalAuthorizedRiskDollars,
    currentFilledRiskR: round4(filledRiskR),
    currentFilledRiskDollars: round2(filledRiskDollars),
    remainingRiskAuthorizationR: round4(
      Math.max(0, totalAuthorizedRiskR - filledRiskR)
    ),
    capitalRequiredIfFullyFilled,
    averageEntryIfFullyFilled,
    averageEntryFromFills,
    maximumLoss: maximumLossPlanned,
    profitAtProbableTarget,
    authorizedCampaignR,
    filledPositionR,
    filledCapital: filledSharesSum > 0 ? round2(filledNotional) : undefined,
    totalSharesTheoretical,
    totalShares,
    fillState,
    warnings,
  };

  const planState: ModifiedKellyPlanState = {
    baseRiskR: input.baseRiskR,
    additionalRiskR,
    totalAuthorizedRiskR,
    baseRiskDollar: input.baseRiskDollar,
    kellyFraction: input.kellyFraction,
    customKellyFraction: input.customKellyFraction,
    estimatedWinProbability: input.estimatedWinProbability,
    probabilitySource: input.probabilitySource,
    warning: primaryWarning,
    fillState,
  };

  return {
    layers,
    summary,
    planState,
    cappedAdditionalRiskR: additionalRiskR,
  };
}

/** Enforce no-chase: never raise an unfilled layer price after a miss. */
export function enforceNoChase(args: {
  priorPrice: number;
  proposedPrice: number;
  filled: boolean;
}): { price: number; chased: boolean } {
  if (args.filled) {
    return { price: args.priorPrice, chased: false };
  }
  // Long: better = lower. Chase = buying higher than the planned limit.
  if (args.proposedPrice > args.priorPrice + EPS) {
    return { price: args.priorPrice, chased: true };
  }
  return { price: args.proposedPrice, chased: false };
}

/** After stop hit — cancel all remaining unfilled limits. */
export function cancelRemainingAfterStop<T extends { filled?: boolean }>(
  layers: T[]
): Array<T & { cancelled?: boolean }> {
  return layers.map((layer) =>
    layer.filled ? layer : { ...layer, filled: false, cancelled: true }
  );
}

/** Target reached before deeper layers — leave deeper unfilled (no chase). */
export function projectTargetBeforeDeeperFills(
  layers: Array<{ role: ModifiedKellyLayerRole; filled?: boolean }>
): ModifiedKellyFillState {
  const base = layers.find((l) => l.role === "base");
  const extensions = layers.filter((l) => l.role === "kelly_extension");
  if (base?.filled && extensions.some((e) => !e.filled)) {
    return extensions.some((e) => e.filled) ? "partial_extension" : "base_only";
  }
  if (layers.every((l) => l.filled)) return "target_reached";
  return inferFillState(layers, "target_reached");
}

export type ModifiedKellyObservationMetrics = {
  plannedBaseRiskR: number;
  plannedAdditionalRiskR: number;
  actualFilledRiskR: number;
  probabilityEstimate?: number;
  probabilitySource?: string;
  baseFilled: boolean;
  extensionFilled: boolean;
  averageEntry?: number;
  maximumCapitalUsed?: number;
  plannedR?: number;
  realizedR?: number;
  mfe?: number;
  mae?: number;
  targetReachedBeforeStop?: boolean;
  stopReachedBeforeTarget?: boolean;
  slippage?: number;
  partialFillState: ModifiedKellyFillState;
};

export function buildObservationMetrics(args: {
  planState: ModifiedKellyPlanState;
  summary: ModifiedKellyCampaignSummary;
  realizedR?: number;
  mfe?: number;
  mae?: number;
  targetReachedBeforeStop?: boolean;
  stopReachedBeforeTarget?: boolean;
  slippage?: number;
}): ModifiedKellyObservationMetrics {
  return {
    plannedBaseRiskR: args.planState.baseRiskR,
    plannedAdditionalRiskR: args.planState.additionalRiskR,
    actualFilledRiskR: args.summary.currentFilledRiskR,
    probabilityEstimate: args.planState.estimatedWinProbability,
    probabilitySource: args.planState.probabilitySource,
    baseFilled:
      args.summary.fillState === "base_only" ||
      args.summary.fillState === "partial_extension" ||
      args.summary.fillState === "full" ||
      args.summary.fillState === "target_reached" ||
      args.summary.fillState === "stopped",
    extensionFilled:
      args.summary.fillState === "partial_extension" ||
      args.summary.fillState === "full",
    averageEntry:
      args.summary.averageEntryFromFills ??
      args.summary.averageEntryIfFullyFilled,
    maximumCapitalUsed:
      args.summary.filledCapital ?? args.summary.capitalRequiredIfFullyFilled,
    plannedR: args.summary.authorizedCampaignR,
    realizedR: args.realizedR,
    mfe: args.mfe,
    mae: args.mae,
    targetReachedBeforeStop: args.targetReachedBeforeStop,
    stopReachedBeforeTarget: args.stopReachedBeforeTarget,
    slippage: args.slippage,
    partialFillState: args.summary.fillState,
  };
}

export type ModifiedKellyAggregateMetrics = {
  numberOfObservations: number;
  baseOnlyCount: number;
  partialExtensionCount: number;
  fullFillCount: number;
  missedCount: number;
  stopRate: number;
  targetRate: number;
  averagePlannedR: number;
  averageRealizedR: number;
  expectancyPer1R: number;
  averageCapitalUsed: number;
  averageSlippage: number;
  calibratedWinProbability?: number;
};

export function aggregateModifiedKellyMetrics(
  observations: ModifiedKellyObservationMetrics[],
  minimumCalibrationSample = MODIFIED_KELLY_DEFAULT_CONFIG.minimumCalibrationSample ??
    30
): ModifiedKellyAggregateMetrics {
  const n = observations.length;
  const baseOnlyCount = observations.filter(
    (o) => o.partialFillState === "base_only"
  ).length;
  const partialExtensionCount = observations.filter(
    (o) => o.partialFillState === "partial_extension"
  ).length;
  const fullFillCount = observations.filter(
    (o) => o.partialFillState === "full"
  ).length;
  const missedCount = observations.filter(
    (o) => o.partialFillState === "none" || o.partialFillState === "cancelled"
  ).length;
  const stopped = observations.filter((o) => o.stopReachedBeforeTarget).length;
  const targeted = observations.filter((o) => o.targetReachedBeforeStop).length;
  const planned = observations
    .map((o) => o.plannedR)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));
  const realized = observations
    .map((o) => o.realizedR)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));
  const capital = observations
    .map((o) => o.maximumCapitalUsed)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));
  const slippage = observations
    .map((o) => o.slippage)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  const average = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

  const averageRealizedR = average(realized);
  const result: ModifiedKellyAggregateMetrics = {
    numberOfObservations: n,
    baseOnlyCount,
    partialExtensionCount,
    fullFillCount,
    missedCount,
    stopRate: n ? stopped / n : 0,
    targetRate: n ? targeted / n : 0,
    averagePlannedR: average(planned),
    averageRealizedR,
    expectancyPer1R: averageRealizedR,
    averageCapitalUsed: average(capital),
    averageSlippage: average(slippage),
  };

  if (n >= minimumCalibrationSample) {
    const wins = observations.filter(
      (o) => (o.realizedR ?? 0) > 0 || o.targetReachedBeforeStop
    ).length;
    result.calibratedWinProbability = round4(wins / n);
  }

  return result;
}

export function defaultModifiedKellyLayers(args: {
  baseEntry: number;
  extensionEntry: number;
  baseRiskR?: number;
  additionalRiskR?: number;
}): Array<{
  price: number;
  riskWeightR: number;
  role: ModifiedKellyLayerRole;
  allocationPercent: number;
}> {
  const baseRiskR = args.baseRiskR ?? 1;
  const additionalRiskR =
    args.additionalRiskR ?? MODIFIED_KELLY_DEFAULT_CONFIG.additionalRiskR;
  const total = baseRiskR + additionalRiskR;
  return [
    {
      price: args.baseEntry,
      riskWeightR: baseRiskR,
      role: "base",
      allocationPercent: round2((baseRiskR / total) * 100),
    },
    {
      price: args.extensionEntry,
      riskWeightR: additionalRiskR,
      role: "kelly_extension",
      allocationPercent: round2((additionalRiskR / total) * 100),
    },
  ];
}
