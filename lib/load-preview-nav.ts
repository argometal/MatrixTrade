import { cache } from "react";
import { fetchBridgeInbox } from "./bridge";
import { formatCycleLabel } from "./experiment-label";
import type { PreviewNavContext } from "./preview-nav";
import { formatSituationUsd } from "./situation-room";
import { getExperiment } from "./storage";
import { listAllPendingInboxItems } from "./trading-inbox-storage";

const FALLBACK_NAV: PreviewNavContext = {
  pendingInboxCount: 0,
  cycleLabel: formatCycleLabel(),
  tradesUsed: 0,
  tradesMax: 30,
  lossBudgetRemaining: 0,
  lossBudgetLabel: formatSituationUsd(0),
};

export const loadPreviewNavContext = cache(async (): Promise<PreviewNavContext> => {
  try {
    const [experiment, workerInbox] = await Promise.all([getExperiment(), fetchBridgeInbox()]);
    const pendingInbox = await listAllPendingInboxItems(workerInbox);

    return {
      pendingInboxCount: pendingInbox.length,
      cycleLabel: formatCycleLabel(experiment),
      tradesUsed: experiment.closedTrades,
      tradesMax: experiment.maxTrades,
      lossBudgetRemaining: experiment.remainingLossBudget,
      lossBudgetLabel: formatSituationUsd(experiment.remainingLossBudget),
    };
  } catch (err) {
    console.error("loadPreviewNavContext failed:", err);
    return FALLBACK_NAV;
  }
});
