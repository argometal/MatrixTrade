import { Suspense } from "react";
import { importAiBlockAction } from "@/app/actions";
import { PreviewDashboard } from "@/app/components/dashboard/PreviewDashboard";
import { loadDashboardData } from "@/lib/dashboard-data";
import { loadHomeExchangePageData } from "@/lib/load-home-exchange";

export default async function HomePreviewPage() {
  const [data, exchange] = await Promise.all([
    loadDashboardData(),
    loadHomeExchangePageData(),
  ]);

  return (
    <Suspense fallback={null}>
      <PreviewDashboard
        data={data}
        exchange={{
          snapshotText: exchange.snapshotText,
          overview: exchange.overview,
          pendingInboxCount: exchange.pendingInboxCount,
          cycleLabel: exchange.cycleLabel,
          importAction: importAiBlockAction,
          dashboardSnapshots: exchange.dashboardSnapshots,
        }}
      />
    </Suspense>
  );
}
