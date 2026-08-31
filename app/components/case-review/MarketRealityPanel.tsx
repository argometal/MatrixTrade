"use client";

import type {
  MarketRealityViewModel,
} from "@/lib/market-reality-types";
import type { ExAnteLegacyPacket } from "@/lib/market-reality";

function num(v: number | null | undefined, digits = 2) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function text(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  return String(v);
}

function MarketRealityChart({
  model,
}: {
  model: MarketRealityViewModel;
}) {
  const bars = model.window?.bars ?? [];
  if (bars.length === 0) return null;

  const w = 640;
  const hPrice = 180;
  const hVol = 64;
  const pad = 28;
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const levels = [
    model.geometry.plannedEntry,
    model.geometry.supportLow,
    model.geometry.supportHigh,
    model.geometry.stop,
    model.geometry.target,
  ].filter((n): n is number => n != null && Number.isFinite(n));

  const yMax = Math.max(...highs, ...levels);
  const yMin = Math.min(...lows, ...levels);
  const ySpan = yMax - yMin || 1;
  const xSpan = Math.max(bars.length - 1, 1);
  const vols = bars.map((b) => b.volume);
  const vMax = Math.max(...vols, 1);

  const xAt = (i: number) => pad + (i / xSpan) * (w - pad * 2);
  const yAt = (price: number) =>
    pad + ((yMax - price) / ySpan) * (hPrice - pad * 2);

  const closeLine = bars
    .map((b, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(b.close)}`)
    .join(" ");

  const levelLines: Array<{ y: number; label: string; color: string }> = [];
  if (model.geometry.plannedEntry != null)
    levelLines.push({
      y: yAt(model.geometry.plannedEntry),
      label: `entry ${model.geometry.plannedEntry}`,
      color: "#93c5fd",
    });
  if (model.geometry.stop != null)
    levelLines.push({
      y: yAt(model.geometry.stop),
      label: `stop ${model.geometry.stop}`,
      color: "#fca5a5",
    });
  if (model.geometry.target != null)
    levelLines.push({
      y: yAt(model.geometry.target),
      label: `target ${model.geometry.target}`,
      color: "#86efac",
    });
  if (
    model.geometry.supportLow != null &&
    model.geometry.supportHigh != null
  ) {
    levelLines.push({
      y: yAt((model.geometry.supportLow + model.geometry.supportHigh) / 2),
      label: `zone ${model.geometry.supportLow}–${model.geometry.supportHigh}`,
      color: "#fde68a",
    });
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950/60 p-2">
      <svg
        viewBox={`0 0 ${w} ${hPrice + hVol + 16}`}
        className="h-auto w-full min-w-[320px]"
        role="img"
        aria-label="Market Reality price and volume"
      >
        <rect width={w} height={hPrice + hVol + 16} fill="transparent" />
        {levelLines.map((ln) => (
          <g key={ln.label}>
            <line
              x1={pad}
              x2={w - pad}
              y1={ln.y}
              y2={ln.y}
              stroke={ln.color}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={w - pad}
              y={ln.y - 3}
              fill={ln.color}
              fontSize={9}
              textAnchor="end"
            >
              {ln.label}
            </text>
          </g>
        ))}
        <path d={closeLine} fill="none" stroke="#e4e4e7" strokeWidth={1.5} />
        {bars.map((b, i) => (
          <line
            key={`c-${b.timestamp}`}
            x1={xAt(i)}
            x2={xAt(i)}
            y1={yAt(b.high)}
            y2={yAt(b.low)}
            stroke="#71717a"
            strokeWidth={1}
          />
        ))}
        {bars.map((b, i) => {
          const vh = (b.volume / vMax) * (hVol - 8);
          return (
            <rect
              key={`v-${b.timestamp}`}
              x={xAt(i) - 2}
              y={hPrice + 8 + (hVol - 8 - vh)}
              width={4}
              height={Math.max(vh, 1)}
              fill="#52525b"
            />
          );
        })}
        <text x={pad} y={hPrice + hVol + 12} fill="#71717a" fontSize={9}>
          Price (close + H/L) · Volume bars below · dashed = ex-ante levels
          (Reveal overlay only)
        </text>
      </svg>
    </div>
  );
}

export function MarketRealityPanel({
  exAnte,
  primary,
  retrospective,
  errors,
}: {
  exAnte: ExAnteLegacyPacket | null;
  primary: MarketRealityViewModel;
  retrospective: MarketRealityViewModel;
  errors: string[];
}) {
  const model = primary.available
    ? primary
    : retrospective.available
      ? retrospective
      : primary;
  const usingRetro = !primary.available && retrospective.available;

  return (
    <section className="space-y-4 border-t border-zinc-800 pt-6">
      <div>
        <h2 className="text-sm font-medium text-zinc-100">Market Reality</h2>
        <p className="mt-1 text-xs text-zinc-500">
          POST-DECISION Reveal only. Does not upgrade Blind / T0. OHLCV is
          computational Reality; screenshots remain contextual.
        </p>
      </div>

      {exAnte && (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ex-ante (SUPPORTED LEGACY — not immutable T0)
          </h3>
          <dl className="mt-2 grid gap-1 text-sm text-zinc-300 sm:grid-cols-2">
            <div>
              Decision: {text(exAnte.verdict)} · {text(exAnte.decidedAt)}
            </div>
            <div>
              Zone:{" "}
              {exAnte.zoneLow != null && exAnte.zoneHigh != null
                ? `${exAnte.zoneLow}–${exAnte.zoneHigh}`
                : "—"}
            </div>
            <div>Entry: {text(exAnte.plannedEntry)}</div>
            <div>Stop: {text(exAnte.stop)}</div>
            <div>Target: {text(exAnte.target)}</div>
            <div>Plan RR: {text(exAnte.plannedRR)}</div>
          </dl>
        </div>
      )}

      {!model.available ? (
        <div className="rounded border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-100">
          Market Reality UNAVAILABLE
          {model.reason ? ` — ${model.reason}` : "."}
          {errors.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-xs text-amber-200/80">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="text-xs text-zinc-500">
            Window:{" "}
            {usingRetro
              ? "retrospective observation (plan window fetch failed or empty)"
              : model.window?.windowKind.replaceAll("_", " ")}{" "}
            · {model.window?.windowStart?.slice(0, 10)} →{" "}
            {model.window?.windowEnd?.slice(0, 10)} · source{" "}
            {model.window?.source} · {model.window?.timeframe}
          </div>

          <MarketRealityChart model={model} />

          {model.summary && (
            <div className="rounded border border-zinc-800 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Factual Reality summary
              </h3>
              <dl className="mt-2 grid gap-1 text-sm text-zinc-300 sm:grid-cols-2">
                <div>
                  Entry level reached: {model.summary.entryLevelReached}
                </div>
                <div>
                  Thesis zone reached: {model.summary.thesisZoneReached}
                </div>
                <div>Stop level reached: {model.summary.stopLevelReached}</div>
                <div>Target reached: {model.summary.targetReached}</div>
                <div>
                  Window high: {num(model.summary.windowHigh)}
                  {model.summary.windowHighAt
                    ? ` @ ${model.summary.windowHighAt.slice(0, 10)}`
                    : ""}
                </div>
                <div>
                  Window low: {num(model.summary.windowLow)}
                  {model.summary.windowLowAt
                    ? ` @ ${model.summary.windowLowAt.slice(0, 10)}`
                    : ""}
                </div>
                <div>MFE (vs entry, price): {num(model.summary.mfePrice)}</div>
                <div>MAE (vs entry, price): {num(model.summary.maePrice)}</div>
                <div>
                  First zone touch:{" "}
                  {model.summary.firstZoneTouchAt?.slice(0, 10) ?? "—"}
                </div>
                <div>
                  First entry touch:{" "}
                  {model.summary.firstEntryTouchAt?.slice(0, 10) ?? "—"}
                </div>
              </dl>
            </div>
          )}

          <div className="rounded border border-zinc-800 p-3 text-xs text-zinc-400">
            <div className="font-semibold uppercase tracking-wider text-zinc-500">
              Evidence integrity
            </div>
            <div className="mt-1">
              Ex-ante: {model.exAnteIntegrity.toUpperCase()} · Reality source:{" "}
              {model.window?.source} · bars: {model.window?.bars.length ?? 0} ·
              Volume: raw on each bar
            </div>
            <div className="mt-1">{model.relativeVolumeDefinition}</div>
            {model.relativeVolume.some((p) => p.relativeVolume != null) ? (
              <div className="mt-1 text-zinc-300">
                Relative volume sample (last with RV):{" "}
                {(() => {
                  const last = [...model.relativeVolume]
                    .reverse()
                    .find((p) => p.relativeVolume != null);
                  return last
                    ? `${last.relativeVolume!.toFixed(2)}× @ ${last.timestamp.slice(0, 10)} (vol ${last.volume.toLocaleString()})`
                    : "—";
                })()}
              </div>
            ) : (
              <div className="mt-1">
                Relative volume: NOT YET for early bars (need ≥
                {model.relativeVolumeBaselineBars} prior bars in series).
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
