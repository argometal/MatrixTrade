import Link from "next/link";
import { EquityCurve } from "@/app/components/EquityCurve";
import {
  formatDashboardPf,
  formatDashboardUsd,
  loadDashboardData,
} from "@/lib/dashboard-data";

function pnlColor(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-zinc-600";
}

export async function ClassicDashboard() {
  const data = await loadDashboardData();
  const { experiment, mistakeStats } = data;
  const topMistake = mistakeStats[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500">{data.cycleLabel} · classic view</p>
        </div>
        <Link
          href="/trades/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800"
        >
          New trade
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Today&apos;s status
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusTile label="Cycle" value={`${experiment.closedTrades}/${experiment.maxTrades}`} />
          <StatusTile
            label="Realized P/L"
            value={formatDashboardUsd(experiment.realizedPnL)}
            valueClass={pnlColor(experiment.realizedPnL)}
          />
          <StatusTile
            label="Loss budget left"
            value={formatDashboardUsd(experiment.remainingLossBudget)}
            valueClass={pnlColor(experiment.remainingLossBudget)}
          />
          <StatusTile label="Open trades" value={String(data.openTrades)} />
          <StatusTile
            label="Pending reviews"
            value={String(data.pendingReviews)}
            highlight={data.pendingReviews > 0}
          />
          <StatusTile label="Active playbooks" value={String(data.activePlaybooks)} />
          <StatusTile label="Playbooks testing" value={String(data.testingPlaybooks)} />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Needs attention
        </h2>
        {data.attentionItems.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing pending — cycle is on track.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {data.attentionItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <span className="text-sm font-medium text-zinc-800">{item.label}</span>
                <Link
                  href={item.href}
                  className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Go →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(data.bestPlaybook || data.worstPlaybook || topMistake) && (
        <section className="grid gap-4 sm:grid-cols-3">
          {data.bestPlaybook && (
            <InsightCard
              label="Best strategy"
              title={data.bestPlaybook.playbook?.name ?? "—"}
              value={formatDashboardUsd(data.bestPlaybook.netPnL)}
              href="/playbook"
            />
          )}
          {data.worstPlaybook &&
            data.worstPlaybook.playbookId !== data.bestPlaybook?.playbookId && (
              <InsightCard
                label="Weakest strategy"
                title={data.worstPlaybook.playbook?.name ?? "—"}
                value={formatDashboardUsd(data.worstPlaybook.netPnL)}
                href="/playbook"
              />
            )}
          {topMistake && (
            <InsightCard
              label="Costliest mistake"
              title={topMistake.label}
              value={formatDashboardUsd(topMistake.totalCost)}
              sub={`${topMistake.count} trade${topMistake.count === 1 ? "" : "s"}`}
              href="/mistakes"
            />
          )}
        </section>
      )}

      <EquityCurve points={data.equityPoints} lossLimit={experiment.cycleLossLimit} />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Performance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PerfCard label="Win rate" value={`${(data.winRate * 100).toFixed(1)}%`} />
          <PerfCard label="Profit factor" value={formatDashboardPf(data.profitFactor)} />
          <PerfCard
            label="Expectancy"
            value={
              data.expectancy !== null ? `${formatDashboardUsd(data.expectancy)}/trade` : "—"
            }
          />
          <PerfCard
            label="Average R"
            value={
              data.avgR !== null ? `${data.avgR >= 0 ? "+" : ""}${data.avgR.toFixed(2)}R` : "—"
            }
          />
        </div>
      </section>

      {topMistake && (
        <section className="rounded-lg border border-red-100 bg-red-50/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-800">
                Most expensive mistake
              </h2>
              <p className="mt-2 text-xl font-semibold text-zinc-900">{topMistake.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-600">
                {formatDashboardUsd(topMistake.totalCost)}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {topMistake.count} trade{topMistake.count === 1 ? "" : "s"}
                {topMistake.worstTrade && (
                  <>
                    {" "}
                    · worst{" "}
                    <Link
                      href={`/trades/${topMistake.worstTrade.id}`}
                      className="font-medium underline"
                    >
                      {topMistake.worstTrade.id} {topMistake.worstTrade.ticker}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <Link href="/mistakes" className="text-sm text-red-800 hover:underline">
              Details →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function StatusTile({
  label,
  value,
  valueClass = "text-zinc-900",
  highlight = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 shadow-sm ${
        highlight ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function PerfCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function InsightCard({
  label,
  title,
  value,
  sub,
  href,
}: {
  label: string;
  title: string;
  value: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900">{title}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </Link>
  );
}
