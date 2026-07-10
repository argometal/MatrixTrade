"use client";

import { HomeDashboardMain } from "@/app/components/home-dashboard/HomeDashboardMain";
import type { ImportAiBlockActionResult } from "@/app/actions";
import type { AiBridgeOverviewData } from "@/lib/ai-bridge-overview";

/** @deprecated Use HomeDashboardMain on `/` */
export function AiBlockPanel({
  snapshotText,
  overview,
  pendingInboxCount = 0,
  cycleLabel = "—",
  importAction,
}: {
  snapshotText: string;
  overview?: AiBridgeOverviewData;
  pendingInboxCount?: number;
  cycleLabel?: string;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
}) {
  const fallbackOverview: AiBridgeOverviewData = overview ?? {
    openTrades: 0,
    pendingTrades: 0,
    closedCycle: { closed: 0 },
    totalPnL: 0,
    winRate: null,
    expectancyR: null,
    playbookSummary: { best: null, worst: null },
    recentClosed: [],
    topPlaybooks: [],
    pendingReviews: [],
    unassignedTrades: [],
  };

  return (
    <HomeDashboardMain
      snapshotText={snapshotText}
      overview={fallbackOverview}
      pendingInboxCount={pendingInboxCount}
      cycleLabel={cycleLabel}
      importAction={importAction}
    />
  );
}
