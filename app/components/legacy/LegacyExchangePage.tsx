import { HomeDashboardMain } from "@/app/components/home-dashboard/HomeDashboardMain";
import { HomeDashboardSidebar } from "@/app/components/home-dashboard/HomeDashboardSidebar";
import type { ImportAiBlockActionResult } from "@/app/actions";
import type { AiBridgeOverviewData } from "@/lib/ai-bridge-overview";

/** Classic light-theme Exchange page — preserved for reference. */
export function LegacyExchangePage({
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <HomeDashboardMain
        snapshotText={snapshotText}
        overview={overview}
        pendingInboxCount={pendingInboxCount}
        cycleLabel={cycleLabel}
        importAction={importAction}
      />
      <HomeDashboardSidebar overview={overview} pendingInboxCount={pendingInboxCount} />
    </div>
  );
}
