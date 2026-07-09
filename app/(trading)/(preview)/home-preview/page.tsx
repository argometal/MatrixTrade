import { PreviewDashboard } from "@/app/components/dashboard/PreviewDashboard";
import { loadDashboardData } from "@/lib/dashboard-data";

export default async function HomePreviewPage() {
  const data = await loadDashboardData();
  return <PreviewDashboard data={data} />;
}
