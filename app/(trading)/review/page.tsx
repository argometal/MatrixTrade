import Link from "next/link";
import { fetchBridgeInbox, describeProposal, parseTradingInboxPayload } from "@/lib/bridge";
import { buildAttentionItems } from "@/lib/dashboard-attention";
import { getPlaybooks } from "@/lib/playbooks";
import { getUnreviewedTrades, isTradeReviewed, MISTAKE_LABELS } from "@/lib/review";
import { listAllPendingInboxItems } from "@/lib/trading-inbox-storage";
import { getTrades } from "@/lib/storage";

export default async function ReviewPage() {
  const [trades, playbooks, workerInbox] = await Promise.all([
    getTrades(),
    getPlaybooks(),
    fetchBridgeInbox(),
  ]);

  const unreviewed = getUnreviewedTrades(trades);
  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const attentionItems = buildAttentionItems(trades, pendingInbox, playbooks);
  const needsPlaybook = trades.filter((t) => !t.playbookId && t.status !== "pending");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Review</h1>
        <p className="text-sm text-zinc-500">
          Close the learning loop — reviews, inbox, and playbook assignment.
        </p>
      </header>

      {attentionItems.length === 0 ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          All caught up. No pending reviews or assignments.
        </p>
      ) : (
        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Action queue
          </h2>
          <ul className="divide-y divide-zinc-100">
            {attentionItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm">{item.label}</span>
                <Link href={item.href} className="text-sm font-medium underline">
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unreviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Trades missing review
          </h2>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {unreviewed.map((trade) => (
              <li key={trade.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium">{trade.id} · {trade.ticker}</span>
                  <span className="ml-2 text-zinc-400">closed</span>
                </div>
                <Link
                  href={`/trades/${trade.id}/review`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Inbox proposals
          </h2>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {pendingInbox.map((item) => {
              const parsed = parseTradingInboxPayload(item.payload);
              return (
                <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {parsed ? describeProposal(parsed) : "Unknown proposal"}
                    </p>
                    <p className="text-xs text-zinc-400">{item.origin}</p>
                  </div>
                  <Link href={`/inbox/${item.id}?origin=${item.origin}`} className="font-medium underline">
                    Preview
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/inbox" className="text-sm text-zinc-600 hover:underline">
            Open full inbox →
          </Link>
        </section>
      )}

      {needsPlaybook.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Assign playbook
          </h2>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {needsPlaybook.map((trade) => (
              <li key={trade.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{trade.id} · {trade.ticker}</span>
                <Link href={`/trades/${trade.id}`} className="font-medium underline">
                  Assign →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Reviewed trades
        </h2>
        {trades.filter((t) => t.status === "closed" && isTradeReviewed(t)).length === 0 ? (
          <p className="text-sm text-zinc-500">No completed reviews yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {trades
              .filter((t) => t.status === "closed" && isTradeReviewed(t))
              .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
              .map((trade) => (
                <li key={trade.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Link href={`/trades/${trade.id}`} className="font-medium hover:underline">
                      {trade.id} · {trade.ticker}
                    </Link>
                    <Link href={`/trades/${trade.id}/review`} className="text-xs text-zinc-500 hover:underline">
                      Edit
                    </Link>
                  </div>
                  {trade.mistakes?.length ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {trade.mistakes.map((m) => MISTAKE_LABELS[m]).join(", ")}
                    </p>
                  ) : null}
                  {trade.lesson && (
                    <p className="mt-1 text-zinc-600">{trade.lesson}</p>
                  )}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
