import Link from "next/link";
import { calculateTradeResult } from "@/lib/calculate";
import { getPlaybookName, getPlaybooks } from "@/lib/playbooks";
import { isTradeReviewed, MISTAKE_LABELS } from "@/lib/review";
import { getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export default async function JournalPage() {
  const [trades, playbooks] = await Promise.all([getTrades(), getPlaybooks()]);

  const closed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Journal</h1>
        <p className="text-sm text-zinc-500">
          Closed trades, lessons, and review notes — your trading log.
        </p>
      </header>

      {closed.length === 0 ? (
        <p className="text-sm text-zinc-500">No closed trades yet.</p>
      ) : (
        <ul className="space-y-4">
          {closed.map((trade) => {
            const pnl = calculateTradeResult(trade);
            const playbookName = getPlaybookName(playbooks, trade.playbookId);
            const reviewed = isTradeReviewed(trade);

            return (
              <li
                key={trade.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/trades/${trade.id}`} className="text-lg font-semibold hover:underline">
                      {trade.id} · {trade.ticker}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {trade.closedAt
                        ? new Date(trade.closedAt).toLocaleDateString()
                        : "—"}
                      {playbookName ? ` · ${playbookName}` : " · Unassigned"}
                    </p>
                  </div>
                  <div className="text-right">
                    {pnl !== null && (
                      <p
                        className={`text-lg font-semibold tabular-nums ${
                          pnl >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {formatUsd(pnl)}
                      </p>
                    )}
                    {reviewed ? (
                      <span className="text-xs text-emerald-600">Reviewed</span>
                    ) : (
                      <Link
                        href={`/trades/${trade.id}/review`}
                        className="text-xs text-amber-700 underline"
                      >
                        Review pending
                      </Link>
                    )}
                  </div>
                </div>

                {trade.mistakes?.length ? (
                  <p className="mt-2 text-sm text-zinc-600">
                    <span className="text-xs uppercase text-zinc-400">Mistakes · </span>
                    {trade.mistakes.map((m) => MISTAKE_LABELS[m]).join(", ")}
                  </p>
                ) : null}

                {trade.lesson && (
                  <p className="mt-2 text-sm text-zinc-800">{trade.lesson}</p>
                )}

                {trade.actionItem && (
                  <p className="mt-1 text-sm text-zinc-500">
                    <span className="font-medium">Action:</span> {trade.actionItem}
                  </p>
                )}

                {!trade.lesson && trade.lessons && (
                  <p className="mt-2 text-sm text-zinc-600">{trade.lessons}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <nav className="flex gap-4 text-sm">
        <Link href="/review" className="text-zinc-600 hover:underline">
          Review queue →
        </Link>
        <Link href="/trades" className="text-zinc-600 hover:underline">
          All trades
        </Link>
      </nav>
    </div>
  );
}
