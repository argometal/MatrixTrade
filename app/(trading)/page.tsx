import Link from "next/link";
import { BridgeSyncPanel } from "@/app/components/BridgeSyncPanel";
import { ChatGptHandoff } from "@/app/components/ChatGptHandoff";
import { EquityCurve } from "@/app/components/EquityCurve";
import { MobileAccessBanner } from "@/app/components/MobileAccessBanner";
import { calculateTradeResult, winRate } from "@/lib/calculate";
import {
  buildEquityCurve,
  computeMistakeStats,
  getNextAction,
  getUnreviewedTrades,
  isBudgetWarning,
  suggestExportQuestion,
} from "@/lib/review";
import { fetchBridgeInbox } from "@/lib/bridge";
import { buildFullContext } from "@/lib/snapshot";
import { getSetups } from "@/lib/setups";
import { listAllPendingInboxItems } from "@/lib/trading-inbox-storage";
import { getExperiment, getTrades, getTradeNotes, getVaultStatus } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function pnlColor(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-zinc-600";
}

export default async function DashboardPage() {
  const [experiment, trades, vault, notes, setups, workerInbox] = await Promise.all([
    getExperiment(),
    getTrades(),
    getVaultStatus(),
    getTradeNotes(),
    getSetups(),
    fetchBridgeInbox(),
  ]);

  const active = trades.filter((t) => t.status === "open");
  const pending = trades.filter((t) => t.status === "pending");
  const rate = winRate(experiment);
  const snapshotOpts = { setups };
  const fullContext = buildFullContext(experiment, trades, notes, snapshotOpts);
  const fullContextAllClosed = buildFullContext(experiment, trades, notes, { full: true, setups });
  const unreviewedContext = buildFullContext(experiment, trades, notes, {
    unreviewedOnly: true,
    setups,
  });

  const unreviewed = getUnreviewedTrades(trades);
  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const mistakeStats = computeMistakeStats(trades);
  const nextAction = getNextAction(trades, experiment);
  const equityPoints = buildEquityCurve(trades);
  const suggestedQuestion = suggestExportQuestion(trades, mistakeStats);
  const budgetWarning = isBudgetWarning(experiment);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MatrixTrade</h1>
          <p className="text-sm text-zinc-500">Experiment H001–H030</p>
        </div>
        <Link
          href="/trades/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800"
        >
          New trade
        </Link>
      </header>

      {nextAction && (
        <div className="rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-3 text-white shadow-sm sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Next action</p>
            <p className="mt-1 text-sm font-medium">{nextAction.label}</p>
          </div>
          <Link
            href={nextAction.href}
            className="mt-3 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 sm:mt-0"
          >
            Go →
          </Link>
        </div>
      )}

      <BridgeSyncPanel />

      <MobileAccessBanner />

      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
        <span className="font-medium">Obsidian vault:</span>{" "}
        <code className="text-xs text-zinc-600">{vault.vaultPath}</code>
        <span className="mx-2 text-zinc-300">·</span>
        <span className="text-zinc-500">{vault.tradesFolder}/</span>
        {!vault.ready && (
          <p className="mt-1 text-xs text-amber-600">
            Vault folder not found — create it or update obsidianVaultPath in data/rules.json
          </p>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Realized P/L" value={formatUsd(experiment.realizedPnL)} valueClass={pnlColor(experiment.realizedPnL)} />
        <MetricCard
          label="Remaining loss budget"
          value={formatUsd(experiment.remainingLossBudget)}
          hint={`Limit: ${formatUsd(experiment.cycleLossLimit)}`}
          valueClass={pnlColor(experiment.remainingLossBudget)}
        />
        <MetricCard label="Closed trades" value={String(experiment.closedTrades)} hint={`Max ${experiment.maxTrades}`} />
        <MetricCard
          label="Win rate"
          value={`${(rate * 100).toFixed(1)}%`}
          hint={`${experiment.wins}W / ${experiment.losses}L`}
        />
      </section>

      {(unreviewed.length > 0 || budgetWarning || pendingInbox.length > 0) && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">Needs attention</h2>
          <ul className="mt-3 space-y-2 text-sm text-amber-950">
            {pendingInbox.length > 0 && (
              <li className="flex items-center justify-between gap-4">
                <span>{pendingInbox.length} AI proposal(s) in inbox</span>
                <Link href="/inbox" className="font-medium underline">
                  Review inbox
                </Link>
              </li>
            )}
            {unreviewed.map((trade) => (
              <li key={trade.id} className="flex items-center justify-between gap-4">
                <span>
                  {trade.id} · {trade.ticker} — review pending
                </span>
                <Link href={`/trades/${trade.id}/review`} className="font-medium underline">
                  Review
                </Link>
              </li>
            ))}
            {budgetWarning && (
              <li>Loss budget is over 70% used — slow down or tighten rules.</li>
            )}
          </ul>
        </section>
      )}

      <EquityCurve points={equityPoints} lossLimit={experiment.cycleLossLimit} compact />

      {mistakeStats.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Top mistake cost</h2>
            <Link href="/mistakes" className="text-xs text-zinc-500 hover:underline">
              View all →
            </Link>
          </div>
          <p className="mt-2 text-sm">
            <span className="font-medium">{mistakeStats[0].label}</span>
            <span className="ml-2 text-red-600">{formatUsd(mistakeStats[0].totalCost)}</span>
            <span className="ml-2 text-zinc-400">({mistakeStats[0].count} trades)</span>
          </p>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <StatusPanel title="Open" trades={active} empty="No open trades." />
        <StatusPanel title="Pending" trades={pending} empty="No pending trades." />
      </section>

      <ChatGptHandoff
        fullContext={fullContext}
        fullContextAllClosed={fullContextAllClosed}
        unreviewedContext={unreviewedContext}
        suggestedQuestion={suggestedQuestion}
      />

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/trades" className="text-zinc-600 underline-offset-4 hover:underline">
          View all trades →
        </Link>
        <Link href="/stats" className="text-zinc-600 underline-offset-4 hover:underline">
          Statistics →
        </Link>
      </nav>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  valueClass = "text-zinc-900",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function StatusPanel({
  title,
  trades,
  empty,
}: {
  title: string;
  trades: Awaited<ReturnType<typeof getTrades>>;
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      {trades.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100">
          {trades.map((trade) => {
            const result = calculateTradeResult(trade);
            return (
              <li key={trade.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/trades/${trade.id}`} className="font-medium hover:underline">
                  {trade.id} · {trade.ticker}
                </Link>
                <span className="text-zinc-500">
                  {result !== null ? formatUsd(result) : `@ ${trade.entry}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
