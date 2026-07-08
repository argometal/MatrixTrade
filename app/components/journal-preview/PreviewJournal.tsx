import Link from "next/link";
import { calculateTradeResult } from "@/lib/calculate";
import type { Playbook } from "@/lib/playbook-types";
import { getPlaybookName } from "@/lib/playbooks";
import { isTradeReviewed, MISTAKE_LABELS } from "@/lib/review";
import type { Trade } from "@/lib/types";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function pnlTone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-300";
}

export function PreviewJournal({
  closed,
  playbooks,
}: {
  closed: Trade[];
  playbooks: Playbook[];
}) {
  const pendingReview = closed.filter((t) => !isTradeReviewed(t)).length;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Journal</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Closed trades, lessons, and review notes — your trading log.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/review"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                Review queue
                {pendingReview > 0 ? ` (${pendingReview})` : ""}
              </Link>
              <Link
                href="/trades"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                All trades
              </Link>
            </div>
          </div>
          {closed.length > 0 && (
            <p className="mt-3 text-xs text-zinc-600">
              {closed.length} closed trade{closed.length === 1 ? "" : "s"}
              {pendingReview > 0
                ? ` · ${pendingReview} pending review`
                : " · all reviewed"}
            </p>
          )}
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
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
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/trades/${trade.id}`}
                          className="text-lg font-semibold text-violet-400 hover:text-violet-300 hover:underline"
                        >
                          {trade.id} · {trade.ticker}
                        </Link>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {trade.closedAt
                            ? new Date(trade.closedAt).toLocaleDateString()
                            : "—"}
                          {playbookName ? ` · ${playbookName}` : " · Unassigned"}
                        </p>
                      </div>
                      <div className="text-right">
                        {pnl !== null && (
                          <p className={`text-lg font-semibold tabular-nums ${pnlTone(pnl)}`}>
                            {formatUsd(pnl)}
                          </p>
                        )}
                        {reviewed ? (
                          <span className="text-xs text-emerald-400">Reviewed</span>
                        ) : (
                          <Link
                            href={`/trades/${trade.id}/review`}
                            className="text-xs text-amber-400 underline hover:text-amber-300"
                          >
                            Review pending
                          </Link>
                        )}
                      </div>
                    </div>

                    {trade.mistakes?.length ? (
                      <p className="mt-2 text-sm text-zinc-400">
                        <span className="text-xs uppercase text-zinc-600">Mistakes · </span>
                        {trade.mistakes.map((m) => MISTAKE_LABELS[m]).join(", ")}
                      </p>
                    ) : null}

                    {trade.lesson && (
                      <p className="mt-2 text-sm text-zinc-200">{trade.lesson}</p>
                    )}

                    {trade.actionItem && (
                      <p className="mt-1 text-sm text-zinc-500">
                        <span className="font-medium text-zinc-400">Action:</span>{" "}
                        {trade.actionItem}
                      </p>
                    )}

                    {!trade.lesson && trade.lessons && (
                      <p className="mt-2 text-sm text-zinc-400">{trade.lessons}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <nav className="flex gap-4 border-t border-zinc-800 px-4 py-4 text-sm lg:px-6">
          <Link href="/review" className="text-zinc-500 hover:text-violet-400">
            Review queue →
          </Link>
          <Link href="/trades" className="text-zinc-500 hover:text-violet-400">
            All trades →
          </Link>
          <Link href="/stats" className="text-zinc-500 hover:text-violet-400">
            Statistics →
          </Link>
        </nav>
      </div>
    </div>
  );
}
