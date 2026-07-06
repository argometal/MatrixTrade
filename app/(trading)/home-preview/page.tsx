import { importAiBlockAction } from "@/app/actions";
import { DashboardViewSwitch } from "@/app/components/dashboard/DashboardViewSwitch";
import { HomeDashboardMain } from "@/app/components/home-dashboard/HomeDashboardMain";
import { HomeDashboardSidebar } from "@/app/components/home-dashboard/HomeDashboardSidebar";
import { loadHomeExchangePageData } from "@/lib/load-home-exchange";

export default async function HomePreviewPage() {
  const { snapshotText, overview, pendingInboxCount, cycleLabel } =
    await loadHomeExchangePageData();

  return (
    <>
      <div className="mb-4 flex justify-end">
        <DashboardViewSwitch mode="preview" />
      </div>
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
    </>
  );
}
