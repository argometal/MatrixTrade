"use client";

import { AiBridgeMain } from "@/app/components/ai-bridge/AiBridgeMain";
import type { ImportAiBlockActionResult } from "@/app/actions";
import type { AiBridgeOverviewData } from "@/lib/ai-bridge-overview";

/** @deprecated Use AiBridgeMain on /ai-workspace */
export function AiBlockPanel({
  snapshotText,
  overview,
  pendingInboxCount = 0,
  importAction,
}: {
  snapshotText: string;
  overview?: AiBridgeOverviewData;
  pendingInboxCount?: number;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
}) {
  const fallbackOverview: AiBridgeOverviewData = overview ?? {
    openTrades: 0,
    pendingTrades: 0,
    closedCycle: { closed: 0, max: 30 },
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
    <AiBridgeMain
      snapshotText={snapshotText}
      overview={fallbackOverview}
      pendingInboxCount={pendingInboxCount}
      importAction={importAction}
    />
  );
}
