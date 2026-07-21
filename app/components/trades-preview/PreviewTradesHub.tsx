import Link from "next/link";
import { PreviewReview } from "@/app/components/review-preview/PreviewReview";
import { PreviewTradesList } from "@/app/components/trades-preview/PreviewTradesList";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import type { AttentionItem } from "@/lib/dashboard-attention";
import type { BridgeInboxItem } from "@/lib/bridge";
import type { Playbook } from "@/lib/playbook-types";
import type { Experiment, Trade } from "@/lib/types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

export type TradesHubTab = "open" | "review" | "closed" | "all";

export function PreviewTradesHub({
  tab,
  trades,
  experiment,
  playbooks,
  reviewData,
  snapshotItems,
}: {
  tab: TradesHubTab;
  trades: Trade[];
  experiment: Experiment;
  playbooks: Playbook[];
  reviewData: {
    attentionItems: AttentionItem[];
    unreviewed: Trade[];
    pendingInbox: BridgeInboxItem[];
    needsPlaybook: Trade[];
    reviewedTrades: Trade[];
  };
  snapshotItems: SnapshotMenuItem[];
}) {
  const openCount = trades.filter((t) => t.status === "open").length;
  const closedCount = trades.filter((t) => t.status === "closed").length;
  const pendingReviewCount = reviewData.unreviewed.length;

  const listTrades =
    tab === "open"
      ? trades.filter((t) => t.status === "open")
      : tab === "closed"
        ? trades.filter((t) => t.status === "closed")
        : trades;

  const subtitle =
    tab === "open"
      ? `${openCount} open · manage live risk`
      : tab === "review"
        ? `${pendingReviewCount} waiting for review`
        : tab === "closed"
          ? `${closedCount} closed · history of fills`
          : `${trades.length} in the book`;

  const tabs: { id: TradesHubTab; href: string; label: string }[] = [
    { id: "open", href: "/trades?tab=open", label: `Open${openCount ? ` (${openCount})` : ""}` },
    {
      id: "review",
      href: "/trades?tab=review",
      label: `Review${pendingReviewCount ? ` (${pendingReviewCount})` : ""}`,
    },
    {
      id: "closed",
      href: "/trades?tab=closed",
      label: `Closed${closedCount ? ` (${closedCount})` : ""}`,
    },
    { id: "all", href: "/trades", label: "All" },
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
                  description="Book summary for AI"
                  items={snapshotItems}
                />
                <Link
                  href="/planning"
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Scouting
                </Link>
                <Link
                  href="/trades-preview"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Enter Trade
                </Link>
              </div>
            </div>
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
            <PreviewTradesList
              trades={listTrades}
              experiment={experiment}
              playbooks={playbooks}
              embedded
              emptyHint={
                tab === "open"
                  ? "No open trades. Scout first, then Enter Trade."
                  : tab === "closed"
                    ? "No closed trades yet."
                    : "No trades yet. Enter Trade when a scout is ready."
              }
            />
          )}
        </div>
      </div>
    </PageHelpPanel>
  );
}
