import Link from "next/link";
import { PreviewReview } from "@/app/components/review-preview/PreviewReview";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import type { AttentionItem } from "@/lib/dashboard-attention";
import type { BridgeInboxItem } from "@/lib/bridge";
import {
  formatIncompleteClosedSummary,
  incompleteClosedHref,
  listIncompleteClosedTrades,
} from "@/lib/incomplete-closed-trades";
import {
  buildTradesLedger,
  countLedgerByVerdict,
  filterLedgerRows,
  LEDGER_VERDICT_LABELS,
  type LedgerVerdict,
} from "@/lib/trades-ledger";
import type { TradePlan } from "@/lib/plan-types";
import type { Trade } from "@/lib/types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { formatDashboardUsd } from "@/lib/dashboard-display";

export type TradesHubTab =
  | "historico"
  | "completed_win"
  | "completed_loss"
  | "late_entry_miss"
  | "never_executed"
  | "incomplete"
  | "review";

function formatUsd(value: number | null): string {
  if (value === null) return "—";
  return formatDashboardUsd(value);
}

export function PreviewTradesHub({
  tab,
  trades,
  plans,
  reviewData,
  snapshotItems,
}: {
  tab: TradesHubTab;
  trades: Trade[];
  plans: TradePlan[];
  reviewData: {
    attentionItems: AttentionItem[];
    unreviewed: Trade[];
    pendingInbox: BridgeInboxItem[];
    needsPlaybook: Trade[];
    reviewedTrades: Trade[];
  };
  snapshotItems: SnapshotMenuItem[];
}) {
  const ledger = buildTradesLedger(trades, plans);
  const counts = countLedgerByVerdict(ledger);
  const pendingReviewCount = reviewData.unreviewed.length;
  const incompleteClosed = listIncompleteClosedTrades(trades);

  const filter: LedgerVerdict | "historico" | "all" =
    tab === "review"
      ? "all"
      : tab === "historico"
        ? "historico"
        : tab;

  const rows = tab === "review" ? [] : filterLedgerRows(ledger, filter);

  const subtitle =
    tab === "review"
      ? `${pendingReviewCount} waiting for review`
      : tab === "historico"
        ? "Veredictos — éxito, pérdida, tarde, no ejecutado"
        : LEDGER_VERDICT_LABELS[tab as LedgerVerdict];

  const tabs: { id: TradesHubTab; href: string; label: string }[] = [
    { id: "historico", href: "/trades", label: "Histórico" },
    {
      id: "completed_win",
      href: "/trades?tab=completed_win",
      label: `Éxito (${counts.completed_win})`,
    },
    {
      id: "completed_loss",
      href: "/trades?tab=completed_loss",
      label: `Perdido (${counts.completed_loss})`,
    },
    {
      id: "late_entry_miss",
      href: "/trades?tab=late_entry_miss",
      label: `Tarde (${counts.late_entry_miss})`,
    },
    {
      id: "never_executed",
      href: "/trades?tab=never_executed",
      label: `No ejecutado (${counts.never_executed})`,
    },
    {
      id: "incomplete",
      href: "/trades?tab=incomplete",
      label: `Sin veredicto (${counts.incomplete})`,
    },
    {
      id: "review",
      href: "/trades?tab=review",
      label: `Review${pendingReviewCount ? ` (${pendingReviewCount})` : ""}`,
    },
  ];

  return (
    <PageHelpPanel pageId="trades">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Trades</h1>
                <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:mr-[11rem]">
                <SnapshotButton
                  title="Trades snapshot"
                  description="Ledger summary for AI"
                  items={snapshotItems}
                />
                <Link
                  href="/planning"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Scout war room
                </Link>
              </div>
            </div>

            {incompleteClosed.length > 0 ? (
              <section
                className="mt-4 rounded-xl border border-amber-500/35 bg-amber-950/25 p-4"
                aria-label="Closed trades incomplete"
              >
                <p className="text-sm font-semibold text-amber-100">
                  Closed ≠ complete · {incompleteClosed.length} trade
                  {incompleteClosed.length === 1 ? "" : "s"} need finishing
                </p>
                <p className="mt-1 text-xs text-amber-100/70">
                  Review and missing fields stay on Trades — not Scout war room.
                </p>
                <ul className="mt-3 space-y-2">
                  {incompleteClosed.map((row) => (
                    <li key={row.trade.id}>
                      <Link
                        href={incompleteClosedHref(row)}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-zinc-950/40 px-3 py-2 text-sm hover:border-amber-400/40"
                      >
                        <span className="font-medium text-amber-50">
                          {row.trade.id} · {row.trade.ticker}
                        </span>
                        <span className="text-xs text-amber-200/80">
                          {formatIncompleteClosedSummary(row)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/trades?tab=review"
                  className="mt-3 inline-block text-xs font-medium text-amber-200 hover:underline"
                >
                  Open Review queue →
                </Link>
              </section>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {tabs.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    tab === entry.id
                      ? "bg-violet-600/20 text-violet-300"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                  }`}
                >
                  {entry.label}
                </Link>
              ))}
            </div>
          </header>

          {tab === "review" ? (
            <PreviewReview
              attentionItems={reviewData.attentionItems}
              unreviewed={reviewData.unreviewed}
              pendingInbox={reviewData.pendingInbox}
              needsPlaybook={reviewData.needsPlaybook}
              reviewedTrades={reviewData.reviewedTrades}
              embedded
            />
          ) : (
            <div className="px-4 py-4 lg:px-6">
              {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-500">
                  Nothing in this filter. Scout owns live cases; veredictos land here.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {rows.map((row) => (
                    <li key={`${row.kind}-${row.id}`}>
                      <Link
                        href={row.href}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/40"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-100">{row.label}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {LEDGER_VERDICT_LABELS[row.verdict]}
                            {row.detail ? ` · ${row.detail}` : ""}
                            {row.date ? ` · ${row.date}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 tabular-nums text-sm font-medium ${
                            row.pnl === null
                              ? "text-zinc-600"
                              : row.pnl >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                          }`}
                        >
                          {formatUsd(row.pnl)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </PageHelpPanel>
  );
}
