import Link from "next/link";
import { EquityCurve } from "@/app/components/EquityCurve";
import { calculateTradeResult, winRate } from "@/lib/calculate";
import {
  buildEquityCurve,
  computeAvgR,
  computeExpectancy,
  computeMaxDrawdown,
} from "@/lib/review";
import { getSetupName, getSetups } from "@/lib/setups";
import { getExperiment, getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export default async function StatsPage() {
  const [trades, experiment, setups] = await Promise.all([
    getTrades(),
    getExperiment(),
    getSetups(),
  ]);

  const closed = trades.filter((t) => t.status === "closed");
  const expectancy = computeExpectancy(trades);
  const avgR = computeAvgR(trades);
  const maxDd = computeMaxDrawdown(trades);
  const rate = winRate(experiment);
  const equityPoints = buildEquityCurve(trades);

  let bestTrade = closed[0];
  let worstTrade = closed[0];
  for (const t of closed) {
    const pnl = calculateTradeResult(t) ?? 0;
    const bestPnl = calculateTradeResult(bestTrade) ?? 0;
    const worstPnl = calculateTradeResult(worstTrade) ?? 0;
    if (pnl > bestPnl) bestTrade = t;
    if (pnl < worstPnl) worstTrade = t;
  }

  const setupStats = setups
    .map((setup) => {
      const subset = closed.filter((t) => t.setupId === setup.id);
      if (subset.length === 0) return null;
      let wins = 0;
      let pnl = 0;
      for (const t of subset) {
        const r = calculateTradeResult(t) ?? 0;
        pnl += r;
        if (r > 0) wins += 1;
      }
      return {
        id: setup.id,
        name: setup.name,
        trades: subset.length,
        winRate: wins / subset.length,
        netPnL: pnl,
      };
    })
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="text-sm text-zinc-500">Cycle metrics — click a trade from the list to drill down.</p>
      </header>

      <EquityCurve points={equityPoints} lossLimit={experiment.cycleLossLimit} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Win rate" value={`${(rate * 100).toFixed(1)}%`} />
        <StatCard
          label="Avg R"
          value={avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—"}
        />
        <StatCard
          label="Expectancy"
          value={expectancy !== null ? `${formatUsd(expectancy)}/trade` : "—"}
        />
        <StatCard label="Max drawdown" value={formatUsd(maxDd)} />
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

      {setupStats.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            By setup
          </h2>
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-2">Setup</th>
                <th className="px-4 py-2">Trades</th>
                <th className="px-4 py-2">Win%</th>
                <th className="px-4 py-2">Net P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {setupStats.map((row) =>
                row ? (
                  <tr key={row.id}>
                    <td className="px-4 py-2 font-medium">{row.name}</td>
                    <td className="px-4 py-2">{row.trades}</td>
                    <td className="px-4 py-2">{(row.winRate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2 tabular-nums">{formatUsd(row.netPnL)}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        </section>
      )}

      <nav className="flex gap-4 text-sm">
        <Link href="/mistakes" className="text-zinc-600 hover:underline">
          Mistake costs →
        </Link>
        <Link href="/" className="text-zinc-600 hover:underline">
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
