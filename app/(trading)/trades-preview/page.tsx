import { importAiBlockAction } from "@/app/actions";
import { TradesViewSwitch } from "@/app/components/trades-preview/TradesViewSwitch";
import { TradesWorkspace } from "@/app/components/trades-preview/TradesWorkspace";
import { loadTradesWorkspaceData } from "@/lib/trades-workspace";

export default async function TradesPreviewPage() {
  const data = await loadTradesWorkspaceData();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <TradesViewSwitch mode="preview" />
      </div>
      <TradesWorkspace data={data} importAction={importAiBlockAction} />
    </div>
  );
}
