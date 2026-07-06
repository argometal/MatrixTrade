import Link from "next/link";
import type { EquityPoint } from "@/lib/review";
import type { SituationRoomData } from "@/lib/situation-room";
import {
  formatProfitFactor,
  formatSituationPct,
  formatSituationUsd,
} from "@/lib/situation-room";

const NAV_MAIN = [
  { href: "/home-preview", label: "Dashboard", active: true },
  { href: "/trades-preview", label: "Trades", active: false },
  { href: "/playbook", label: "Playbooks", active: false },
  { href: "/review", label: "Review", active: false },
  { href: "/stats", label: "Statistics", active: false },
  { href: "/journal", label: "Journal", active: false },
] as const;

const NAV_SYSTEM = [
  { href: "/inbox", label: "Inbox" },
  { href: "/exchange", label: "Assistant" },
  { href: "/system", label: "Settings" },
] as const;

const QUICK_NAV = [
  { href: "/trades-preview", label: "Trades" },
  { href: "/review", label: "Review" },
  { href: "/inbox", label: "Inbox" },
  { href: "/stats", label: "Statistics" },
  { href: "/playbook", label: "Playbooks" },
  { href: "/exchange", label: "Assistant workspace" },
] as const;

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "neutral" | "violet";
}) {
  const toneClass =
    tone === "pos"
      ? "text-emerald-400"
      : tone === "neg"
        ? "text-red-400"
        : tone === "violet"
          ? "text-violet-400"
          : "text-zinc-50";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function DarkEquityChart({
  points,
  lossLimit,
}: {
  points: EquityPoint[];
  lossLimit: number;
}) {
  if (points.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        Performance trend appears after your first closed trade.
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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="P/L trend">
      <line x1={padLeft} y1={toY(0)} x2={width - padRight} y2={toY(0)} stroke="#3f3f46" />
      <polyline fill="none" stroke="#8b5cf6" strokeWidth="2.5" points={polyline} />
      {points.map((p, i) => (
        <circle key={p.id} cx={toX(i)} cy={toY(p.cumulativePnL)} r="3" fill="#a78bfa" />
      ))}
    </svg>
  );
}

function TradeStatusDonut({ data }: { data: SituationRoomData["tradeStatus"] }) {
  const segments = [
    { label: "Open trades", value: data.open, color: "#34d399" },
    { label: "Pending reviews", value: data.underReview, color: "#fbbf24" },
    { label: "Closed (cycle)", value: data.closed, color: "#a78bfa" },
    { label: "Remaining", value: data.remaining, color: "#52525b" },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 52;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#27272a" strokeWidth="16" />
        {segments.map((seg) => {
          const dash = (seg.value / total) * c;
          const el = (
            <circle
              key={seg.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="fill-zinc-100 text-lg font-bold">
          {data.closed}
        </text>
        <text x="70" y="82" textAnchor="middle" className="fill-zinc-500 text-[10px]">
          / {data.max}
        </text>
      </svg>
      <ul className="flex-1 space-y-2 text-sm">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-zinc-400">
              <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
              {seg.label}
            </span>
            <span className="font-medium tabular-nums text-zinc-200">{seg.value}</span>
          </li>
        ))}
        {data.pending > 0 && (
          <li className="flex items-center justify-between gap-3 text-zinc-400">
            <span>Pending orders</span>
            <span className="font-medium text-zinc-200">{data.pending}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function alertDot(severity: SituationRoomData["alerts"][0]["severity"]) {
  if (severity === "danger") return "bg-red-500";
  if (severity === "warning") return "bg-amber-400";
  return "bg-sky-400";
}

export function SituationRoomDashboard({ data }: { data: SituationRoomData }) {
  const pnlTone = data.summary.totalPnL >= 0 ? "pos" : "neg";
  const expTone =
    data.summary.expectancy !== null && data.summary.expectancy >= 0 ? "pos" : "neg";

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Mobile top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
            M
          </span>
          <span className="font-semibold">MatrixTrade</span>
        </div>
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
          Classic →
        </Link>
      </div>

      {/* Left sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4 lg:flex xl:w-60">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
            M
          </span>
          <span className="font-semibold">MatrixTrade</span>
        </div>
        <nav className="space-y-1">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Main
          </p>
          {NAV_MAIN.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                item.active
                  ? "bg-violet-600/20 font-medium text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <nav className="mt-6 space-y-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            System
          </p>
          {NAV_SYSTEM.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            >
              {item.label}
              {item.label === "Inbox" && data.pendingInboxCount > 0 && (
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  {data.pendingInboxCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4 border-t border-zinc-800 pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Current cycle</p>
            <p className="mt-1 text-sm font-medium">{data.cycleLabel}</p>
            <p className="text-xs text-zinc-500">
              {data.summary.tradesUsed} / {data.summary.tradesMax} trades
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{
                  width: `${Math.min(100, (data.summary.tradesUsed / data.summary.tradesMax) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Loss budget {formatSituationUsd(data.summary.lossBudgetRemaining)} left
            </p>
          </div>
          <Link
            href="/"
            className="block text-xs text-zinc-600 transition hover:text-zinc-400"
          >
            Classic dashboard →
          </Link>
        </div>
      </aside>

      {/* Center */}
      <div className="min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">
                {data.greeting} <span aria-hidden>☀️</span>
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Situation room · read-only briefing
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="hidden rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 sm:inline-block"
              >
                Classic dashboard →
              </Link>
              <span className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400">
                {data.cycleLabel} (Current)
              </span>
              <Link
                href="/trades-preview"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                + New Trade
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-4 lg:p-6">
          {/* 1. Top summary */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Top summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total P/L (this cycle)"
                value={formatSituationUsd(data.summary.totalPnL)}
                sub="Am I winning?"
                tone={pnlTone}
              />
              <KpiCard
                label="Win rate"
                value={formatSituationPct(data.summary.winRate)}
                sub={`${data.summary.wins}W / ${data.summary.losses}L`}
                tone="violet"
              />
              <KpiCard
                label="Expectancy"
                value={
                  data.summary.expectancy !== null
                    ? formatSituationUsd(data.summary.expectancy)
                    : "—"
                }
                sub="Per closed trade"
                tone={expTone}
              />
              <KpiCard
                label="Trades"
                value={`${data.summary.tradesUsed} / ${data.summary.tradesMax}`}
                sub={`${formatSituationUsd(data.summary.lossBudgetRemaining)} risk left`}
                tone="neutral"
              />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* 2. Performance */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="text-sm font-semibold text-zinc-200">Performance overview</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Experiment trend — not today only</p>
              <div className="mt-4">
                <DarkEquityChart
                  points={data.performance.equityPoints}
                  lossLimit={data.performance.lossLimit}
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-zinc-500">Best day</dt>
                  <dd className="font-medium text-emerald-400">
                    {data.performance.bestDay !== null
                      ? formatSituationUsd(data.performance.bestDay)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Worst day</dt>
                  <dd className="font-medium text-red-400">
                    {data.performance.worstDay !== null
                      ? formatSituationUsd(data.performance.worstDay)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Avg daily P/L</dt>
                  <dd className="font-medium text-zinc-200">
                    {data.performance.avgDailyPnL !== null
                      ? formatSituationUsd(data.performance.avgDailyPnL)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Profit factor</dt>
                  <dd className="font-medium text-zinc-200">
                    {formatProfitFactor(data.performance.profitFactor)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* 3. Trade status */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="text-sm font-semibold text-zinc-200">Trade status</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Where every trade is right now</p>
              <div className="mt-4">
                <TradeStatusDonut data={data.tradeStatus} />
              </div>
              <Link
                href="/trades"
                className="mt-4 inline-block text-xs font-medium text-violet-400 hover:text-violet-300"
              >
                View all trades →
              </Link>
            </section>
          </div>

          {/* 4. Recent activity */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Recent activity</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Flight recorder — what just happened</p>
            {data.recentClosed.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No closed trades yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                      <th className="pb-2 pr-4">Ticker</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Playbook</th>
                      <th className="pb-2 pr-4">Entry</th>
                      <th className="pb-2 pr-4">Exit</th>
                      <th className="pb-2 pr-4">P/L</th>
                      <th className="pb-2 pr-4">R</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {data.recentClosed.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2.5 pr-4">
                          <Link href={`/trades/${row.id}`} className="font-medium hover:text-violet-300">
                            {row.ticker}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 capitalize text-zinc-400">{row.direction}</td>
                        <td className="py-2.5 pr-4 text-zinc-400">{row.playbook}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{row.entry.toFixed(2)}</td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          {row.exit !== null ? row.exit.toFixed(2) : "—"}
                        </td>
                        <td
                          className={`py-2.5 pr-4 tabular-nums font-medium ${
                            row.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatSituationUsd(row.pnl)}
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-zinc-400">
                          {row.rMultiple !== null ? `${row.rMultiple.toFixed(2)}R` : "—"}
                        </td>
                        <td className="py-2.5 text-zinc-500">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ul className="mt-4 space-y-1 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
              {data.recentActivity.slice(0, 6).map((ev) => (
                <li key={ev.id}>
                  {ev.href ? (
                    <Link href={ev.href} className="hover:text-violet-300">
                      {ev.label}
                    </Link>
                  ) : (
                    ev.label
                  )}
                  <span className="ml-2 text-zinc-600">{ev.at.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 8. Quick navigation */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Quick navigation
            </h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-500/50 hover:text-violet-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <footer className="border-t border-zinc-800 px-4 py-3 text-[10px] text-zinc-600 lg:px-6">
          Live data · v2 preview · Human actions first. AI infers. You approve. · Supabase is source
          of truth.
        </footer>
      </div>

      {/* Right panel */}
      <aside className="hidden w-72 shrink-0 flex-col gap-4 border-l border-zinc-800 bg-zinc-950 p-4 xl:flex">
        <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/80 to-zinc-900 p-4">
          <h2 className="text-sm font-semibold text-violet-200">Assistant workspace</h2>
          <p className="mt-2 text-xs text-zinc-400">
            Copy snapshot, ask in natural language, import AI blocks — actions live here, not on the
            dashboard.
          </p>
          <Link
            href="/exchange"
            className="mt-3 inline-block rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500"
          >
            Open assistant workspace →
          </Link>
        </section>

        {/* 5. Alerts */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Alerts</h2>
            {data.alerts.length > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300">
                {data.alerts.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Operational attention only</p>
          {data.alerts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">All clear — nothing requires action.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.alerts.map((alert) => (
                <li key={alert.id}>
                  <Link href={alert.href} className="flex gap-2 text-sm hover:text-violet-300">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alertDot(alert.severity)}`} />
                    <span className="text-zinc-300">{alert.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 6. Top playbooks */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Top playbooks</h2>
          <p className="mt-0.5 text-xs text-zinc-500">This cycle · what is working</p>
          {data.topPlaybooks.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No closed playbook stats yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.topPlaybooks.map((pb) => (
                <li key={pb.name}>
                  <p className="font-medium text-zinc-200">{pb.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatSituationPct(pb.winRate)} win · {pb.trades} trades
                  </p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      pb.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatSituationUsd(pb.pnl)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/playbook" className="mt-3 inline-block text-xs text-violet-400 hover:text-violet-300">
            All playbooks →
          </Link>
        </section>
      </aside>
    </div>
  );
}
