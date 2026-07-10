import { PreviewStats } from "@/app/components/stats-preview/PreviewStats";
import { loadStatsPageData } from "@/lib/load-stats-page-data";

export default async function StatsPage() {
  const data = await loadStatsPageData();
  return <PreviewStats data={data} />;
}
