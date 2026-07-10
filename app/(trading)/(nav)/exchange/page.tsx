import { importAiBlockAction } from "@/app/actions";
import { PreviewExchange } from "@/app/components/exchange-preview/PreviewExchange";
import { loadHomeExchangePageData } from "@/lib/load-home-exchange";

export default async function ExchangePage() {
  const { snapshotText, overview, pendingInboxCount, cycleLabel } =
    await loadHomeExchangePageData();

  return (
    <PreviewExchange
      snapshotText={snapshotText}
      overview={overview}
      pendingInboxCount={pendingInboxCount}
      cycleLabel={cycleLabel}
      importAction={importAiBlockAction}
    />
  );
}
