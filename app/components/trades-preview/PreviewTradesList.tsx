import Link from "next/link";
import { calculateTradeResult } from "@/lib/calculate";
import type { Playbook } from "@/lib/playbook-types";
import { getPlaybookName } from "@/lib/playbooks";
import { isTradeReviewed } from "@/lib/review";
import type { Experiment, Trade } from "@/lib/types";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  open: "bg-blue-500/15 text-blue-400",
  closed: "bg-zinc-700/50 text-zinc-400",
};

function pnlTone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-300";
}

export function PreviewTradesList({
  trades,
  experiment,
  playbooks,
  embedded = false,
}: {
  trades: Trade[];
  experiment: Experiment;
  playbooks: Playbook[];
  embedded?: boolean;
}) {
  const sorted = [...trades].sort((a, b) => a.id.localeCompare(b.id));

  const tableContent = (
    <>
      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No trades yet. Log your first trade from New Trade.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Playbook</th>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Exit</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Obsidian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sorted.map((trade) => {
                const result = calculateTradeResult(trade);
                const reviewed = isTradeReviewed(trade);
                const playbookName = getPlaybookName(playbooks, trade.playbookId);
                return (
                  <tr key={trade.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/trades/${trade.id}`}
                        className="text-violet-400 hover:text-violet-300 hover:underline"
                      >
                        {trade.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-200">{trade.ticker}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[trade.status]}`}
                      >
                        {trade.status}
                      </span>
                      {trade.inconsistent && (
                        <span
                          className="ml-2 text-xs text-amber-500"
                          title="Closed without exit in frontmatter"
                        >
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {playbookName ?? <span className="text-zinc-600">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {trade.status === "closed" ? (
                        reviewed ? (
                          <span className="text-emerald-400">Done</span>
                        ) : (
                          <Link
                            href={`/trades/${trade.id}/review`}
                            className="text-amber-400 underline hover:text-amber-300"
                          >
                            Pending
                          </Link>
                        )
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-300">
                      {trade.entry.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-300">
                      {trade.exit !== undefined ? trade.exit.toFixed(2) : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 tabular-nums ${result !== null ? pnlTone(result) : "text-zinc-600"}`}
                    >
                      {result !== null ? formatUsd(result) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={trade.obsidianNote}
                        className="text-violet-400 hover:text-violet-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open note
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="px-4 py-4 lg:px-6">{tableContent}</div>;
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Trades</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                {trades.length} closed in lab
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/trades-preview"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                New Trade
              </Link>
            </div>
          </div>
        </header>

        <div className="px-4 py-4 lg:px-6">{tableContent}</div>
      </div>
    </div>
  );
}
