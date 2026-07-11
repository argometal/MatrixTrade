import { Suspense } from "react";
import { PreviewInsightsHub } from "@/app/components/insights-preview/PreviewInsightsHub";
import { loadStatsPageData } from "@/lib/load-stats-page-data";
import { computeMistakeStats } from "@/lib/review";
import { getPlaybooks } from "@/lib/playbooks";
import { getTrades } from "@/lib/storage";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [statsData, trades, playbooks, params] = await Promise.all([
    loadStatsPageData(),
    getTrades(),
    getPlaybooks(),
    searchParams,
  ]);

  const closed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  const mistakeStats = computeMistakeStats(trades);
  const tabParam = params.tab;
  const tab =
    tabParam === "journal" ? "journal" : tabParam === "mistakes" ? "mistakes" : "stats";

  return (
    <Suspense fallback={null}>
      <PreviewInsightsHub
        tab={tab}
        statsData={statsData}
        closed={closed}
        playbooks={playbooks}
        mistakeStats={mistakeStats}
        trades={trades}
      />
    </Suspense>
  );
}
