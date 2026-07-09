"use client";

import { HomeDashboardMain } from "@/app/components/home-dashboard/HomeDashboardMain";
import type { ImportAiBlockActionResult } from "@/app/actions";
import type { AiBridgeOverviewData } from "@/lib/ai-bridge-overview";

/** @deprecated Use HomeDashboardMain on `/` */
export function AiBridgeMain({
  snapshotText,
  overview,
  pendingInboxCount = 0,
  cycleLabel = "—",
  importAction,
}: {
  snapshotText: string;
  overview: AiBridgeOverviewData;
  pendingInboxCount?: number;
  cycleLabel?: string;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
}) {
  return (
    <HomeDashboardMain
      snapshotText={snapshotText}
      overview={overview}
      pendingInboxCount={pendingInboxCount}
      cycleLabel={cycleLabel}
      importAction={importAction}
    />
  );
}
