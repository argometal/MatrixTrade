import type { EquityPoint } from "@/lib/review";

interface EquityCurveProps {
  points: EquityPoint[];
  lossLimit: number;
  compact?: boolean;
}

function formatAxisUsd(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function EquityCurve({ points, lossLimit, compact = false }: EquityCurveProps) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Equity curve</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Equity curve appears after your first closed trade.
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.cumulativePnL);
  const min = Math.min(lossLimit, ...values, 0);
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
  const limitY = toY(lossLimit);

  const yTicks = [min, 0, max].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Equity curve
        </h2>
        <span className="text-xs text-zinc-400">Loss limit {formatAxisUsd(lossLimit)}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-zinc-900"
        role="img"
        aria-label="Cycle equity curve"
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padLeft}
              y1={toY(v)}
              x2={width - padRight}
              y2={toY(v)}
              stroke={v === 0 ? "#d4d4d8" : "#f4f4f5"}
              strokeWidth={v === 0 ? 1 : 1}
            />
            {!compact && (
              <text
                x={padLeft - 6}
                y={toY(v) + 4}
                textAnchor="end"
                className="fill-zinc-400 text-[10px]"
              >
                {formatAxisUsd(v)}
              </text>
            )}
          </g>
        ))}

        <line
          x1={padLeft}
          y1={limitY}
          x2={width - padRight}
          y2={limitY}
          stroke="#fca5a5"
          strokeDasharray="4 4"
          strokeWidth="1"
        />

        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />

        {points.slice(1).map((p, i) => (
          <g key={p.id}>
            <circle
              cx={toX(i + 1)}
              cy={toY(p.cumulativePnL)}
              r={compact ? 3 : 4}
              fill={p.tradePnL >= 0 ? "#059669" : "#dc2626"}
            />
            {!compact && (
              <text
                x={toX(i + 1)}
                y={height - 6}
                textAnchor="middle"
                className="fill-zinc-500 text-[9px]"
              >
                {p.id}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
