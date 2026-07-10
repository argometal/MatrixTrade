import Link from "next/link";
import { TradeReviewWizard } from "@/app/components/TradeReviewWizard";
import type { Trade } from "@/lib/types";

/** Classic light-theme trade review page — preserved for reference. */
export function LegacyTradeReviewPage({
  trade,
  result,
  rMultiple,
  reviewed,
}: {
  trade: Trade;
  result: number | null;
  rMultiple: number | null;
  reviewed: boolean;
}) {
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
          {reviewed
            ? "Update your review — takes about 3 minutes."
            : "Close the loop — about 3 minutes."}
        </p>
      </header>

      <TradeReviewWizard trade={trade} result={result} rMultiple={rMultiple} />
    </div>
  );
}
