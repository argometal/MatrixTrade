import Link from "next/link";
import { EquityCurve } from "@/app/components/EquityCurve";
import {
  computeAllPlaybookStats,
  computeAvgLoser,
  computeAvgWinner,
  computeProfitFactor,
} from "@/lib/analytics";
import { calculateTradeResult, winRate } from "@/lib/calculate";
import {
  buildEquityCurve,
  computeAvgR,
  computeExpectancy,
  computeMaxDrawdown,
  computeMistakeStats,
} from "@/lib/review";
import { getPlaybooks } from "@/lib/playbooks";
import { formatMonthlyLossRoom } from "@/lib/monthly-risk";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatPf(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}

export default async function StatsPage() {
  const [trades, experiment, monthly, playbooks] = await Promise.all([
    getTrades(),
    getExperiment(),
    getMonthlyRisk(),
    getPlaybooks(),
  ]);

  const closed = trades.filter((t) => t.status === "closed");
  const expectancy = computeExpectancy(trades);
  const avgR = computeAvgR(trades);
  const maxDd = computeMaxDrawdown(trades);
  const rate = winRate(experiment);
  const equityPoints = buildEquityCurve(trades);
  const avgWinner = computeAvgWinner(trades);
  const avgLoser = computeAvgLoser(trades);
  const profitFactor = computeProfitFactor(trades);
  const mistakeStats = computeMistakeStats(trades);
  const mistakesCost = mistakeStats.reduce((sum, m) => sum + m.totalCost, 0);
  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (p) => p.closedCount > 0 || p.playbookId !== null
  );

  let bestTrade = closed[0];
  let worstTrade = closed[0];
  for (const t of closed) {
    const pnl = calculateTradeResult(t) ?? 0;
    const bestPnl = calculateTradeResult(bestTrade) ?? 0;
    const worstPnl = calculateTradeResult(worstTrade) ?? 0;
    if (pnl > bestPnl) bestTrade = t;
    if (pnl < worstPnl) worstTrade = t;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="text-sm text-zinc-500">Cycle metrics — decide what to improve next.</p>
      </header>

      <EquityCurve points={equityPoints} lossLimit={monthly.effectiveLossCap} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total trades" value={String(trades.length)} />
        <StatCard label="Closed trades" value={String(experiment.closedTrades)} />
        <StatCard label="Win rate" value={`${(rate * 100).toFixed(1)}%`} />
        <StatCard label="Experiment net P/L" value={formatUsd(experiment.realizedPnL)} />
        <StatCard label="Total losses" value={formatUsd(experiment.grossLoss)} />
        <StatCard label="This month P/L" value={formatUsd(monthly.monthlyRealizedPnL)} />
        <StatCard
          label="Allowance this month"
          value={formatMonthlyLossRoom(monthly.monthlyAllowance)}
        />
        <StatCard
          label="Monthly room left"
          value={formatMonthlyLossRoom(monthly.monthlyLossRoom)}
        />
        <StatCard
          label="Avg winner"
          value={avgWinner !== null ? formatUsd(avgWinner) : "—"}
        />
        <StatCard
          label="Avg loser"
          value={avgLoser !== null ? formatUsd(avgLoser) : "—"}
        />
        <StatCard label="Profit factor" value={formatPf(profitFactor)} />
        <StatCard
          label="Expectancy"
          value={expectancy !== null ? `${formatUsd(expectancy)}/trade` : "—"}
        />
        <StatCard
          label="Avg R"
          value={avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—"}
        />
        <StatCard label="Max drawdown" value={formatUsd(maxDd)} />
        <StatCard label="Mistakes cost" value={formatUsd(mistakesCost)} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Best trade"
          value={
            bestTrade
              ? `${bestTrade.id} ${formatUsd(calculateTradeResult(bestTrade) ?? 0)}`
              : "—"
          }
        />
        <StatCard
          label="Worst trade"
          value={
            worstTrade
              ? `${worstTrade.id} ${formatUsd(calculateTradeResult(worstTrade) ?? 0)}`
              : "—"
          }
        />
      </section>

      {playbookStats.length > 0 && (
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
              {playbookStats.map((row) => (
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
