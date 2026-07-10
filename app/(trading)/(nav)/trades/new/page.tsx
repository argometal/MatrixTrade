import { PreviewTradeNew } from "@/app/components/trade-preview/PreviewTradeNew";
import { getPlaybooks } from "@/lib/playbooks";
import { getSetups } from "@/lib/setups";

export default async function NewTradePage() {
  const [setups, playbooks] = await Promise.all([getSetups(), getPlaybooks()]);

  return <PreviewTradeNew setups={setups} playbooks={playbooks} />;
}
