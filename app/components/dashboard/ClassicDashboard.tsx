import Link from "next/link";
import { EquityCurve } from "@/app/components/EquityCurve";
import {
  computeAllPlaybookStats,
  computeProfitFactor,
} from "@/lib/analytics";
import { calculateTradeResult, winRate } from "@/lib/calculate";
import { buildAttentionItems } from "@/lib/dashboard-attention";
import { fetchBridgeInbox } from "@/lib/bridge";
import { getPlaybooks } from "@/lib/playbooks";
import {
  buildEquityCurve,
  computeAvgR,
  computeExpectancy,
  computeMistakeStats,
} from "@/lib/review";
import { listAllPendingInboxItems } from "@/lib/trading-inbox-storage";
import { getExperiment, getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function pnlColor(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-zinc-600";
}

function formatPf(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}

export async function ClassicDashboard() {
  const [experiment, trades, playbooks, workerInbox] = await Promise.all([
    getExperiment(),
    getTrades(),
    getPlaybooks(),
    fetchBridgeInbox(),
  ]);

  const openTrades = trades.filter((t) => t.status === "open").length;
  const pendingReviews = trades.filter((t) => t.status === "closed" && !t.reviewedAt).length;
  const activePlaybooks = playbooks.filter((p) => p.status === "ACTIVE").length;
  const testingPlaybooks = playbooks.filter((p) => p.status === "TESTING").length;
  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const attentionItems = buildAttentionItems(trades, pendingInbox, playbooks);
  const mistakeStats = computeMistakeStats(trades);
  const equityPoints = buildEquityCurve(trades);
  const rate = winRate(experiment);
  const profitFactor = computeProfitFactor(trades);
  const expectancy = computeExpectancy(trades);
  const avgR = computeAvgR(trades);

  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (p) => p.playbookId !== null && p.closedCount > 0
  );
  const bestPlaybook = playbookStats.length
    ? [...playbookStats].sort((a, b) => b.netPnL - a.netPnL)[0]
    : null;
  const worstPlaybook = playbookStats.length
    ? [...playbookStats].sort((a, b) => a.netPnL - b.netPnL)[0]
    : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500">Experiment H001–H030 · classic view</p>
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
            value={formatUsd(experiment.realizedPnL)}
            valueClass={pnlColor(experiment.realizedPnL)}
          />
          <StatusTile
            label="Loss budget left"
            value={formatUsd(experiment.remainingLossBudget)}
            valueClass={pnlColor(experiment.remainingLossBudget)}
          />
          <StatusTile label="Open trades" value={String(openTrades)} />
          <StatusTile
            label="Pending reviews"
            value={String(pendingReviews)}
            highlight={pendingReviews > 0}
          />
          <StatusTile label="Active playbooks" value={String(activePlaybooks)} />
          <StatusTile label="Playbooks testing" value={String(testingPlaybooks)} />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Needs attention
        </h2>
        {attentionItems.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing pending — cycle is on track.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {attentionItems.map((item) => (
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

      {(bestPlaybook || worstPlaybook || mistakeStats[0]) && (
        <section className="grid gap-4 sm:grid-cols-3">
          {bestPlaybook && (
            <InsightCard
              label="Best strategy"
              title={bestPlaybook.playbook?.name ?? "—"}
              value={formatUsd(bestPlaybook.netPnL)}
              href="/playbook"
            />
          )}
          {worstPlaybook && worstPlaybook.playbookId !== bestPlaybook?.playbookId && (
            <InsightCard
              label="Weakest strategy"
              title={worstPlaybook.playbook?.name ?? "—"}
              value={formatUsd(worstPlaybook.netPnL)}
              href="/playbook"
            />
          )}
          {mistakeStats[0] && (
            <InsightCard
              label="Costliest mistake"
              title={mistakeStats[0].label}
              value={formatUsd(mistakeStats[0].totalCost)}
              sub={`${mistakeStats[0].count} trade${mistakeStats[0].count === 1 ? "" : "s"}`}
              href="/mistakes"
            />
          )}
        </section>
      )}

      <EquityCurve points={equityPoints} lossLimit={experiment.cycleLossLimit} />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Performance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PerfCard label="Win rate" value={`${(rate * 100).toFixed(1)}%`} />
          <PerfCard label="Profit factor" value={formatPf(profitFactor)} />
          <PerfCard
            label="Expectancy"
            value={expectancy !== null ? `${formatUsd(expectancy)}/trade` : "—"}
          />
          <PerfCard
            label="Average R"
            value={avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—"}
          />
        </div>
      </section>

      {mistakeStats[0] && (
        <section className="rounded-lg border border-red-100 bg-red-50/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-800">
                Most expensive mistake
              </h2>
              <p className="mt-2 text-xl font-semibold text-zinc-900">{mistakeStats[0].label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-600">
                {formatUsd(mistakeStats[0].totalCost)}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {mistakeStats[0].count} trade{mistakeStats[0].count === 1 ? "" : "s"}
                {mistakeStats[0].worstTrade && (
                  <>
                    {" "}
                    · worst{" "}
                    <Link
                      href={`/trades/${mistakeStats[0].worstTrade.id}`}
                      className="font-medium underline"
                    >
                      {mistakeStats[0].worstTrade.id} {mistakeStats[0].worstTrade.ticker}
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
