import { notFound } from "next/navigation";
import { PreviewTradeDetail } from "@/app/components/trade-preview/PreviewTradeDetail";
import { getPlaybooks } from "@/lib/playbooks";
import { getSetups } from "@/lib/setups";
import { tradeSnapshotItems } from "@/lib/snapshot-trade-packages";
import { getStockTheses } from "@/lib/stock-theses";
import { isActiveStockThesisStatus } from "@/lib/stock-thesis-types";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";

export default async function TradeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ metaOk?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tradeId = id.toUpperCase();
  const [trades, experiment, monthly, setups, playbooks, stockTheses] = await Promise.all([
    getTrades(),
    getExperiment(),
    getMonthlyRisk(),
    getSetups(),
    getPlaybooks(),
    getStockTheses(),
  ]);
  const trade = trades.find((t) => t.id === tradeId);

  if (!trade) notFound();

  const linkedThesis = stockTheses.find(
    (t) =>
      t.ticker.toUpperCase() === trade.ticker.toUpperCase() &&
      isActiveStockThesisStatus(t.status)
  );

  const snapshotItems = tradeSnapshotItems({
    trade,
    setups,
    playbooks,
    linkedThesis,
  });

  return (
    <PreviewTradeDetail
      trade={trade}
      experiment={experiment}
      monthly={monthly}
      setups={setups}
      playbooks={playbooks}
      metaOk={query.metaOk}
      snapshotItems={snapshotItems}
    />
  );
}
