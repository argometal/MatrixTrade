import Link from "next/link";
import type { MistakeStat } from "@/lib/review";
import type { Trade } from "@/lib/types";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function pnlTone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-200";
}

export function PreviewMistakes({
  stats,
  trades,
  embedded = false,
}: {
  stats: MistakeStat[];
  trades: Trade[];
  embedded?: boolean;
}) {
  const totalCost = stats.reduce((sum, row) => sum + row.totalCost, 0);

  const body = (
    <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
          {stats.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No mistake tags yet. Complete a trade review to start tracking patterns.
            </p>
          ) : (
            <>
              <section className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/50">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Mistake</th>
                      <th className="px-4 py-3 font-medium">Count</th>
                      <th className="px-4 py-3 font-medium">P/L impact</th>
                      <th className="px-4 py-3 font-medium">Avg loss</th>
                      <th className="px-4 py-3 font-medium">Worst trade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {stats.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium text-zinc-100">{row.label}</td>
                        <td className="px-4 py-3 text-zinc-300">{row.count}</td>
                        <td className={`px-4 py-3 tabular-nums ${pnlTone(row.totalCost)}`}>
                          {formatUsd(row.totalCost)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zinc-300">
                          {formatUsd(row.avgCost)}
                        </td>
                        <td className="px-4 py-3">
                          {row.worstTrade ? (
                            <Link
                              href={`/trades/${row.worstTrade.id}`}
                              className="text-violet-400 hover:text-violet-300 hover:underline"
                            >
                              {row.worstTrade.id} {row.worstTrade.ticker}{" "}
                              <span className={`tabular-nums ${pnlTone(row.worstTrade.pnl)}`}>
                                {formatUsd(row.worstTrade.pnl)}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Related trades
                </h2>
                <ul className="space-y-3">
                  {stats.map((row) => {
                    const matching = trades.filter(
                      (t) => t.status === "closed" && t.mistakes?.includes(row.id)
                    );
                    return (
                      <li
                        key={row.id}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        <p className="font-medium text-zinc-100">{row.label}</p>
                        <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                          {matching.map((t) => (
                            <li key={t.id}>
                              <Link
                                href={`/trades/${t.id}`}
                                className="text-violet-400 hover:text-violet-300 hover:underline"
                              >
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
            </>
          )}

          {!embedded && (
          <nav className="flex flex-wrap gap-4 border-t border-zinc-800 pt-4 text-sm">
            <Link href="/stats" className="text-zinc-500 hover:text-zinc-300">
              Statistics →
            </Link>
            <Link href="/playbook" className="text-zinc-500 hover:text-zinc-300">
              Playbook Lab →
            </Link>
          </nav>
          )}
        </div>
  );

  if (embedded) return body;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Mistakes</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                What errors cost you money — tagged in trade reviews.
              </p>
              {stats.length > 0 && (
                <p className={`mt-2 text-sm font-medium tabular-nums ${pnlTone(totalCost)}`}>
                  Total P/L impact: {formatUsd(totalCost)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/trades?tab=review"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                Review queue
              </Link>
              <Link
                href="/stats?tab=journal"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                Journal
              </Link>
            </div>
          </div>
        </header>
        {body}
      </div>
    </div>
  );
}
