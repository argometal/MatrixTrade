import { importAiBlockAction } from "@/app/actions";
import { TradesWorkspace } from "@/app/components/trades-preview/TradesWorkspace";
import { loadTradesWorkspaceData } from "@/lib/trades-workspace";

export default async function TradesPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [data, sp] = await Promise.all([loadTradesWorkspaceData(), searchParams]);
  const prefill = {
    ticker: typeof sp.ticker === "string" ? sp.ticker : undefined,
    playbookId: typeof sp.playbook === "string" ? sp.playbook : undefined,
    entry: typeof sp.entry === "string" ? sp.entry : undefined,
    stop: typeof sp.stop === "string" ? sp.stop : undefined,
    target: typeof sp.target === "string" ? sp.target : undefined,
    planId: typeof sp.plan === "string" ? sp.plan : undefined,
  };
  return (
    <TradesWorkspace
      data={data}
      importAction={importAiBlockAction}
      prefill={prefill}
    />
  );
}
