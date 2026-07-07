import { fetchBridgeInbox } from "./bridge";
import { formatCycleLabel } from "./experiment-label";
import type { PreviewNavContext } from "./preview-nav";
import { formatSituationUsd } from "./situation-room";
import { getExperiment } from "./storage";
import { listAllPendingInboxItems } from "./trading-inbox-storage";

export async function loadPreviewNavContext(): Promise<PreviewNavContext> {
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
}
