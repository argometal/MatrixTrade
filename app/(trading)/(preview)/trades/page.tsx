import { Suspense } from "react";
import { PreviewTradesHub } from "@/app/components/trades-preview/PreviewTradesHub";
import { loadReviewPageData } from "@/lib/load-review-page-data";
import { getPlaybooks } from "@/lib/playbooks";
import { getExperiment, getTrades } from "@/lib/storage";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [trades, experiment, playbooks, reviewData, params] = await Promise.all([
    getTrades(),
    getExperiment(),
    getPlaybooks(),
    loadReviewPageData(),
    searchParams,
  ]);

  const tab = params.tab === "review" ? "review" : "all";

  return (
    <Suspense fallback={null}>
      <PreviewTradesHub
        tab={tab}
        trades={trades}
        experiment={experiment}
        playbooks={playbooks}
        reviewData={{
          attentionItems: reviewData.attentionItems,
          unreviewed: reviewData.unreviewed,
          pendingInbox: reviewData.pendingInbox,
          needsPlaybook: reviewData.needsPlaybook,
          reviewedTrades: reviewData.reviewedTrades,
        }}
      />
    </Suspense>
  );
}
