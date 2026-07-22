import type { ImportAiBlockActionResult } from "@/app/actions";
import { HomeDashboardMain } from "@/app/components/home-dashboard/HomeDashboardMain";
import { HomeDashboardSidebar } from "@/app/components/home-dashboard/HomeDashboardSidebar";
import type { AiBridgeOverviewData } from "@/lib/ai-bridge-overview";

export function PreviewExchange({
  snapshotText,
  overview,
  pendingInboxCount,
  cycleLabel,
  importAction,
}: {
  snapshotText: string;
  overview: AiBridgeOverviewData;
  pendingInboxCount: number;
  cycleLabel: string;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
}) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <h1 className="text-xl font-semibold text-zinc-100">Exchange</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Legacy paste flow — prefer Control → Apply on any page.
          </p>
        </header>

        <div className="grid gap-6 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6 lg:py-6">
          <HomeDashboardMain
            snapshotText={snapshotText}
            overview={overview}
            pendingInboxCount={pendingInboxCount}
            cycleLabel={cycleLabel}
            importAction={importAction}
            theme="dark"
            hideHeader
          />
          <HomeDashboardSidebar
            overview={overview}
            pendingInboxCount={pendingInboxCount}
            theme="dark"
          />
        </div>
      </div>
    </div>
  );
}
