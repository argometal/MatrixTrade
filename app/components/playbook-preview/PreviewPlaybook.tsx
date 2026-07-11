import Link from "next/link";
import type { PlaybookStats } from "@/lib/analytics";
import { ImportAiUpdateLink } from "@/app/components/preview/ImportAiUpdateLink";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { PLAYBOOK_STATUS_LABELS } from "@/lib/playbook-types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

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

function pnlTone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-200";
}

const statusStyles: Record<string, string> = {
  TESTING: "bg-amber-500/15 text-amber-400",
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  RETIRED: "bg-zinc-700/50 text-zinc-400",
};

export function PreviewPlaybook({
  stats,
  snapshotItems,
}: {
  stats: PlaybookStats[];
  snapshotItems: SnapshotMenuItem[];
}) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Playbook Lab</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Strategy laboratory — assign trades manually, measure what works.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SnapshotButton
                title="Playbook snapshot"
                description="Strategies, checklists, P/L and win rate per playbook"
                items={snapshotItems}
              />
              <ImportAiUpdateLink variant="compact" />
              <Link
                href="/trades-preview"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                New trade
              </Link>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
          {stats.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No playbooks in{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                data/playbooks.json
              </code>
              . Add one to start testing strategies.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.map((row) => {
                const name = row.playbook?.name ?? "Unassigned";
                const status = row.playbook?.status;
                const key = row.playbookId ?? "unassigned";

                return (
                  <article
                    key={key}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-zinc-100">{name}</h2>
                        {status && (
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
                          >
                            {PLAYBOOK_STATUS_LABELS[status]}
                          </span>
                        )}
                        {!row.playbook && (
                          <span className="mt-1 inline-block rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs font-medium text-zinc-400">
                            Unassigned
                          </span>
                        )}
                      </div>
                      {row.lastTradeDate && (
                        <p className="text-xs text-zinc-500">
                          Last trade: {new Date(row.lastTradeDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {row.playbook?.description && (
                      <p className="mt-3 text-sm text-zinc-400">{row.playbook.description}</p>
                    )}

                    {row.playbook?.experimentHypothesis ? (
                      <p className="mt-3 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
                        <span className="font-semibold uppercase tracking-wide text-violet-400">
                          Playbook experiment
                        </span>
                        <span className="mt-1 block text-zinc-300">
                          {row.playbook.experimentHypothesis}
                        </span>
                      </p>
                    ) : null}

                    {row.playbook?.principles && row.playbook.principles.length > 0 ? (
                      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                        {row.playbook.principles.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {row.playbook?.checklist && row.playbook.checklist.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                        {row.playbook.checklist.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                      <Metric label="Trades" value={String(row.tradeCount)} />
                      <Metric label="Win rate" value={formatPct(row.winRate)} />
                      <Metric label="Profit factor" value={formatPf(row.profitFactor)} />
                      <Metric label="Expectancy" value={formatR(row.expectancyR)} />
                      <Metric
                        label="Net P/L"
                        value={formatUsd(row.netPnL)}
                        valueClass={pnlTone(row.netPnL)}
                      />
                      <Metric
                        label="Avg winner"
                        value={row.avgWinner !== null ? formatUsd(row.avgWinner) : "—"}
                        valueClass={row.avgWinner !== null ? "text-emerald-400" : undefined}
                      />
                      <Metric
                        label="Avg loser"
                        value={row.avgLoser !== null ? formatUsd(row.avgLoser) : "—"}
                        valueClass={row.avgLoser !== null ? "text-red-400" : undefined}
                      />
                      <Metric label="Mistakes" value={String(row.mistakesCount)} />
                      <Metric label="Closed" value={String(row.closedCount)} />
                    </dl>

                    {row.tradeIds.length > 0 && (
                      <div className="mt-4 border-t border-zinc-800 pt-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          Trades
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                          {row.tradeIds.map((id) => (
                            <li key={id}>
                              <Link
                                href={`/trades/${id}`}
                                className="rounded-md border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-violet-400 hover:border-zinc-600 hover:text-violet-300"
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

          <nav className="flex gap-4 border-t border-zinc-800 pt-4 text-sm">
            <Link href="/stats" className="text-violet-400 hover:text-violet-300">
              Statistics →
            </Link>
            <Link href="/trades" className="text-zinc-400 hover:text-zinc-200">
              Trades
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-zinc-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
