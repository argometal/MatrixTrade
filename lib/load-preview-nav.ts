import { cache } from "react";
import { fetchBridgeInbox } from "./bridge";
import { formatCycleLabel } from "./experiment-label";
import { formatMonthlyLossRoom } from "./monthly-risk";
import type { PreviewNavContext } from "./preview-nav";
import { getExperiment, getMonthlyRisk } from "./storage";
import { listAllPendingInboxItems } from "./trading-inbox-storage";

const FALLBACK_NAV: PreviewNavContext = {
  pendingInboxCount: 0,
  cycleLabel: formatCycleLabel(),
  closedTrades: 0,
  monthlyLossRoom: 0,
  monthlyLossRoomLabel: formatMonthlyLossRoom(0),
};

export const loadPreviewNavContext = cache(async (): Promise<PreviewNavContext> => {
  try {
    const [experiment, monthly, workerInbox] = await Promise.all([
      getExperiment(),
      getMonthlyRisk(),
      fetchBridgeInbox(),
    ]);
    const pendingInbox = await listAllPendingInboxItems(workerInbox);

    return {
      pendingInboxCount: pendingInbox.length,
      cycleLabel: formatCycleLabel(experiment),
      closedTrades: experiment.closedTrades,
      monthlyLossRoom: monthly.monthlyLossRoom,
      monthlyLossRoomLabel: formatMonthlyLossRoom(monthly.monthlyLossRoom),
    };
  } catch (err) {
    console.error("loadPreviewNavContext failed:", err);
    return FALLBACK_NAV;
  }
});
