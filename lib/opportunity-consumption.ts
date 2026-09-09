import type { LearningOutcome } from "./learning-outcome-types";
import type { MarketRealityCaseWindow } from "./market-reality-types";

export const OPPORTUNITY_CONSUMPTION_CHECKPOINTS_R = [0.5, 1] as const;

export type OpportunityConsumptionCheckpoint = {
  thresholdR: number;
  thresholdPrice: number;
  reached: boolean;
  reachedAt: string | null;
  subsequentMfePrice: number | null;
  subsequentMfeR: number | null;
  subsequentMfeAt: string | null;
  subsequentMaePrice: number | null;
  subsequentMaeR: number | null;
  subsequentMaeAt: string | null;
  laterPullbackObserved: boolean | null;
  pullbackLowAfterThreshold: number | null;
  pullbackLowAfterThresholdAt: string | null;
  pullbackDepthPrice: number | null;
  pullbackDepthR: number | null;
  timeToDeepestPullbackMs: number | null;
  retestedOriginalEntry: boolean | null;
  restoredRRAtPullback: number | null;
  targetReachedAfterThreshold: boolean | null;
  stopReachedAfterThreshold: boolean | null;
  orderingLimitation: string | null;
};

export type OpportunityConsumptionAnalysis = {
  available: boolean;
  reason: string | null;
  windowKind: MarketRealityCaseWindow["windowKind"] | null;
  windowStart: string | null;
  windowEnd: string | null;
  plannedEntry: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  plannedRiskPrice: number | null;
  plannedRR: number | null;
  entryReached: boolean | null;
  maxFavorablePrice: number | null;
  maxFavorableAt: string | null;
  favorableDisplacementPrice: number | null;
  favorableDisplacementR: number | null;
  maxAdversePrice: number | null;
  maxAdverseAt: string | null;
  adverseDisplacementPrice: number | null;
  adverseDisplacementR: number | null;
  pullbackLowAfterPeak: number | null;
  pullbackLowAfterPeakAt: string | null;
  subsequentPullbackPrice: number | null;
  subsequentPullbackR: number | null;
  retestedOriginalEntryAfterPeak: boolean | null;
  restoredRRAtDeepestPullback: number | null;
  restoredOriginalAsymmetryAfterPeak: boolean | null;
  lateEntryGeometryAvailable: boolean;
  lateEntryGeometryReason: string | null;
  checkpointOrderingLimitation: string | null;
  excludedFromAggregates: boolean;
  exclusionReason: string | null;
  checkpoints: OpportunityConsumptionCheckpoint[];
};

function round(value: number | null | undefined, digits = 4): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function filterBarsToWindow(window: MarketRealityCaseWindow) {
  const start = Date.parse(window.windowStart);
  const end = Date.parse(window.windowEnd);
  return window.bars.filter((bar) => {
    const ts = Date.parse(bar.timestamp);
    return Number.isFinite(ts) && ts >= start && ts <= end + 86400000 - 1;
  });
}

function minLowAfter(bars: MarketRealityCaseWindow["bars"], startIndex: number) {
  let low: number | null = null;
  let at: string | null = null;
  for (let i = startIndex + 1; i < bars.length; i += 1) {
    const bar = bars[i]!;
    if (low == null || bar.low <= low) {
      low = bar.low;
      at = bar.timestamp;
    }
  }
  return { low, at };
}

function hitIndex(
  bars: MarketRealityCaseWindow["bars"],
  predicate: (bar: MarketRealityCaseWindow["bars"][number]) => boolean
): number {
  return bars.findIndex(predicate);
}

function maxHighAfter(bars: MarketRealityCaseWindow["bars"], startIndex: number) {
  let high: number | null = null;
  let at: string | null = null;
  for (let i = startIndex + 1; i < bars.length; i += 1) {
    const bar = bars[i]!;
    if (high == null || bar.high >= high) {
      high = bar.high;
      at = bar.timestamp;
    }
  }
  return { high, at };
}

function timeDiffMs(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

export function analyzeOpportunityConsumption(input: {
  window: MarketRealityCaseWindow | null;
  plannedEntry: number | null | undefined;
  stopPrice: number | null | undefined;
  targetPrice: number | null | undefined;
  plannedRR: number | null | undefined;
  executionOccurred: boolean;
  learningOutcome?: LearningOutcome | null;
  checkpointsR?: readonly number[];
}): OpportunityConsumptionAnalysis {
  const {
    window,
    executionOccurred,
    learningOutcome,
  } = input;
  const plannedEntry = input.plannedEntry ?? null;
  const stopPrice = input.stopPrice ?? null;
  const targetPrice = input.targetPrice ?? null;
  const plannedRR = input.plannedRR ?? null;
  const excludedFromAggregates =
    learningOutcome?.excludedFromMetrics === true ||
    learningOutcome?.kind === "duplicate_creation";
  const exclusionReason =
    learningOutcome?.kind === "duplicate_creation"
      ? "duplicate_creation"
      : learningOutcome?.excludedFromMetrics === true
        ? "excluded_from_metrics"
        : null;

  if (executionOccurred) {
    return {
      available: false,
      reason: "Execution occurred — opportunity-consumption is only measured on no-execution paths.",
      windowKind: window?.windowKind ?? null,
      windowStart: window?.windowStart ?? null,
      windowEnd: window?.windowEnd ?? null,
      plannedEntry,
      stopPrice,
      targetPrice,
      plannedRiskPrice: null,
      plannedRR,
      entryReached: null,
      maxFavorablePrice: null,
      maxFavorableAt: null,
      favorableDisplacementPrice: null,
      favorableDisplacementR: null,
      maxAdversePrice: null,
      maxAdverseAt: null,
      adverseDisplacementPrice: null,
      adverseDisplacementR: null,
      pullbackLowAfterPeak: null,
      pullbackLowAfterPeakAt: null,
      subsequentPullbackPrice: null,
      subsequentPullbackR: null,
      retestedOriginalEntryAfterPeak: null,
      restoredRRAtDeepestPullback: null,
      restoredOriginalAsymmetryAfterPeak: null,
      lateEntryGeometryAvailable: false,
      lateEntryGeometryReason:
        "Unavailable unless a contemporaneous late-entry geometry with entry, stop, and target is preserved canonically.",
      checkpointOrderingLimitation: null,
      excludedFromAggregates,
      exclusionReason,
      checkpoints: [],
    };
  }

  if (
    !window ||
    plannedEntry == null ||
    stopPrice == null ||
    targetPrice == null ||
    !Number.isFinite(plannedEntry) ||
    !Number.isFinite(stopPrice) ||
    !Number.isFinite(targetPrice)
  ) {
    return {
      available: false,
      reason: "Case-bound Reality window or frozen plan geometry is missing.",
      windowKind: window?.windowKind ?? null,
      windowStart: window?.windowStart ?? null,
      windowEnd: window?.windowEnd ?? null,
      plannedEntry,
      stopPrice,
      targetPrice,
      plannedRiskPrice: null,
      plannedRR,
      entryReached: null,
      maxFavorablePrice: null,
      maxFavorableAt: null,
      favorableDisplacementPrice: null,
      favorableDisplacementR: null,
      maxAdversePrice: null,
      maxAdverseAt: null,
      adverseDisplacementPrice: null,
      adverseDisplacementR: null,
      pullbackLowAfterPeak: null,
      pullbackLowAfterPeakAt: null,
      subsequentPullbackPrice: null,
      subsequentPullbackR: null,
      retestedOriginalEntryAfterPeak: null,
      restoredRRAtDeepestPullback: null,
      restoredOriginalAsymmetryAfterPeak: null,
      lateEntryGeometryAvailable: false,
      lateEntryGeometryReason:
        "Unavailable unless a contemporaneous late-entry geometry with entry, stop, and target is preserved canonically.",
      checkpointOrderingLimitation: null,
      excludedFromAggregates,
      exclusionReason,
      checkpoints: [],
    };
  }

  const plannedRiskPrice = plannedEntry - stopPrice;
  if (!(plannedRiskPrice > 0)) {
    return {
      available: false,
      reason: "Planned risk is not positive — cannot express displacement in R.",
      windowKind: window.windowKind,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      plannedEntry,
      stopPrice,
      targetPrice,
      plannedRiskPrice: round(plannedRiskPrice),
      plannedRR,
      entryReached: null,
      maxFavorablePrice: null,
      maxFavorableAt: null,
      favorableDisplacementPrice: null,
      favorableDisplacementR: null,
      maxAdversePrice: null,
      maxAdverseAt: null,
      adverseDisplacementPrice: null,
      adverseDisplacementR: null,
      pullbackLowAfterPeak: null,
      pullbackLowAfterPeakAt: null,
      subsequentPullbackPrice: null,
      subsequentPullbackR: null,
      retestedOriginalEntryAfterPeak: null,
      restoredRRAtDeepestPullback: null,
      restoredOriginalAsymmetryAfterPeak: null,
      lateEntryGeometryAvailable: false,
      lateEntryGeometryReason:
        "Unavailable unless a contemporaneous late-entry geometry with entry, stop, and target is preserved canonically.",
      checkpointOrderingLimitation: null,
      excludedFromAggregates,
      exclusionReason,
      checkpoints: [],
    };
  }

  const bars = filterBarsToWindow(window);
  if (bars.length === 0) {
    return {
      available: false,
      reason: "Case-bound Reality window has no in-window bars.",
      windowKind: window.windowKind,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      plannedEntry,
      stopPrice,
      targetPrice,
      plannedRiskPrice: round(plannedRiskPrice),
      plannedRR,
      entryReached: null,
      maxFavorablePrice: null,
      maxFavorableAt: null,
      favorableDisplacementPrice: null,
      favorableDisplacementR: null,
      maxAdversePrice: null,
      maxAdverseAt: null,
      adverseDisplacementPrice: null,
      adverseDisplacementR: null,
      pullbackLowAfterPeak: null,
      pullbackLowAfterPeakAt: null,
      subsequentPullbackPrice: null,
      subsequentPullbackR: null,
      retestedOriginalEntryAfterPeak: null,
      restoredRRAtDeepestPullback: null,
      restoredOriginalAsymmetryAfterPeak: null,
      lateEntryGeometryAvailable: false,
      lateEntryGeometryReason:
        "Unavailable unless a contemporaneous late-entry geometry with entry, stop, and target is preserved canonically.",
      checkpointOrderingLimitation: null,
      excludedFromAggregates,
      exclusionReason,
      checkpoints: [],
    };
  }

  let maxHigh = -Infinity;
  let maxHighAt: string | null = null;
  let maxHighIndex = -1;
  let minLow = Infinity;
  let minLowAt: string | null = null;
  for (let i = 0; i < bars.length; i += 1) {
    const bar = bars[i]!;
    if (bar.high >= maxHigh) {
      maxHigh = bar.high;
      maxHighAt = bar.timestamp;
      maxHighIndex = i;
    }
    if (bar.low <= minLow) {
      minLow = bar.low;
      minLowAt = bar.timestamp;
    }
  }

  const favorableDisplacementPrice = Math.max(0, maxHigh - plannedEntry);
  const adverseDisplacementPrice = Math.max(0, plannedEntry - minLow);
  const peakPullback = maxHighIndex >= 0 ? minLowAfter(bars, maxHighIndex) : { low: null, at: null };
  const subsequentPullbackPrice =
    peakPullback.low == null ? null : Math.max(0, maxHigh - peakPullback.low);
  const restoredRRAtDeepestPullback =
    peakPullback.low != null && peakPullback.low > stopPrice
      ? round((targetPrice - peakPullback.low) / (peakPullback.low - stopPrice))
      : null;

  const thresholds = input.checkpointsR ?? OPPORTUNITY_CONSUMPTION_CHECKPOINTS_R;
  const checkpointOrderingLimitation =
    "Post-checkpoint path metrics exclude the first crossing bar when bar resolution cannot safely order the threshold cross against same-bar pullback, stop, or target events.";
  const checkpoints: OpportunityConsumptionCheckpoint[] = thresholds.map((thresholdR) => {
    const thresholdPrice = plannedEntry + thresholdR * plannedRiskPrice;
    const reachedIndex = hitIndex(bars, (bar) => bar.high >= thresholdPrice);
    if (reachedIndex < 0) {
      return {
        thresholdR,
        thresholdPrice: round(thresholdPrice) ?? thresholdPrice,
        reached: false,
        reachedAt: null,
        subsequentMfePrice: null,
        subsequentMfeR: null,
        subsequentMfeAt: null,
        subsequentMaePrice: null,
        subsequentMaeR: null,
        subsequentMaeAt: null,
        laterPullbackObserved: null,
        pullbackLowAfterThreshold: null,
        pullbackLowAfterThresholdAt: null,
        pullbackDepthPrice: null,
        pullbackDepthR: null,
        timeToDeepestPullbackMs: null,
        retestedOriginalEntry: null,
        restoredRRAtPullback: null,
        targetReachedAfterThreshold: null,
        stopReachedAfterThreshold: null,
        orderingLimitation: checkpointOrderingLimitation,
      };
    }
    const reachedAt = bars[reachedIndex]!.timestamp;
    const maxAfter = maxHighAfter(bars, reachedIndex);
    const pullback = minLowAfter(bars, reachedIndex);
    const laterBars = bars.slice(reachedIndex + 1);
    const pullbackDepthPrice =
      pullback.low == null ? null : Math.max(0, thresholdPrice - pullback.low);
    const subsequentMfePrice =
      maxAfter.high == null ? null : Math.max(0, maxAfter.high - thresholdPrice);
    const targetReachedAfterThreshold =
      laterBars.length > 0 ? laterBars.some((bar) => bar.high >= targetPrice) : null;
    const stopReachedAfterThreshold =
      laterBars.length > 0 ? laterBars.some((bar) => bar.low <= stopPrice) : null;
    return {
      thresholdR,
      thresholdPrice: round(thresholdPrice) ?? thresholdPrice,
      reached: true,
      reachedAt,
      subsequentMfePrice: round(subsequentMfePrice),
      subsequentMfeR:
        subsequentMfePrice == null ? null : round(subsequentMfePrice / plannedRiskPrice),
      subsequentMfeAt: maxAfter.at,
      subsequentMaePrice: round(pullbackDepthPrice),
      subsequentMaeR:
        pullbackDepthPrice == null ? null : round(pullbackDepthPrice / plannedRiskPrice),
      subsequentMaeAt: pullback.at,
      laterPullbackObserved:
        pullback.low == null ? false : pullback.low < thresholdPrice - 1e-9,
      pullbackLowAfterThreshold: round(pullback.low),
      pullbackLowAfterThresholdAt: pullback.at,
      pullbackDepthPrice: round(pullbackDepthPrice),
      pullbackDepthR:
        pullbackDepthPrice == null ? null : round(pullbackDepthPrice / plannedRiskPrice),
      timeToDeepestPullbackMs: timeDiffMs(reachedAt, pullback.at),
      retestedOriginalEntry:
        pullback.low == null ? null : pullback.low <= plannedEntry + 1e-9,
      restoredRRAtPullback:
        pullback.low != null && pullback.low > stopPrice
          ? round((targetPrice - pullback.low) / (pullback.low - stopPrice))
          : null,
      targetReachedAfterThreshold,
      stopReachedAfterThreshold,
      orderingLimitation: checkpointOrderingLimitation,
    };
  });

  return {
    available: true,
    reason: null,
    windowKind: window.windowKind,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    plannedEntry,
    stopPrice,
    targetPrice,
    plannedRiskPrice: round(plannedRiskPrice),
    plannedRR: round(plannedRR),
    entryReached: bars.some((bar) => bar.low <= plannedEntry && bar.high >= plannedEntry),
    maxFavorablePrice: round(maxHigh),
    maxFavorableAt: maxHighAt,
    favorableDisplacementPrice: round(favorableDisplacementPrice),
    favorableDisplacementR: round(favorableDisplacementPrice / plannedRiskPrice),
    maxAdversePrice: round(minLow),
    maxAdverseAt: minLowAt,
    adverseDisplacementPrice: round(adverseDisplacementPrice),
    adverseDisplacementR: round(adverseDisplacementPrice / plannedRiskPrice),
    pullbackLowAfterPeak: round(peakPullback.low),
    pullbackLowAfterPeakAt: peakPullback.at,
    subsequentPullbackPrice: round(subsequentPullbackPrice),
    subsequentPullbackR:
      subsequentPullbackPrice == null ? null : round(subsequentPullbackPrice / plannedRiskPrice),
    retestedOriginalEntryAfterPeak:
      peakPullback.low == null ? null : peakPullback.low <= plannedEntry + 1e-9,
    restoredRRAtDeepestPullback,
    restoredOriginalAsymmetryAfterPeak:
      restoredRRAtDeepestPullback == null || plannedRR == null
        ? null
        : restoredRRAtDeepestPullback >= plannedRR,
    lateEntryGeometryAvailable: false,
    lateEntryGeometryReason:
      "Remaining distance to the original target is not a late-entry R:R. A defensible late entry requires contemporaneous entry, stop, and target evidence.",
    checkpointOrderingLimitation,
    excludedFromAggregates,
    exclusionReason,
    checkpoints,
  };
}
