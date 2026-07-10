import Link from "next/link";
import { describeProposal, parseTradingInboxPayload } from "@/lib/bridge";
import type { AttentionItem } from "@/lib/dashboard-attention";
import type { BridgeInboxItem } from "@/lib/bridge";
import { isTradeReviewed, MISTAKE_LABELS } from "@/lib/review";
import type { Trade } from "@/lib/types";

export function PreviewReview({
  attentionItems,
  unreviewed,
  pendingInbox,
  needsPlaybook,
  reviewedTrades,
}: {
  attentionItems: AttentionItem[];
  unreviewed: Trade[];
  pendingInbox: BridgeInboxItem[];
  needsPlaybook: Trade[];
  reviewedTrades: Trade[];
}) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <h1 className="text-xl font-semibold text-zinc-100">Review</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Close the learning loop — reviews, inbox, and playbook assignment.
          </p>
        </header>

        <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
          {attentionItems.length === 0 ? (
            <p className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              All caught up. No pending reviews or assignments.
            </p>
          ) : (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Action queue
              </h2>
              <ul className="divide-y divide-zinc-800">
                {attentionItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm text-zinc-200">{item.label}</span>
                    <Link
                      href={item.href}
                      className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                    >
                      Open →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unreviewed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Trades missing review
              </h2>
              <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                {unreviewed.map((trade) => (
                  <li
                    key={trade.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium text-zinc-100">
                        {trade.id} · {trade.ticker}
                      </span>
                      <span className="ml-2 text-zinc-500">closed</span>
                    </div>
                    <Link
                      href={`/trades/${trade.id}/review`}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                    >
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pendingInbox.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Inbox proposals
              </h2>
              <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                {pendingInbox.map((item) => {
                  const parsed = parseTradingInboxPayload(item.payload);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-zinc-100">
                          {parsed ? describeProposal(parsed) : "Unknown proposal"}
                        </p>
                        <p className="text-xs text-zinc-500">{item.origin}</p>
                      </div>
                      <Link
                        href={`/inbox/${item.id}?origin=${item.origin}`}
                        className="text-violet-400 hover:text-violet-300 hover:underline"
                      >
                        Preview
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link href="/inbox" className="text-sm text-zinc-500 hover:text-zinc-300">
                Open full inbox →
              </Link>
            </section>
          )}

          {needsPlaybook.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Assign playbook
              </h2>
              <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                {needsPlaybook.map((trade) => (
                  <li
                    key={trade.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-zinc-100">
                      {trade.id} · {trade.ticker}
                    </span>
                    <Link
                      href={`/trades/${trade.id}`}
                      className="text-violet-400 hover:text-violet-300 hover:underline"
                    >
                      Assign →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Reviewed trades
            </h2>
            {reviewedTrades.length === 0 ? (
              <p className="text-sm text-zinc-500">No completed reviews yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                {reviewedTrades.map((trade) => (
                  <li key={trade.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/trades/${trade.id}`}
                        className="font-medium text-violet-400 hover:text-violet-300 hover:underline"
                      >
                        {trade.id} · {trade.ticker}
                      </Link>
                      <Link
                        href={`/trades/${trade.id}/review`}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Edit
                      </Link>
                    </div>
                    {trade.mistakes?.length ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {trade.mistakes.map((m) => MISTAKE_LABELS[m]).join(", ")}
                      </p>
                    ) : null}
                    {trade.lesson && <p className="mt-1 text-zinc-400">{trade.lesson}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
