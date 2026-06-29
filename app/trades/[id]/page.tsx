import Link from "next/link";
import { notFound } from "next/navigation";
import { closeTradeAction, openTradeAction } from "@/app/actions";
import { calculateTradeResult } from "@/lib/calculate";
import { getExperiment, getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tradeId = id.toUpperCase();
  const [trades, experiment] = await Promise.all([getTrades(), getExperiment()]);
  const trade = trades.find((t) => t.id === tradeId);

  if (!trade) notFound();

  const result = calculateTradeResult(trade);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <Link href="/trades" className="text-sm text-zinc-500 hover:underline">
          ← Back to trades
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {trade.id} · {trade.ticker}
        </h1>
        <p className="text-sm capitalize text-zinc-500">Status: {trade.status}</p>
        {trade.inconsistent && (
          <p className="mt-1 text-sm text-amber-600">⚠ inconsistent trade data</p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 bg-white p-6 text-sm shadow-sm">
        <Detail label="Entry" value={trade.entry.toFixed(2)} />
        <Detail label="Stop" value={trade.stop.toFixed(2)} />
        <Detail label="Shares" value={String(trade.shares)} />
        <Detail label="Target" value={trade.target?.toFixed(2) ?? "—"} />
        <Detail label="Exit" value={trade.exit?.toFixed(2) ?? "—"} />
        <Detail label="Result" value={result !== null ? formatUsd(result) : "—"} />
      </dl>

      <a
        href={trade.obsidianNote}
        className="inline-block text-sm text-blue-600 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Obsidian note →
      </a>

      {trade.status === "pending" && (
        <form action={openTradeAction.bind(null, trade.id)}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Mark as open
          </button>
        </form>
      )}

      {trade.status !== "closed" && (
        <form action={closeTradeAction.bind(null, trade.id)} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Close trade</h2>
          <p className="text-xs text-zinc-500">
            Cycle P/L: {formatUsd(experiment.realizedPnL)} · Budget remaining:{" "}
            {formatUsd(experiment.remainingLossBudget)}
          </p>
          <label className="block text-sm">
            <span className="font-medium">Exit price</span>
            <input
              name="exit"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Close & calculate P/L
          </button>
        </form>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
