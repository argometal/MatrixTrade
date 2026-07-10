import Link from "next/link";
import { TradeReviewWizard } from "@/app/components/TradeReviewWizard";
import type { Trade } from "@/lib/types";

export function PreviewTradeReview({
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
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <Link
            href={`/trades/${trade.id}`}
            className="text-sm text-zinc-500 hover:text-violet-400"
          >
            ← {trade.id} · {trade.ticker}
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100">
            Review · {trade.id} · {trade.ticker}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {reviewed
              ? "Update your review — takes about 3 minutes."
              : "Close the loop — about 3 minutes."}
          </p>
        </header>

        <div className="mx-auto max-w-lg px-4 py-4 lg:px-6 lg:py-6">
          <TradeReviewWizard
            trade={trade}
            result={result}
            rMultiple={rMultiple}
            theme="dark"
          />
        </div>
      </div>
    </div>
  );
}
