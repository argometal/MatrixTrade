import { Suspense } from "react";
import { PreviewInsightsHub } from "@/app/components/insights-preview/PreviewInsightsHub";
import type { InsightsTabId } from "@/app/components/insights-preview/PreviewInsightsHub";
import { loadStatsPageData } from "@/lib/load-stats-page-data";
import { buildInsightsCaseSpine } from "@/lib/insights-case-spine";
import { getLearningOutcomes } from "@/lib/learning-outcome-store";
import { getMafExperiments } from "@/lib/maf-store";
import { getObservations } from "@/lib/observation-store";
import { getPlans } from "@/lib/plans";
import { computeMistakeStats } from "@/lib/review";
import { getPlaybooks } from "@/lib/playbooks";
import { getTrades } from "@/lib/storage";

function resolveInsightsTab(tabParam: string | undefined): InsightsTabId {
  if (tabParam === "journal") return "journal";
  if (tabParam === "mistakes") return "mistakes";
  if (tabParam === "pipeline") return "pipeline";
  return "stats";
}

async function settled<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [
    statsData,
    trades,
    playbooks,
    params,
    learningOutcomes,
    plans,
    observations,
    mafExperiments,
    caseSpine,
  ] = await Promise.all([
    loadStatsPageData(),
    getTrades(),
    getPlaybooks(),
    searchParams,
    settled(getLearningOutcomes(), []),
    settled(getPlans(), []),
    settled(getObservations(), []),
    settled(getMafExperiments(), []),
    settled(buildInsightsCaseSpine(), []),
  ]);

  const closed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  const mistakeStats = computeMistakeStats(trades);
  const tab = resolveInsightsTab(params.tab);

  return (
    <Suspense fallback={null}>
      <PreviewInsightsHub
        tab={tab}
        statsData={statsData}
        closed={closed}
        playbooks={playbooks}
        mistakeStats={mistakeStats}
        trades={trades}
        pipelineInput={{
          learningOutcomes,
          plans,
          trades,
          observations,
          mafExperiments,
        }}
        caseSpine={caseSpine}
      />
    </Suspense>
  );
}
