/**
 * Yahoo Finance chart v8 — free, no API key, reproducible public quotes.
 * MVP only; provenance preserved on each Case window.
 */

import {
  MARKET_REALITY_SOURCE_YAHOO,
  type MarketRealityBar,
} from "./market-reality-types";

export type FetchYahooDailyBarsInput = {
  ticker: string;
  /** Inclusive-ish Unix seconds / ISO — converted to period1/period2. */
  fromIso: string;
  toIso: string;
};

export type FetchYahooDailyBarsResult = {
  source: typeof MARKET_REALITY_SOURCE_YAHOO;
  timeframe: "1d";
  sessionNote: string;
  bars: MarketRealityBar[];
  rawMeta?: { currency?: string; exchangeName?: string; timezone?: string };
};

function toUnix(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new Error(`Invalid ISO date: ${iso}`);
  return Math.floor(t / 1000);
}

/**
 * Fetch daily OHLCV for ticker between fromIso and toIso (UTC).
 * Uses Yahoo chart API (no credential). Network required.
 */
export async function fetchYahooDailyOhlcv(
  input: FetchYahooDailyBarsInput,
  fetchImpl: typeof fetch = fetch
): Promise<FetchYahooDailyBarsResult> {
  const symbol = input.ticker.trim().toUpperCase();
  if (!symbol) throw new Error("ticker required");

  let period1 = toUnix(input.fromIso);
  let period2 = toUnix(input.toIso);
  // Pad one day each side so daily bars covering the window are included.
  period1 = Math.max(0, period1 - 86400);
  period2 = period2 + 86400;
  if (period2 <= period1) {
    throw new Error("toIso must be after fromIso");
  }

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includePrePost=false`;

  const res = await fetchImpl(url, {
    headers: {
      // Yahoo often expects a UA; keep minimal.
      "User-Agent": "ArgusForge-MXT-MarketReality/0.1 (research; Case-bound OHLCV)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Yahoo chart HTTP ${res.status} for ${symbol}`);
  }

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          currency?: string;
          exchangeName?: string;
          timezone?: string;
          instrumentType?: string;
        };
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
            volume?: Array<number | null>;
          }>;
          adjclose?: Array<{ adjclose?: Array<number | null> }>;
        };
      }>;
      error?: { description?: string } | null;
    };
  };

  if (json.chart?.error) {
    throw new Error(
      `Yahoo chart error: ${json.chart.error.description ?? "unknown"}`
    );
  }

  const result = json.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!result || !q || ts.length === 0) {
    throw new Error(`Yahoo chart empty for ${symbol}`);
  }

  const bars: MarketRealityBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    const v = q.volume?.[i];
    if (
      o == null ||
      h == null ||
      l == null ||
      c == null ||
      v == null ||
      !Number.isFinite(o) ||
      !Number.isFinite(h) ||
      !Number.isFinite(l) ||
      !Number.isFinite(c) ||
      !Number.isFinite(v)
    ) {
      continue;
    }
    bars.push({
      timestamp: new Date(ts[i] * 1000).toISOString(),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }

  if (bars.length === 0) {
    throw new Error(`Yahoo chart returned no usable OHLCV bars for ${symbol}`);
  }

  return {
    source: MARKET_REALITY_SOURCE_YAHOO,
    timeframe: "1d",
    sessionNote:
      "Daily bars from Yahoo Finance chart v8; regular session; unadjusted quote OHLC + volume (not a warehouse).",
    bars,
    rawMeta: {
      currency: result.meta?.currency,
      exchangeName: result.meta?.exchangeName,
      timezone: result.meta?.timezone,
    },
  };
}
