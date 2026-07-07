import { importAiBlockAction } from "@/app/actions";
import { TradesWorkspace } from "@/app/components/trades-preview/TradesWorkspace";
import { loadTradesWorkspaceData } from "@/lib/trades-workspace";

export default async function TradesPreviewPage() {
  const data = await loadTradesWorkspaceData();
  return <TradesWorkspace data={data} importAction={importAiBlockAction} />;
}
