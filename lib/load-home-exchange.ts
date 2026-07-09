import { buildAiBridgeOverview } from "@/lib/ai-bridge-overview";
import { buildAiBlockSnapshot } from "@/lib/ai-block-snapshot";
import { listAiNotes } from "@/lib/ai-notes";
import { fetchBridgeInbox, getBridgeConfig } from "@/lib/bridge";
import { getPlaybooks } from "@/lib/playbooks";
import { getSetups } from "@/lib/setups";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { getSyncHistory } from "@/lib/sync-history";
import { checkWorkerReachable } from "@/lib/system-status";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";
import { getTradesStoreMode } from "@/lib/trades-json";
import {
  listPendingInboxForRuntime,
  resolveInboxBackendLabel,
} from "@/lib/trading-inbox-submit";

export async function loadHomeExchangePageData() {
  const bridge = getBridgeConfig();
  const [
    experiment,
    monthly,
    trades,
    setups,
    playbooks,
    revision,
    workerStatus,
    workerInbox,
    syncHistory,
    aiNotes,
  ] = await Promise.all([
    getExperiment(),
    getMonthlyRisk(),
    getTrades(),
    getSetups(),
    getPlaybooks(),
    getSnapshotRevisionState(),
    checkWorkerReachable(),
    fetchBridgeInbox(),
    getSyncHistory(),
    listAiNotes(20),
  ]);

  const snapshotRevision = workerStatus.snapshotRevision ?? revision?.revision ?? 0;
  const lastSync = syncHistory.find((e) => e.ok);

  const snapshotText = buildAiBlockSnapshot({
    experiment,
    monthly,
    trades,
    setups,
    playbooks,
    snapshotRevision,
    priorAiNotes: aiNotes,
    systemNotes: {
      tradesStore: getTradesStoreMode(),
      bridgeConfigured: bridge.configured,
      workerReachable: workerStatus.reachable,
      inboxBackend: resolveInboxBackendLabel(),
      lastSyncAt: lastSync?.at ?? null,
    },
  });

  const pendingInbox = await listPendingInboxForRuntime(workerInbox);
  const overview = buildAiBridgeOverview(experiment, trades, playbooks);

  return {
    snapshotText,
    overview,
    pendingInboxCount: pendingInbox.length,
    cycleLabel: `${experiment.closedTrades} / ${experiment.maxTrades}`,
  };
}
