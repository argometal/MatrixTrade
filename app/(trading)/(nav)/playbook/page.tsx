import Link from "next/link";
import { computeAllPlaybookStats } from "@/lib/analytics";
import { PLAYBOOK_STATUS_LABELS } from "@/lib/playbook-types";
import { getPlaybooks } from "@/lib/playbooks";
import { getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

function formatR(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function formatPf(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}

const statusStyles: Record<string, string> = {
  TESTING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  RETIRED: "bg-zinc-100 text-zinc-600",
};

export default async function PlaybookPage() {
  const [playbooks, trades] = await Promise.all([getPlaybooks(), getTrades()]);
  const stats = computeAllPlaybookStats(playbooks, trades);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Playbook Lab</h1>
        <p className="text-sm text-zinc-500">
          Strategy laboratory — assign trades manually, measure what works.
        </p>
      </header>

      {playbooks.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No playbooks in <code className="text-xs">data/playbooks.json</code>. Add one to start
          testing strategies.
        </p>
      ) : (
        <div className="space-y-6">
          {stats.map((row) => {
            const name = row.playbook?.name ?? "Unassigned";
            const status = row.playbook?.status;
            const key = row.playbookId ?? "unassigned";

            return (
              <article
                key={key}
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{name}</h2>
                    {status && (
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
                      >
                        {PLAYBOOK_STATUS_LABELS[status]}
                      </span>
                    )}
                    {!row.playbook && (
                      <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        Unassigned
                      </span>
                    )}
                  </div>
                  {row.lastTradeDate && (
                    <p className="text-xs text-zinc-400">
                      Last trade: {new Date(row.lastTradeDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {row.playbook?.description && (
                  <p className="mt-3 text-sm text-zinc-600">{row.playbook.description}</p>
                )}

                {row.playbook?.checklist && row.playbook.checklist.length > 0 && (
                  <ul className="mt-3 list-inside list-disc text-sm text-zinc-600">
                    {row.playbook.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-5">
                  <Metric label="Trades" value={String(row.tradeCount)} />
                  <Metric label="Win rate" value={formatPct(row.winRate)} />
                  <Metric label="Profit factor" value={formatPf(row.profitFactor)} />
                  <Metric label="Expectancy" value={formatR(row.expectancyR)} />
                  <Metric label="Net P/L" value={formatUsd(row.netPnL)} />
                  <Metric
                    label="Avg winner"
                    value={row.avgWinner !== null ? formatUsd(row.avgWinner) : "—"}
                  />
                  <Metric
                    label="Avg loser"
                    value={row.avgLoser !== null ? formatUsd(row.avgLoser) : "—"}
                  />
                  <Metric label="Mistakes" value={String(row.mistakesCount)} />
                  <Metric label="Closed" value={String(row.closedCount)} />
                </dl>

                {row.tradeIds.length > 0 && (
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Trades
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                      {row.tradeIds.map((id) => (
                        <li key={id}>
                          <Link
                            href={`/trades/${id}`}
                            className="rounded-md bg-zinc-50 px-2 py-1 hover:bg-zinc-100"
                          >
                            {id}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <nav className="flex gap-4 text-sm">
        <Link href="/stats" className="text-zinc-600 hover:underline">
          Statistics →
        </Link>
        <Link href="/trades" className="text-zinc-600 hover:underline">
          Trades
        </Link>
      </nav>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
