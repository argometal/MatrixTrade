import Link from "next/link";
import { PreviewReview } from "@/app/components/review-preview/PreviewReview";
import { PreviewTradesList } from "@/app/components/trades-preview/PreviewTradesList";
import { ImportAiUpdateLink } from "@/app/components/preview/ImportAiUpdateLink";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import type { AttentionItem } from "@/lib/dashboard-attention";
import type { BridgeInboxItem } from "@/lib/bridge";
import type { Playbook } from "@/lib/playbook-types";
import type { Experiment, Trade } from "@/lib/types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

type TabId = "all" | "review";

export function PreviewTradesHub({
  tab,
  trades,
  experiment,
  playbooks,
  reviewData,
  snapshotItems,
}: {
  tab: TabId;
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
  const pendingReviewCount = reviewData.unreviewed.length;

  return (
    <PageHelpPanel pageId="trades">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Trades</h1>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {tab === "all"
                    ? `${trades.length} in lab`
                    : "Close the learning loop — reviews, inbox, and playbook assignment."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SnapshotButton
                  title="Trades snapshot"
                  description="All trades summary, experiment, monthly room"
                  items={snapshotItems}
                />
                <ImportAiUpdateLink variant="compact" />
                <Link
                  href="/trades-preview"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  New Trade
                </Link>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/trades"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === "all"
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                All
              </Link>
              <Link
                href="/trades?tab=review"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === "review"
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                Review{pendingReviewCount > 0 ? ` (${pendingReviewCount})` : ""}
              </Link>
            </div>
          </header>

          {tab === "all" ? (
            <PreviewTradesList
              trades={trades}
              experiment={experiment}
              playbooks={playbooks}
              embedded
            />
          ) : (
            <PreviewReview
              attentionItems={reviewData.attentionItems}
              unreviewed={reviewData.unreviewed}
              pendingInbox={reviewData.pendingInbox}
              needsPlaybook={reviewData.needsPlaybook}
              reviewedTrades={reviewData.reviewedTrades}
              embedded
            />
          )}
        </div>
      </div>
    </PageHelpPanel>
  );
}
