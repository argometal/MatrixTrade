import Link from "next/link";
import { EquityCurve } from "@/app/components/EquityCurve";
import { calculateTradeResult } from "@/lib/calculate";
import { formatMonthlyLossRoom } from "@/lib/monthly-risk";
import type { PreviewStatsData } from "@/app/components/stats-preview/PreviewStats";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatPf(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}

/** Classic light-theme Statistics page — preserved for reference. */
export function LegacyStatsPage({ data }: { data: PreviewStatsData }) {
  const { trades, experiment, monthly } = data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="text-sm text-zinc-500">Cycle metrics — decide what to improve next.</p>
      </header>

      <EquityCurve points={data.equityPoints} lossLimit={monthly.effectiveLossCap} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total trades" value={String(trades.length)} />
        <StatCard label="Closed trades" value={String(experiment.closedTrades)} />
        <StatCard label="Win rate" value={`${data.winRatePct.toFixed(1)}%`} />
        <StatCard label="Experiment net P/L" value={formatUsd(experiment.realizedPnL)} />
        <StatCard label="Total losses" value={formatUsd(experiment.grossLoss)} />
        <StatCard label="This month P/L" value={formatUsd(monthly.monthlyRealizedPnL)} />
        <StatCard label="Monthly budget" value={formatMonthlyLossRoom(monthly.baseCap)} />
        <StatCard label="Carryover" value={formatMonthlyLossRoom(monthly.carryoverIn)} />
        <StatCard label="Spent this month" value={formatMonthlyLossRoom(monthly.lossUsedThisMonth)} />
        <StatCard label="Monthly room left" value={formatMonthlyLossRoom(monthly.monthlyRoomCap)} />
        <StatCard
          label="Avg winner"
          value={data.avgWinner !== null ? formatUsd(data.avgWinner) : "—"}
        />
        <StatCard
          label="Avg loser"
          value={data.avgLoser !== null ? formatUsd(data.avgLoser) : "—"}
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
        <StatCard label="Mistakes cost" value={formatUsd(data.mistakesCost)} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
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
        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            P/L by playbook
          </h2>
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-2">Playbook</th>
                <th className="px-4 py-2">Trades</th>
                <th className="px-4 py-2">Win%</th>
                <th className="px-4 py-2">Profit factor</th>
                <th className="px-4 py-2">Net P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.playbookStats.map((row) => (
                <tr key={row.playbookId ?? "unassigned"}>
                  <td className="px-4 py-2 font-medium">
                    {row.playbook?.name ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-2">{row.tradeCount}</td>
                  <td className="px-4 py-2">
                    {row.winRate !== null ? `${(row.winRate * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{formatPf(row.profitFactor)}</td>
                  <td className="px-4 py-2 tabular-nums">{formatUsd(row.netPnL)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <nav className="flex gap-4 text-sm">
        <Link href="/playbook" className="text-zinc-600 hover:underline">
          Playbook Lab →
        </Link>
        <Link href="/mistakes" className="text-zinc-600 hover:underline">
          Mistakes →
        </Link>
        <Link href="/journal" className="text-zinc-600 hover:underline">
          Journal
        </Link>
        <Link href="/home-preview" className="text-zinc-600 hover:underline">
          Dashboard
        </Link>
      </nav>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
