import Link from "next/link";
import { computeMistakeStats } from "@/lib/review";
import { getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export default async function MistakesPage() {
  const trades = await getTrades();
  const stats = computeMistakeStats(trades);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Mistakes</h1>
        <p className="text-sm text-zinc-500">
          Cost in USD from losing trades tagged in review. Click a row to see trades.
        </p>
      </header>

      {stats.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No mistake tags yet. Complete a trade review to start tracking patterns.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Mistake</th>
                <th className="px-4 py-3 font-medium">Count</th>
                <th className="px-4 py-3 font-medium">Total cost</th>
                <th className="px-4 py-3 font-medium">Avg / trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stats.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3">{row.count}</td>
                  <td className="px-4 py-3 tabular-nums text-red-600">{formatUsd(row.totalCost)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatUsd(row.avgCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Trades by mistake
        </h2>
        <ul className="space-y-3 text-sm">
          {stats.map((row) => {
            const matching = trades.filter(
              (t) => t.status === "closed" && t.mistakes?.includes(row.id)
            );
            return (
              <li key={row.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="font-medium">{row.label}</p>
                <ul className="mt-2 space-y-1 text-zinc-600">
                  {matching.map((t) => (
                    <li key={t.id}>
                      <Link href={`/trades/${t.id}`} className="hover:underline">
                        {t.id} · {t.ticker}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <Link href="/stats" className="text-sm text-zinc-600 hover:underline">
        ← Statistics
      </Link>
    </div>
  );
}
