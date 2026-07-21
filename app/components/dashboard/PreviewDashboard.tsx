"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { HomeDashboardMain } from "@/app/components/home-dashboard/HomeDashboardMain";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import type { EquityPoint } from "@/lib/review";
import type { AiBridgeOverviewData } from "@/lib/ai-bridge-overview";
import { formatDashboardUsd } from "@/lib/dashboard-display";
import type { DashboardData } from "@/lib/dashboard-types";
import { formatMonthlyLossRoom } from "@/lib/monthly-risk";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

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

type ExchangeProps = {
  snapshotText: string;
  overview: AiBridgeOverviewData;
  pendingInboxCount: number;
  cycleLabel: string;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
  dashboardSnapshots: SnapshotMenuItem[];
};

export function PreviewDashboard({
  data,
  exchange,
}: {
  data: DashboardData;
  exchange?: ExchangeProps;
}) {
  const searchParams = useSearchParams();
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("panel") === "assistant") {
      setAssistantOpen(true);
    }
  }, [searchParams]);

  const { experiment, monthly } = data;

  return (
    <PageHelpPanel pageId="dashboard">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="border-b border-zinc-800 px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {data.cycleLabel} · risk & attention today
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:mr-[11rem]">
                {exchange ? (
                  <SnapshotButton
                    title="Dashboard snapshot"
                    description="Budget, experiment, attention"
                    items={exchange.dashboardSnapshots}
                  />
                ) : null}
                <Link
                  href="/stats"
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Insights
                </Link>
                <Link
                  href="/trades-preview"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Enter Trade
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-4 lg:p-6">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Today
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatusTile
                  label="Monthly room"
                  value={formatMonthlyLossRoom(monthly.monthlyLossRoom)}
                  valueClass={monthly.monthlyLossRoom > 0 ? "text-zinc-200" : "text-red-400"}
                />
                <StatusTile
                  label="This month P/L"
                  value={formatDashboardUsd(monthly.monthlyRealizedPnL)}
                  valueClass={pnlTone(monthly.monthlyRealizedPnL)}
                />
                <StatusTile label="Open" value={String(data.openTrades)} />
                <StatusTile
                  label="Pending reviews"
                  value={String(data.pendingReviews)}
                  highlight={data.pendingReviews > 0}
                />
                <StatusTile
                  label="Active scouts"
                  value={String(data.activePlans)}
                  sub="Watching or ready"
                />
                <StatusTile
                  label="Scouts to evaluate"
                  value={String(data.plansNeedingReview)}
                  highlight={data.plansNeedingReview > 0}
                />
                <StatusTile label="Closed (cycle)" value={String(experiment.closedTrades)} />
                <StatusTile
                  label="Cycle net"
                  value={formatDashboardUsd(experiment.realizedPnL)}
                  valueClass={pnlTone(experiment.realizedPnL)}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Needs attention
              </h2>
              {data.attentionItems.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nothing pending.</p>
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

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-200">Equity</h2>
                <Link href="/stats" className="text-xs text-violet-400 hover:text-violet-300">
                  Full Insights →
                </Link>
              </div>
              <div className="mt-4">
                <DarkEquityChart
                  points={data.equityPoints}
                  lossLimit={monthly.effectiveLossCap}
                />
              </div>
            </section>

            {exchange && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setAssistantOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">Paste AI Block (legacy)</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Prefer Control → Update.
                    </p>
                  </div>
                  <span className="text-zinc-500">{assistantOpen ? "▾" : "▸"}</span>
                </button>
                {assistantOpen && (
                  <div className="border-t border-zinc-800 px-4 py-4 lg:px-6">
                    <HomeDashboardMain
                      snapshotText={exchange.snapshotText}
                      overview={exchange.overview}
                      pendingInboxCount={exchange.pendingInboxCount}
                      cycleLabel={exchange.cycleLabel}
                      importAction={exchange.importAction}
                      theme="dark"
                      hideHeader
                      variant="assistant-only"
                    />
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </PageHelpPanel>
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
