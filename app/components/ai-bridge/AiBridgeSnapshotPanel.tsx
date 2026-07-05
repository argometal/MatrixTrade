import { formatSignedUsd, type AiBridgeLiveSnapshot } from "@/lib/ai-bridge-live-snapshot";

export function AiBridgeSnapshotPanel({ snapshot }: { snapshot: AiBridgeLiveSnapshot }) {
  return (
    <aside className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Your Snapshot</h2>
        <p className="text-xs text-violet-600">live</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <StatCard label="Open" value={String(snapshot.openCount)} />
        <StatCard label="Pending" value={String(snapshot.pendingCount)} />
        <StatCard
          label="Closed"
          value={`${snapshot.closedCount}/${snapshot.maxTrades}`}
          sub="This cycle"
        />
      </div>

      <div className="space-y-2 border-t border-zinc-100 pt-3 text-sm">
        <Row label="Total P&L" value={formatSignedUsd(snapshot.totalPnL)} highlight />
        <Row
          label="Win Rate"
          value={snapshot.winRatePercent !== null ? `${snapshot.winRatePercent}%` : "—"}
        />
        <Row
          label="Expectancy"
          value={
            snapshot.expectancyPerTrade !== null
              ? formatSignedUsd(snapshot.expectancyPerTrade)
              : "—"
          }
        />
      </div>

      {snapshot.playbookRows.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Playbook summary
          </h3>
          <ul className="mt-2 space-y-2 text-xs">
            {snapshot.playbookRows.map((row) => (
              <li key={row.name} className="rounded-lg bg-zinc-50 px-2 py-2">
                <div className="font-medium text-zinc-800">{row.name}</div>
                <div className="mt-0.5 text-zinc-600">
                  {formatSignedUsd(row.netPnL)}
                  {row.winRatePercent !== null ? ` · ${row.winRatePercent}% win` : ""}
                  {` · ${row.tradeCount} trades`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.recentClosed.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Recent closed
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-400">
                <tr>
                  <th className="pb-1 pr-2 font-medium">Ticker</th>
                  <th className="pb-1 pr-2 font-medium">Type</th>
                  <th className="pb-1 pr-2 font-medium">P&L</th>
                  <th className="pb-1 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentClosed.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-50 text-zinc-700">
                    <td className="py-1.5 pr-2 font-medium">{row.ticker}</td>
                    <td className="py-1.5 pr-2">{row.direction}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {row.pnl !== null ? formatSignedUsd(row.pnl) : "—"}
                    </td>
                    <td className="py-1.5">{row.dateLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {snapshot.aiNoteBullets.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            AI notes (context)
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-600">
            {snapshot.aiNoteBullets.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-zinc-900">{value}</div>
      {sub && <div className="text-[10px] text-zinc-400">{sub}</div>}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-medium tabular-nums ${highlight ? "text-emerald-700" : "text-zinc-800"}`}>
        {value}
      </span>
    </div>
  );
}
