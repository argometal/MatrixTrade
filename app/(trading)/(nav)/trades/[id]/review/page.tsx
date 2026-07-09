import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TradeReviewWizard } from "@/app/components/TradeReviewWizard";
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
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <Link href={`/trades/${trade.id}`} className="text-sm text-zinc-500 hover:underline">
          ← Back to trade
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Review · {trade.id} · {trade.ticker}
        </h1>
        <p className="text-sm text-zinc-500">
          {reviewed ? "Update your review — takes about 3 minutes." : "Close the loop — about 3 minutes."}
        </p>
      </header>

      <TradeReviewWizard trade={trade} result={result} rMultiple={rMultiple} />
    </div>
  );
}
