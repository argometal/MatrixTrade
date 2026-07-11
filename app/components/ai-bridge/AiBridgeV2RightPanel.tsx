import Link from "next/link";
import {
  AI_BRIDGE_V2_BLOCK_EXAMPLES,
  AI_BRIDGE_V2_FLOW_STEPS,
  AI_BRIDGE_V2_RULES,
} from "@/lib/ai-bridge-v2-content";
import { formatSignedUsd, type AiBridgeLiveSnapshot } from "@/lib/ai-bridge-live-snapshot";

export function AiBridgeV2RightPanel({ snapshot }: { snapshot: AiBridgeLiveSnapshot }) {
  return (
    <aside className="w-full shrink-0 space-y-4 xl:w-72">
      <Panel title="How AI Bridge works">
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-600">
          {AI_BRIDGE_V2_FLOW_STEPS.map((step, i) => (
            <span key={step.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-zinc-300">→</span>}
              <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1.5 py-0.5">
                <span>{step.icon}</span>
                <span>{step.label}</span>
              </span>
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="AI Bridge rules">
        <ul className="space-y-1.5 text-xs text-zinc-600">
          {AI_BRIDGE_V2_RULES.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="text-violet-600">✓</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Quick overview">
        {snapshot.recentClosed.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Recent closed
            </h3>
            <table className="mt-2 w-full text-left text-[11px]">
              <thead className="text-zinc-400">
                <tr>
                  <th className="pb-1 font-medium">Ticker</th>
                  <th className="pb-1 font-medium">Type</th>
                  <th className="pb-1 font-medium">P&L</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentClosed.slice(0, 3).map((row) => (
                  <tr key={row.id} className="border-t border-zinc-50 text-zinc-700">
                    <td className="py-1 font-medium">{row.ticker}</td>
                    <td className="py-1">{row.direction}</td>
                    <td
                      className={`py-1 tabular-nums ${row.pnl !== null && row.pnl >= 0 ? "text-emerald-700" : "text-red-600"}`}
                    >
                      {row.pnl !== null ? formatSignedUsd(row.pnl) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {snapshot.topPlaybooks.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Top playbooks (this cycle)
            </h3>
            <table className="mt-2 w-full text-left text-[11px]">
              <thead className="text-zinc-400">
                <tr>
                  <th className="pb-1 font-medium">Playbook</th>
                  <th className="pb-1 font-medium">Win</th>
                  <th className="pb-1 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.topPlaybooks.map((row) => (
                  <tr key={row.name} className="border-t border-zinc-50 text-zinc-700">
                    <td className="max-w-[7rem] truncate py-1 font-medium">{row.name}</td>
                    <td className="py-1 tabular-nums">
                      {row.winRatePercent !== null ? `${row.winRatePercent}%` : "—"}
                    </td>
                    <td
                      className={`py-1 tabular-nums ${row.netPnL >= 0 ? "text-emerald-700" : "text-red-600"}`}
                    >
                      {formatSignedUsd(row.netPnL)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {snapshot.recentClosed.length === 0 && snapshot.topPlaybooks.length === 0 && (
          <p className="text-xs text-zinc-500">No closed trades or playbook stats yet.</p>
        )}
      </Panel>

      <Panel title="AI Block examples (responses)">
        <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-900 p-3 text-[10px] leading-relaxed text-emerald-300">
          {AI_BRIDGE_V2_BLOCK_EXAMPLES}
        </pre>
        <p className="mt-2 text-[10px] text-zinc-500">
          For reference only — you speak in actions, not JSON.
        </p>
      </Panel>

      <Link
        href="/inbox"
        className="block rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center text-xs font-medium text-violet-900 hover:bg-violet-100"
      >
        Open Inbox to review proposals →
      </Link>
    </aside>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <h2 className="text-xs font-semibold text-zinc-800">{title}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}
