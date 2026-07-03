import type { EquityPoint } from "@/lib/review";

interface EquityCurveProps {
  points: EquityPoint[];
  lossLimit: number;
  compact?: boolean;
}

export function EquityCurve({ points, lossLimit, compact = false }: EquityCurveProps) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-zinc-400">
        Equity curve appears after your first closed trade.
      </p>
    );
  }

  const values = points.map((p) => p.cumulativePnL);
  const min = Math.min(lossLimit, ...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const width = compact ? 320 : 640;
  const height = compact ? 72 : 120;
  const pad = 8;

  const toX = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const toY = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.cumulativePnL)}`).join(" ");
  const limitY = toY(lossLimit);

  return (
    <div className={compact ? "" : "rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"}>
      {!compact && (
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Equity curve
          </h2>
          <span className="text-xs text-zinc-400">Limit {lossLimit.toFixed(0)} USD</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-zinc-900"
        role="img"
        aria-label="Cycle equity curve"
      >
        <line
          x1={pad}
          y1={limitY}
          x2={width - pad}
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
          <circle
            key={p.id}
            cx={toX(i + 1)}
            cy={toY(p.cumulativePnL)}
            r={compact ? 2.5 : 3.5}
            fill={p.tradePnL >= 0 ? "#059669" : "#dc2626"}
          />
        ))}
      </svg>
    </div>
  );
}
