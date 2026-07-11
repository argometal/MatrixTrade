"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { NewTradeScoutFlow } from "@/app/components/trades-preview/NewTradeScoutFlow";
import {
  formatTradeUsd,
  type TradesWorkspaceData,
  type TradesWorkspaceRow,
} from "@/lib/trades-workspace-types";

const QUICK_ACTIONS = [
  { label: "Scouting Desk", href: "/planning" },
  { label: "Review Inbox", href: "/inbox" },
  { label: "New stock case", href: "/stock-theses/new" },
] as const;

type TabId = "new" | "open" | "pending" | "closed" | "all";

function statusLabel(row: TradesWorkspaceRow): string {
  if (row.status === "closed" && !row.reviewed) return "Pending review";
  return row.status.charAt(0).toUpperCase() + row.status.slice(1);
}

export function TradesWorkspace({
  data,
  importAction,
  prefill,
}: {
  data: TradesWorkspaceData;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
  prefill?: {
    ticker?: string;
    playbookId?: string;
    entry?: string;
    stop?: string;
    target?: string;
    planId?: string;
  };
}) {
  const [tab, setTab] = useState<TabId>(prefill?.planId || prefill?.ticker ? "new" : "new");
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    let rows = data.rows;
    if (tab === "open") rows = rows.filter((r) => r.status === "open");
    else if (tab === "pending") rows = rows.filter((r) => r.status === "pending");
    else if (tab === "closed") rows = rows.filter((r) => r.status === "closed");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.ticker.toLowerCase().includes(q) ||
          r.playbook.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data.rows, tab, search]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">New Trade</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Analyze in your AI chat → one <code className="text-violet-300">trade-proposal</code>{" "}
                block → Inbox Apply.
                {data.prospects.length > 0 ? (
                  <span className="text-sky-400">
                    {" "}
                    · {data.prospects.length} scout prospect
                    {data.prospects.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/planning"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                ← Scouting Desk
              </Link>
              <Link
                href="/trades"
                className="hidden rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 sm:inline-block"
              >
                Trades →
              </Link>
              <Link
                href="/inbox"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600"
              >
                Inbox{data.pendingInboxCount > 0 ? ` (${data.pendingInboxCount})` : ""}
              </Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["new", "New Trade"],
                ["open", `Open (${data.counts.open})`],
                ["pending", `Pending (${data.counts.pending})`],
                ["closed", `Closed (${data.counts.closed})`],
                ["all", "All Trades"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === id
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {tab === "new" ? (
          <NewTradeScoutFlow data={data} importAction={importAction} prefill={prefill} />
        ) : (
          <div className="p-4 lg:p-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-200">My Trades</h2>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ticker, ID, playbook…"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300"
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                      <th className="pb-2 pr-3">Ticker</th>
                      <th className="pb-2 pr-3">Type</th>
                      <th className="pb-2 pr-3">Playbook</th>
                      <th className="pb-2 pr-3">Entry</th>
                      <th className="pb-2 pr-3">Stop</th>
                      <th className="pb-2 pr-3">R</th>
                      <th className="pb-2 pr-3">P/L</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-zinc-500">
                          No trades match this view.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr key={row.id} className="hover:bg-zinc-900/50">
                          <td className="py-2.5 pr-3">
                            <Link
                              href={`/trades/${row.id}`}
                              className="font-medium text-violet-300 hover:underline"
                            >
                              {row.ticker}
                            </Link>
                            <span className="ml-1 text-xs text-zinc-600">{row.id}</span>
                          </td>
                          <td className="py-2.5 pr-3 capitalize text-zinc-400">{row.direction}</td>
                          <td className="py-2.5 pr-3 text-zinc-400">{row.playbook}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{row.entry.toFixed(2)}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{row.stop.toFixed(2)}</td>
                          <td className="py-2.5 pr-3 tabular-nums text-zinc-400">
                            {row.rMultiple !== null ? `${row.rMultiple.toFixed(2)}R` : "—"}
                          </td>
                          <td
                            className={`py-2.5 pr-3 tabular-nums font-medium ${
                              row.pnl === null
                                ? "text-zinc-500"
                                : row.pnl >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                            }`}
                          >
                            {row.pnl !== null ? formatTradeUsd(row.pnl) : "—"}
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-zinc-400">{statusLabel(row)}</td>
                          <td className="py-2.5 text-zinc-500">{row.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        <footer className="border-t border-zinc-800 px-4 py-3 text-[10px] text-zinc-600 lg:px-6">
          Live data · Scout-style new trade · Human Apply in Inbox · Supabase is source of truth.
        </footer>
      </div>

      <aside className="hidden w-72 shrink-0 flex-col gap-4 border-l border-zinc-800 p-4 xl:flex">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Quick links</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Pipeline navigation</p>
          <ul className="mt-3 space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="block w-full rounded-lg border border-zinc-700 px-3 py-2 text-left text-xs text-zinc-400 hover:border-violet-500/40 hover:text-violet-300"
                >
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Open trades summary</h2>
          {data.openSummary.count === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No open positions.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2 text-sm">
                {data.openSummary.positions.map((p) => (
                  <li key={p.id} className="flex justify-between text-zinc-400">
                    <Link href={`/trades/${p.id}`} className="hover:text-violet-300">
                      {p.ticker} · {p.direction}
                    </Link>
                    <span className="text-zinc-500">
                      {p.risk !== null ? formatTradeUsd(-p.risk) : "—"} risk
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                {data.openSummary.count} open · {formatTradeUsd(-data.openSummary.totalRisk)} planned risk
              </p>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Trade insights</h2>
          <p className="mt-0.5 text-xs text-zinc-500">This cycle</p>
          <dl className="mt-3 space-y-2 text-sm">
            {data.insights.bestTrade && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Best trade</dt>
                <dd className="text-emerald-400">
                  {data.insights.bestTrade.ticker} {formatTradeUsd(data.insights.bestTrade.pnl)}
                </dd>
              </div>
            )}
            {data.insights.worstTrade && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Worst trade</dt>
                <dd className="text-red-400">
                  {data.insights.worstTrade.ticker} {formatTradeUsd(data.insights.worstTrade.pnl)}
                </dd>
              </div>
            )}
            {data.insights.highestR && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Highest R</dt>
                <dd className="text-zinc-300">{data.insights.highestR.r.toFixed(2)}R</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-zinc-500">Win rate</dt>
              <dd className="text-zinc-300">
                {data.insights.winRate !== null
                  ? `${(data.insights.winRate * 100).toFixed(1)}%`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Expectancy</dt>
              <dd className="text-zinc-300">
                {data.insights.expectancy !== null
                  ? formatTradeUsd(data.insights.expectancy)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Recent closed</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentClosed.length === 0 ? (
              <li className="text-zinc-500">None yet.</li>
            ) : (
              data.recentClosed.map((t) => (
                <li key={t.id} className="flex justify-between">
                  <Link href={`/trades/${t.id}`} className="text-zinc-400 hover:text-violet-300">
                    {t.ticker}
                  </Link>
                  <span className={t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatTradeUsd(t.pnl)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </aside>
    </div>
  );
}
