/**
 * Derive factual Reality summaries + relative volume from Case-bound bars.
 * No attribution / no WAIT correctness.
 */

import type {
  MarketRealityBar,
  MarketRealityFactualSummary,
  MarketRealityLevelGeometry,
  RelativeVolumePoint,
  LevelReach,
} from "./market-reality-types";

const DEFAULT_RV_BASELINE = 20;

function barTouchesLevel(
  bar: MarketRealityBar,
  level: number,
  tol = 0.01
): boolean {
  return bar.low - tol <= level && bar.high + tol >= level;
}

function barTouchesZone(
  bar: MarketRealityBar,
  low: number,
  high: number
): boolean {
  const lo = Math.min(low, high);
  const hi = Math.max(low, high);
  return bar.low <= hi && bar.high >= lo;
}

function firstTouch(
  bars: MarketRealityBar[],
  pred: (b: MarketRealityBar) => boolean
): string | null {
  for (const b of bars) {
    if (pred(b)) return b.timestamp;
  }
  return null;
}

function reachFromTouch(
  touchAt: string | null,
  bars: MarketRealityBar[],
  levelDefined: boolean
): LevelReach {
  if (!levelDefined) return "UNKNOWN";
  if (bars.length === 0) return "UNKNOWN";
  return touchAt ? "YES" : "NO";
}

export function summarizeMarketRealityWindow(
  bars: MarketRealityBar[],
  geometry: MarketRealityLevelGeometry
): MarketRealityFactualSummary {
  if (bars.length === 0) {
    return {
      entryLevelReached: "UNKNOWN",
      thesisZoneReached: "UNKNOWN",
      stopLevelReached: "UNKNOWN",
      targetReached: "UNKNOWN",
      windowHigh: null,
      windowLow: null,
      windowHighAt: null,
      windowLowAt: null,
      mfePrice: null,
      maePrice: null,
      firstZoneTouchAt: null,
      firstEntryTouchAt: null,
      firstStopTouchAt: null,
      firstTargetTouchAt: null,
    };
  }

  let high = -Infinity;
  let low = Infinity;
  let highAt: string | null = null;
  let lowAt: string | null = null;
  for (const b of bars) {
    if (b.high >= high) {
      high = b.high;
      highAt = b.timestamp;
    }
    if (b.low <= low) {
      low = b.low;
      lowAt = b.timestamp;
    }
  }

  const zoneOk =
    geometry.supportLow != null && geometry.supportHigh != null;
  const firstZoneTouchAt = zoneOk
    ? firstTouch(bars, (b) =>
        barTouchesZone(b, geometry.supportLow!, geometry.supportHigh!)
      )
    : null;
  const firstEntryTouchAt =
    geometry.plannedEntry != null
      ? firstTouch(bars, (b) => barTouchesLevel(b, geometry.plannedEntry!))
      : null;
  const firstStopTouchAt =
    geometry.stop != null
      ? firstTouch(bars, (b) => barTouchesLevel(b, geometry.stop!))
      : null;
  const firstTargetTouchAt =
    geometry.target != null
      ? firstTouch(bars, (b) => barTouchesLevel(b, geometry.target!))
      : null;

  const entry = geometry.plannedEntry;
  let mfePrice: number | null = null;
  let maePrice: number | null = null;
  if (entry != null && Number.isFinite(entry)) {
    mfePrice = high - entry;
    maePrice = entry - low;
  }

  return {
    entryLevelReached: reachFromTouch(
      firstEntryTouchAt,
      bars,
      geometry.plannedEntry != null
    ),
    thesisZoneReached: reachFromTouch(firstZoneTouchAt, bars, zoneOk),
    stopLevelReached: reachFromTouch(
      firstStopTouchAt,
      bars,
      geometry.stop != null
    ),
    targetReached: reachFromTouch(
      firstTargetTouchAt,
      bars,
      geometry.target != null
    ),
    windowHigh: Number.isFinite(high) ? high : null,
    windowLow: Number.isFinite(low) ? low : null,
    windowHighAt: highAt,
    windowLowAt: lowAt,
    mfePrice,
    maePrice,
    firstZoneTouchAt,
    firstEntryTouchAt,
    firstStopTouchAt,
    firstTargetTouchAt,
  };
}

/**
 * Relative volume vs mean of the prior `baselineBars` bars in the same series.
 * First `baselineBars` points have relativeVolume=null (insufficient baseline).
 */
export function computeRelativeVolumeSeries(
  bars: MarketRealityBar[],
  baselineBars = DEFAULT_RV_BASELINE
): {
  points: RelativeVolumePoint[];
  baselineBars: number;
  definition: string;
} {
  const points: RelativeVolumePoint[] = bars.map((b, i) => {
    if (i < baselineBars) {
      return {
        timestamp: b.timestamp,
        volume: b.volume,
        relativeVolume: null,
      };
    }
    let sum = 0;
    for (let j = i - baselineBars; j < i; j++) sum += bars[j].volume;
    const mean = sum / baselineBars;
    return {
      timestamp: b.timestamp,
      volume: b.volume,
      relativeVolume: mean > 0 ? b.volume / mean : null,
    };
  });

  return {
    points,
    baselineBars,
    definition: `relativeVolume = bar.volume / mean(volume of prior ${baselineBars} daily bars in this Case window series). null until baseline filled.`,
  };
}

export { DEFAULT_RV_BASELINE };
