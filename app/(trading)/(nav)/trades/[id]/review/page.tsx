import { notFound, redirect } from "next/navigation";
import { PreviewTradeReview } from "@/app/components/trade-preview/PreviewTradeReview";
import { calculateTradeResult } from "@/lib/calculate";
import { computeRMultiple, isTradeReviewed } from "@/lib/review";
import { getTradeById } from "@/lib/storage";

export default async function TradeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tradeId = id.toUpperCase();
  const trade = await getTradeById(tradeId);

  if (!trade) notFound();
  if (trade.status !== "closed") redirect(`/trades/${tradeId}`);

  const result = calculateTradeResult(trade);
  const rMultiple = computeRMultiple(trade);
  const reviewed = isTradeReviewed(trade);

  return (
    <PreviewTradeReview
      trade={trade}
      result={result}
      rMultiple={rMultiple}
      reviewed={reviewed}
    />
  );
}
