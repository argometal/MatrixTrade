import { PreviewReview } from "@/app/components/review-preview/PreviewReview";
import { loadReviewPageData } from "@/lib/load-review-page-data";

export default async function ReviewPage() {
  const data = await loadReviewPageData();

  return (
    <PreviewReview
      attentionItems={data.attentionItems}
      unreviewed={data.unreviewed}
      pendingInbox={data.pendingInbox}
      needsPlaybook={data.needsPlaybook}
      reviewedTrades={data.reviewedTrades}
    />
  );
}
