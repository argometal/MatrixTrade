import Link from "next/link";
import type { EquityPoint } from "@/lib/review";
import {
  formatDashboardPf,
  formatDashboardUsd,
  type DashboardData,
} from "@/lib/dashboard-data";
import { formatMonthlyLossRoom } from "@/lib/monthly-risk";

function DarkEquityChart({
  points,
  lossLimit,
}: {
  points: EquityPoint[];
  lossLimit: number;
}) {
  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
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
      {points.map((p, i) => (
        <circle key={p.id} cx={toX(i)} cy={toY(p.cumulativePnL)} r="3" fill="#a78bfa" />
      ))}
    </svg>
  );
}

function pnlTone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-200";
}

export function PreviewDashboard({ data }: { data: DashboardData }) {
  const { experiment, monthly, mistakeStats } = data;
  const topMistake = mistakeStats[0];

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                {data.cycleLabel} · experiment control
              </p>
            </div>
            <Link
              href="/trades-preview"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              New trade
            </Link>
          </div>
        </div>

        <div className="space-y-6 p-4 lg:p-6">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Today&apos;s status
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatusTile
                label="Cycle"
                value={`${experiment.closedTrades}/${experiment.maxTrades}`}
              />
              <StatusTile
                label="Monthly budget"
                value={formatMonthlyLossRoom(monthly.baseCap)}
                sub="Base cap this month"
              />
              <StatusTile
                label="Carryover"
                value={formatMonthlyLossRoom(monthly.carryoverIn)}
                sub={
                  monthly.carryoverIn > 0
                    ? `$300 − $${monthly.previousMonthLossUsed.toFixed(2)} last month`
                    : "No unused cap from prior month"
                }
              />
              <StatusTile
                label="Spent this month"
                value={formatMonthlyLossRoom(monthly.lossUsedThisMonth)}
                sub="Gross losses only (this calendar month)"
              />
              <StatusTile
                label="This month P/L"
                value={formatDashboardUsd(monthly.monthlyRealizedPnL)}
                valueClass={pnlTone(monthly.monthlyRealizedPnL)}
              />
              <StatusTile
                label="Monthly room left"
                value={formatMonthlyLossRoom(monthly.monthlyLossRoom)}
                sub={`$${monthly.baseCap.toFixed(0)} + $${monthly.carryoverIn.toFixed(2)} − $${monthly.lossUsedThisMonth.toFixed(2)}`}
                valueClass={monthly.monthlyLossRoom > 0 ? "text-zinc-200" : "text-red-400"}
              />
              <StatusTile
                label="Experiment net P/L"
                value={formatDashboardUsd(experiment.realizedPnL)}
                valueClass={pnlTone(experiment.realizedPnL)}
              />
              <StatusTile
                label="Total losses"
                value={formatDashboardUsd(experiment.grossLoss)}
                valueClass="text-red-400"
              />
              <StatusTile label="Open trades" value={String(data.openTrades)} />
              <StatusTile
                label="Pending reviews"
                value={String(data.pendingReviews)}
                highlight={data.pendingReviews > 0}
              />
              <StatusTile label="Active playbooks" value={String(data.activePlaybooks)} />
              <StatusTile label="Playbooks testing" value={String(data.testingPlaybooks)} />
              <StatusTile
                label="Active plans"
                value={String(data.activePlans)}
                sub="Watching or ready to enter"
              />
              <StatusTile
                label="Plans to evaluate"
                value={String(data.plansNeedingReview)}
                highlight={data.plansNeedingReview > 0}
                sub="Failed or expired — strategy review"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Needs attention
            </h2>
            {data.attentionItems.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Nothing pending — cycle is on track.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-800">
                {data.attentionItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0"
                  >
                    <span className="text-sm font-medium text-zinc-200">{item.label}</span>
                    <Link
                      href={item.href}
                      className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
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

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Equity curve</h2>
            <div className="mt-4">
              <DarkEquityChart
                points={data.equityPoints}
                lossLimit={monthly.effectiveLossCap}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
            <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">
                    Most expensive mistake
                  </h2>
                  <p className="mt-2 text-xl font-semibold text-zinc-100">{topMistake.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-red-400">
                    {formatDashboardUsd(topMistake.totalCost)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {topMistake.count} trade{topMistake.count === 1 ? "" : "s"}
                    {topMistake.worstTrade && (
                      <>
                        {" "}
                        · worst{" "}
                        <Link
                          href={`/trades/${topMistake.worstTrade.id}`}
                          className="font-medium text-violet-300 hover:text-violet-200"
                        >
                          {topMistake.worstTrade.id} {topMistake.worstTrade.ticker}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <Link href="/mistakes" className="text-sm text-red-300 hover:text-red-200">
                  Details →
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  valueClass = "text-zinc-100",
  highlight = false,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight ? "border-amber-500/40 bg-amber-950/30" : "border-zinc-800 bg-zinc-900/80"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

function PerfCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">{value}</p>
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
      className="block rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-zinc-700"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-200">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </Link>
  );
}
