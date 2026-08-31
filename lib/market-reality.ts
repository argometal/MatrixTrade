/**
 * Prompt #12C — Market Reality MVP orchestrator.
 * Acquire Case-bound OHLCV; never write into T0 / decision-time evidence.
 */

import { createHash } from "crypto";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import { getPlanById } from "./plans";
import { getStockThesisById } from "./stock-theses";
import { fetchYahooDailyOhlcv } from "./market-reality-yahoo";
import {
  computeRelativeVolumeSeries,
  summarizeMarketRealityWindow,
} from "./market-reality-derive";
import {
  findMarketRealityWindowForRead,
  upsertMarketRealityWindowMaybeMemory,
} from "./market-reality-store";
import type {
  MarketRealityCaseWindow,
  MarketRealityLevelGeometry,
  MarketRealityViewModel,
} from "./market-reality-types";

export type ExAnteLegacyPacket = {
  integrity: "supported_legacy";
  ticker: string;
  stockThesisId: string | null;
  planId: string;
  decisionId: string | null;
  decidedAt: string | null;
  verdict: string | null;
  thesisText: string | null;
  hypothesis: string | null;
  plannedEntry: number | null;
  supportLevel: number | null;
  zoneLow: number | null;
  zoneHigh: number | null;
  stop: number | null;
  target: number | null;
  plannedRR: number | null;
  validFrom: string | null;
  validUntil: string | null;
  reasoning: string | null;
  challenges: string[];
};

function windowId(
  planId: string,
  kind: MarketRealityCaseWindow["windowKind"],
  start: string,
  end: string
): string {
  const h = createHash("sha256")
    .update(`${planId}|${kind}|${start}|${end}`)
    .digest("hex")
    .slice(0, 12);
  return `MRW-${planId}-${kind === "original_plan_window" ? "P" : "R"}-${h}`;
}

export function geometryFromPlanAndThesis(
  plan: TradePlan,
  thesis: StockThesis | null | undefined
): MarketRealityLevelGeometry {
  const zone = thesis?.levels?.primaryZone;
  return {
    plannedEntry: plan.plannedEntry ?? null,
    supportLow: zone?.low ?? plan.supportLevel ?? null,
    supportHigh: zone?.high ?? null,
    stop: plan.stopPrice ?? null,
    target: plan.targetPrice ?? null,
  };
}

export function buildExAnteLegacyPacket(
  plan: TradePlan,
  thesis: StockThesis | null | undefined
): ExAnteLegacyPacket {
  const zone = thesis?.levels?.primaryZone;
  return {
    integrity: "supported_legacy",
    ticker: plan.ticker,
    stockThesisId: plan.stockThesisId ?? thesis?.id ?? null,
    planId: plan.id,
    decisionId: plan.decision?.id ?? null,
    decidedAt: plan.decision?.decidedAt ?? null,
    verdict: plan.decision?.verdict ?? null,
    thesisText: thesis?.thesis ?? plan.thesis ?? null,
    hypothesis: thesis?.currentHypothesis ?? null,
    plannedEntry: plan.plannedEntry ?? null,
    supportLevel: plan.supportLevel ?? null,
    zoneLow: zone?.low ?? null,
    zoneHigh: zone?.high ?? null,
    stop: plan.stopPrice ?? null,
    target: plan.targetPrice ?? null,
    plannedRR: plan.plannedRR ?? null,
    validFrom: plan.validFrom ?? null,
    validUntil: plan.validUntil ?? null,
    reasoning: plan.decision?.reasoning ?? null,
    challenges: plan.decision?.challenges ? [...plan.decision.challenges] : [],
  };
}

function filterBarsToWindow(
  bars: MarketRealityCaseWindow["bars"],
  startIso: string,
  endIso: string
) {
  const a = Date.parse(startIso);
  const b = Date.parse(endIso);
  return bars.filter((bar) => {
    const t = Date.parse(bar.timestamp);
    return Number.isFinite(t) && t >= a && t <= b + 86400000 - 1;
  });
}

/** Pad start so relative-volume baseline can be computed without a warehouse. */
function padStartForRelativeVolume(startIso: string, baselineBars = 20): string {
  const t = Date.parse(startIso);
  if (!Number.isFinite(t)) return startIso;
  // ~1.5 calendar days per bar to cover weekends/holidays for daily series.
  const padMs = Math.ceil(baselineBars * 1.6) * 86400000;
  return new Date(t - padMs).toISOString();
}

export type EnsureMarketRealityInput = {
  planId: string;
  /** Force re-fetch even if cached. */
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
};

/**
 * Ensure Case-bound Reality windows exist for plan validity + short retrospective.
 * Writes only Case windows (local JSON / test memory) — not whole-market DB.
 */
export async function ensureMarketRealityForPlan(
  input: EnsureMarketRealityInput
): Promise<{
  planWindow: MarketRealityCaseWindow | null;
  retrospectiveWindow: MarketRealityCaseWindow | null;
  exAnte: ExAnteLegacyPacket | null;
  errors: string[];
}> {
  const errors: string[] = [];
  const plan = await getPlanById(input.planId);
  if (!plan) {
    return {
      planWindow: null,
      retrospectiveWindow: null,
      exAnte: null,
      errors: [`Plan not found: ${input.planId}`],
    };
  }

  const thesis = plan.stockThesisId
    ? await getStockThesisById(plan.stockThesisId)
    : null;
  const exAnte = buildExAnteLegacyPacket(plan, thesis);

  const decisionBoundaryAt =
    plan.decision?.decidedAt ??
    plan.validFrom ??
    plan.createdAt ??
    new Date().toISOString();
  const planStart = plan.validFrom ?? decisionBoundaryAt;
  const planEnd =
    plan.validUntil ??
    new Date(Date.parse(planStart) + 7 * 86400000).toISOString();

  // Retrospective observation: through planEnd + 30d (labeled; not historical #8 horizon).
  const retroEnd = new Date(
    Date.parse(planEnd) + 30 * 86400000
  ).toISOString();

  async function ensureKind(
    kind: MarketRealityCaseWindow["windowKind"],
    start: string,
    end: string
  ): Promise<MarketRealityCaseWindow | null> {
    if (!input.forceRefresh) {
      const existing = await findMarketRealityWindowForRead({
        planId: plan!.id,
        windowKind: kind,
      });
      if (existing && existing.bars.length > 0) return existing;
    }

    try {
      const fetchFrom = padStartForRelativeVolume(start);
      const fetched = await fetchYahooDailyOhlcv(
        { ticker: plan!.ticker, fromIso: fetchFrom, toIso: end },
        input.fetchImpl
      );
      // Keep lookback bars in the Case window series so RV baseline is local to the row
      // (still Case-bound, not a ticker warehouse). Price summary filters to [start,end].
      const bars =
        fetched.bars.length > 0
          ? fetched.bars
          : filterBarsToWindow(fetched.bars, start, end);
      const row: MarketRealityCaseWindow = {
        id: windowId(plan!.id, kind, start, end),
        planId: plan!.id,
        ticker: plan!.ticker.toUpperCase(),
        timeframe: "1d",
        source: fetched.source,
        decisionBoundaryAt,
        windowStart: start,
        windowEnd: end,
        windowKind: kind,
        retrievedAt: new Date().toISOString(),
        sessionNote:
          fetched.sessionNote +
          " Lookback bars before windowStart may be included solely for relative-volume baseline.",
        bars,
      };
      await upsertMarketRealityWindowMaybeMemory(row);
      return row;
    } catch (err) {
      errors.push(
        `${kind}: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }

  const planWindow = await ensureKind(
    "original_plan_window",
    planStart,
    planEnd
  );
  const retrospectiveWindow = await ensureKind(
    "retrospective_observation",
    decisionBoundaryAt,
    retroEnd
  );

  return { planWindow, retrospectiveWindow, exAnte, errors };
}

export function buildMarketRealityViewModel(input: {
  window: MarketRealityCaseWindow | null;
  geometry: MarketRealityLevelGeometry;
  exAnteIntegrity: MarketRealityViewModel["exAnteIntegrity"];
  reason?: string;
}): MarketRealityViewModel {
  if (!input.window || input.window.bars.length === 0) {
    return {
      available: false,
      reason: input.reason ?? "No Case-bound OHLCV window available.",
      window: null,
      relativeVolume: [],
      relativeVolumeBaselineBars: 20,
      relativeVolumeDefinition:
        "relativeVolume = bar.volume / mean(prior 20 daily bars in series).",
      summary: null,
      geometry: input.geometry,
      exAnteIntegrity: input.exAnteIntegrity,
    };
  }

  const rv = computeRelativeVolumeSeries(input.window.bars, 20);
  const summaryBars = filterBarsToWindow(
    input.window.bars,
    input.window.windowStart,
    input.window.windowEnd
  );
  const summary = summarizeMarketRealityWindow(
    summaryBars.length > 0 ? summaryBars : input.window.bars,
    input.geometry
  );

  // Chart/summary prefer in-window bars; RV series keeps full stored series.
  const displayWindow =
    summaryBars.length > 0 && summaryBars.length < input.window.bars.length
      ? { ...input.window, bars: summaryBars }
      : input.window;

  return {
    available: true,
    window: displayWindow,
    relativeVolume: rv.points.filter((p) =>
      summaryBars.length === 0
        ? true
        : summaryBars.some((b) => b.timestamp === p.timestamp)
    ),
    relativeVolumeBaselineBars: rv.baselineBars,
    relativeVolumeDefinition: rv.definition,
    summary,
    geometry: input.geometry,
    exAnteIntegrity: input.exAnteIntegrity,
  };
}

/** Load / acquire Reality view for Case UI (prefer plan window; fallback retrospective). */
export async function loadMarketRealityForCase(planId: string): Promise<{
  exAnte: ExAnteLegacyPacket | null;
  primary: MarketRealityViewModel;
  retrospective: MarketRealityViewModel;
  errors: string[];
}> {
  const ensured = await ensureMarketRealityForPlan({ planId });
  const plan = await getPlanById(planId);
  const thesis = plan?.stockThesisId
    ? await getStockThesisById(plan.stockThesisId)
    : null;
  const geometry = plan
    ? geometryFromPlanAndThesis(plan, thesis)
    : {
        plannedEntry: null,
        supportLow: null,
        supportHigh: null,
        stop: null,
        target: null,
      };

  const primary = buildMarketRealityViewModel({
    window: ensured.planWindow,
    geometry,
    exAnteIntegrity: "supported_legacy",
    reason: ensured.errors.find((e) => e.startsWith("original_plan_window")) ,
  });
  const retrospective = buildMarketRealityViewModel({
    window: ensured.retrospectiveWindow,
    geometry,
    exAnteIntegrity: "supported_legacy",
    reason: ensured.errors.find((e) =>
      e.startsWith("retrospective_observation")
    ),
  });

  return {
    exAnte: ensured.exAnte,
    primary,
    retrospective,
    errors: ensured.errors,
  };
}
