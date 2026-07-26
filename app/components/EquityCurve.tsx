import type { EquityPoint } from "@/lib/review";

interface EquityCurveProps {
  points: EquityPoint[];
  /** @deprecated Not used as Account Equity threshold. Kept for call-site compat. */
  lossLimit?: number;
  compact?: boolean;
}

function formatAxisUsd(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

/**
 * Experiment cumulative P/L curve (closed trades).
 * Not Account Equity. Monthly risk cap is not drawn as a threshold here.
 */
export function EquityCurve({ points, compact = false }: EquityCurveProps) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Experiment cumulative P/L
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          Appears after your first closed trade. Not Account Equity.
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.cumulativePnL);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const width = 640;
  const height = compact ? 120 : 200;
  const padLeft = compact ? 40 : 48;
  const padRight = 12;
  const padTop = 12;
  const padBottom = compact ? 24 : 32;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const toX = (i: number) => padLeft + (i / (points.length - 1)) * chartW;
  const toY = (v: number) => padTop + (1 - (v - min) / range) * chartH;

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.cumulativePnL)}`).join(" ");
  const yTicks = [min, 0, max].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Experiment cumulative P/L
        </h2>
        <span className="text-xs text-zinc-400">
          Range {formatAxisUsd(min)} … {formatAxisUsd(max)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-zinc-900"
        role="img"
        aria-label="Experiment cumulative P/L"
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padLeft}
              y1={toY(v)}
              x2={width - padRight}
              y2={toY(v)}
              stroke={v === 0 ? "#d4d4d8" : "#f4f4f5"}
              strokeWidth={1}
            />
            {!compact && (
              <text
                x={padLeft - 6}
                y={toY(v) + 3}
                textAnchor="end"
                className="fill-zinc-400"
                fontSize="10"
              >
                {formatAxisUsd(v)}
              </text>
            )}
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2"
          points={polyline}
        />
        {points.map((p, i) => (
          <circle
            key={p.id}
            cx={toX(i)}
            cy={toY(p.cumulativePnL)}
            r="2.5"
            fill="#4f46e5"
          />
        ))}
      </svg>
    </div>
  );
}
