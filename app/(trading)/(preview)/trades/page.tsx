import { PreviewTradesList } from "@/app/components/trades-preview/PreviewTradesList";
import { getPlaybooks } from "@/lib/playbooks";
import { getExperiment, getTrades } from "@/lib/storage";

export default async function TradesPage() {
  const [trades, experiment, playbooks] = await Promise.all([
    getTrades(),
    getExperiment(),
    getPlaybooks(),
  ]);

  return (
    <PreviewTradesList trades={trades} experiment={experiment} playbooks={playbooks} />
  );
}
