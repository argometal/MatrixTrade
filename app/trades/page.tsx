import Link from "next/link";
import { getTrades } from "@/lib/storage";
import { calculateTradeResult } from "@/lib/calculate";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  open: "bg-blue-100 text-blue-800",
  closed: "bg-zinc-100 text-zinc-700",
};

export default async function TradesPage() {
  const trades = await getTrades();
  const sorted = [...trades].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trades</h1>
          <p className="text-sm text-zinc-500">{trades.length} / 30 in cycle</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="text-sm text-zinc-600 hover:underline">
            Dashboard
          </Link>
          <Link
            href="/trades/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            New trade
          </Link>
        </div>
      </header>

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-500">No trades yet. Create H001 to start the experiment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Exit</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Obsidian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sorted.map((trade) => {
                const result = calculateTradeResult(trade);
                return (
                  <tr key={trade.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/trades/${trade.id}`} className="hover:underline">
                        {trade.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{trade.ticker}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[trade.status]}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{trade.entry.toFixed(2)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {trade.exit !== undefined ? trade.exit.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {result !== null ? formatUsd(result) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={trade.obsidianNote}
                        className="text-blue-600 hover:underline"
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
    </div>
  );
}
