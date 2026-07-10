import Link from "next/link";
import type { PlaybookStats } from "@/lib/analytics";
import { calculateTradeResult } from "@/lib/calculate";
import type { EquityPoint } from "@/lib/review";
import type { Experiment } from "@/lib/types";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import type { Trade } from "@/lib/types";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatPf(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}

function pnlTone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-200";
}

function DarkEquityChart({
  points,
  lossLimit,
}: {
  points: EquityPoint[];
  lossLimit: number;
}) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        Equity curve appears after your first closed trade.
      </p>
    );
  }

  const values = points.map((p) => p.cumulativePnL);
  const min = Math.min(lossLimit, ...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const width = 640;
  const height = 200;
  const padLeft = 48;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const toX = (i: number) => padLeft + (i / (points.length - 1)) * chartW;
  const toY = (v: number) => padTop + (1 - (v - min) / range) * chartH;
  const polyline = points.map((p, i) => `${toX(i)},${toY(p.cumulativePnL)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Equity curve">
      <line x1={padLeft} y1={toY(0)} x2={width - padRight} y2={toY(0)} stroke="#3f3f46" />
      <polyline fill="none" stroke="#8b5cf6" strokeWidth="2.5" points={polyline} />
    </svg>
  );
}

export type PreviewStatsData = {
  trades: Trade[];
  experiment: Experiment;
  monthly: MonthlyRisk;
  equityPoints: EquityPoint[];
  winRatePct: number;
  expectancy: number | null;
  avgR: number | null;
  maxDd: number;
  avgWinner: number | null;
  avgLoser: number | null;
  profitFactor: number | null;
  mistakesCost: number;
  playbookStats: PlaybookStats[];
  bestTrade: Trade | undefined;
  worstTrade: Trade | undefined;
};

export function PreviewStats({ data }: { data: PreviewStatsData }) {
  const { experiment, monthly } = data;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <h1 className="text-xl font-semibold text-zinc-100">Statistics</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Cycle metrics — decide what to improve next.
          </p>
        </header>

        <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Equity curve</h2>
            <div className="mt-4">
              <DarkEquityChart points={data.equityPoints} lossLimit={monthly.effectiveLossCap} />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total trades" value={String(data.trades.length)} />
            <StatCard label="Closed trades" value={String(experiment.closedTrades)} />
            <StatCard label="Win rate" value={`${data.winRatePct.toFixed(1)}%`} />
            <StatCard
              label="Experiment net P/L"
              value={formatUsd(experiment.realizedPnL)}
              valueClass={pnlTone(experiment.realizedPnL)}
            />
            <StatCard
              label="Total losses"
              value={formatUsd(experiment.grossLoss)}
              valueClass="text-red-400"
            />
            <StatCard
              label="This month P/L"
              value={formatUsd(monthly.monthlyRealizedPnL)}
              valueClass={pnlTone(monthly.monthlyRealizedPnL)}
            />
            <StatCard label="Monthly budget" value={`$${monthly.baseCap.toFixed(2)}`} />
            <StatCard label="Carryover" value={`$${monthly.carryoverIn.toFixed(2)}`} />
            <StatCard label="Spent this month" value={`$${monthly.lossUsedThisMonth.toFixed(2)}`} />
            <StatCard label="Monthly room left" value={`$${monthly.monthlyRoomCap.toFixed(2)}`} />
            <StatCard
              label="Avg winner"
              value={data.avgWinner !== null ? formatUsd(data.avgWinner) : "—"}
              valueClass={data.avgWinner !== null ? "text-emerald-400" : undefined}
            />
            <StatCard
              label="Avg loser"
              value={data.avgLoser !== null ? formatUsd(data.avgLoser) : "—"}
              valueClass={data.avgLoser !== null ? "text-red-400" : undefined}
            />
            <StatCard label="Profit factor" value={formatPf(data.profitFactor)} />
            <StatCard
              label="Expectancy"
              value={data.expectancy !== null ? `${formatUsd(data.expectancy)}/trade` : "—"}
            />
            <StatCard
              label="Avg R"
              value={
                data.avgR !== null ? `${data.avgR >= 0 ? "+" : ""}${data.avgR.toFixed(2)}R` : "—"
              }
            />
            <StatCard label="Max drawdown" value={formatUsd(data.maxDd)} />
            <StatCard label="Mistakes cost" value={formatUsd(data.mistakesCost)} valueClass="text-red-400" />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Best trade"
              value={
                data.bestTrade
                  ? `${data.bestTrade.id} ${formatUsd(calculateTradeResult(data.bestTrade) ?? 0)}`
                  : "—"
              }
            />
            <StatCard
              label="Worst trade"
              value={
                data.worstTrade
                  ? `${data.worstTrade.id} ${formatUsd(calculateTradeResult(data.worstTrade) ?? 0)}`
                  : "—"
              }
            />
          </section>

          {data.playbookStats.length > 0 && (
            <section className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                P/L by playbook
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-2">Playbook</th>
                    <th className="px-4 py-2">Trades</th>
                    <th className="px-4 py-2">Win%</th>
                    <th className="px-4 py-2">Profit factor</th>
                    <th className="px-4 py-2">Net P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.playbookStats.map((row) => (
                    <tr key={row.playbookId ?? "unassigned"}>
                      <td className="px-4 py-2 font-medium text-zinc-100">
                        {row.playbook?.name ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-2 text-zinc-300">{row.tradeCount}</td>
                      <td className="px-4 py-2 text-zinc-300">
                        {row.winRate !== null ? `${(row.winRate * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-zinc-300">
                        {formatPf(row.profitFactor)}
                      </td>
                      <td className={`px-4 py-2 tabular-nums ${pnlTone(row.netPnL)}`}>
                        {formatUsd(row.netPnL)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <nav className="flex flex-wrap gap-4 border-t border-zinc-800 pt-4 text-sm">
            <Link href="/playbook" className="text-zinc-500 hover:text-zinc-300">
              Playbook Lab →
            </Link>
            <Link href="/mistakes" className="text-zinc-500 hover:text-zinc-300">
              Mistakes →
            </Link>
            <Link href="/journal" className="text-zinc-500 hover:text-zinc-300">
              Journal →
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums text-zinc-100 ${valueClass ?? ""}`}>
        {value}
      </p>
    </div>
  );
}
