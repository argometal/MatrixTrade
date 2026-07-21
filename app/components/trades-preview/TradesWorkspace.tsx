"use client";

import Link from "next/link";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { NewTradeScoutFlow } from "@/app/components/trades-preview/NewTradeScoutFlow";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import { formatTradeUsd, type TradesWorkspaceData } from "@/lib/trades-workspace-types";

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
  return (
    <PageHelpPanel pageId="new-trade">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Enter Trade</h1>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Execute a scout → <code className="text-violet-300">trade-proposal</code> → Control
                  → Update.
                  {data.prospects.length > 0 ? (
                    <span className="text-sky-400">
                      {" "}
                      · {data.prospects.length} ready
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
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600"
                >
                  Trades book →
                </Link>
              </div>
            </div>
          </header>

          <NewTradeScoutFlow data={data} importAction={importAction} prefill={prefill} />

          <footer className="border-t border-zinc-800 px-4 py-3 text-[10px] text-zinc-600 lg:px-6">
            Positions live in Trades. This page only opens new risk.
          </footer>
        </div>

        <aside className="hidden w-72 shrink-0 flex-col gap-4 border-l border-zinc-800 p-4 xl:flex">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Pipeline</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Scout → enter → manage</p>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/planning" className="text-zinc-400 hover:text-violet-300">
                  Scouting Desk
                </Link>
              </li>
              <li>
                <Link href="/trades" className="text-zinc-400 hover:text-violet-300">
                  Trades book
                </Link>
              </li>
              <li>
                <Link href="/inbox" className="text-zinc-400 hover:text-violet-300">
                  History
                  {data.pendingInboxCount > 0 ? ` (${data.pendingInboxCount})` : ""}
                </Link>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Open now</h2>
            {data.openSummary.count === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No open positions.</p>
            ) : (
              <>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.openSummary.positions.map((p) => (
                    <li key={p.id} className="flex justify-between text-zinc-400">
                      <Link href={`/trades/${p.id}`} className="hover:text-violet-300">
                        {p.ticker}
                      </Link>
                      <span className="text-zinc-500">
                        {p.risk !== null ? formatTradeUsd(-p.risk) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                  {data.openSummary.count} open · {formatTradeUsd(-data.openSummary.totalRisk)} risk
                </p>
              </>
            )}
          </section>
        </aside>
      </div>
    </PageHelpPanel>
  );
}
