import { Suspense } from "react";
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
          dashboardSnapshots: exchange.dashboardSnapshots,
        }}
      />
    </Suspense>
  );
}
