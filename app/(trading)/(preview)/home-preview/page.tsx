import { PreviewDashboard } from "@/app/components/dashboard/PreviewDashboard";
import { loadDashboardData } from "@/lib/dashboard-data";
import { loadHomeExchangePageData } from "@/lib/load-home-exchange";

export default async function HomePreviewPage() {
  const [data, exchange] = await Promise.all([
    loadDashboardData(),
    loadHomeExchangePageData(),
  ]);

  return (
    <PreviewDashboard
      data={data}
      exchange={{
        dashboardSnapshots: exchange.dashboardSnapshots,
      }}
    />
  );
}
