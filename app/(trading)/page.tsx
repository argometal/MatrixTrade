import { importAiBlockAction } from "@/app/actions";
import { HomeDashboardMain } from "@/app/components/home-dashboard/HomeDashboardMain";
import { HomeDashboardSidebar } from "@/app/components/home-dashboard/HomeDashboardSidebar";
import { loadHomeExchangePageData } from "@/lib/load-home-exchange";

export default async function DashboardPage() {
  const { snapshotText, overview, pendingInboxCount, cycleLabel } =
    await loadHomeExchangePageData();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <HomeDashboardMain
        snapshotText={snapshotText}
        overview={overview}
        pendingInboxCount={pendingInboxCount}
        cycleLabel={cycleLabel}
        importAction={importAiBlockAction}
      />
      <HomeDashboardSidebar overview={overview} pendingInboxCount={pendingInboxCount} />
    </div>
  );
}
