import { importAiBlockAction } from "@/app/actions";
import { AiBridgeMain } from "@/app/components/ai-bridge/AiBridgeMain";
import { AiBridgeSidebar } from "@/app/components/ai-bridge/AiBridgeSidebar";
import { buildAiBridgeOverview } from "@/lib/ai-bridge-overview";
import { buildAiBlockSnapshot } from "@/lib/ai-block-snapshot";
import { listAiNotes } from "@/lib/ai-notes";
import { fetchBridgeInbox, getBridgeConfig } from "@/lib/bridge";
import { getPlaybooks } from "@/lib/playbooks";
import { getTradesStoreMode } from "@/lib/trades-json";
import { resolveInboxBackendLabel } from "@/lib/trading-inbox-submit";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { getSyncHistory } from "@/lib/sync-history";
import { checkWorkerReachable } from "@/lib/system-status";
import { getSetups } from "@/lib/setups";
import { listPendingInboxForRuntime } from "@/lib/trading-inbox-submit";
import { getExperiment, getTrades } from "@/lib/storage";

export default async function AiWorkspacePage() {
  const bridge = getBridgeConfig();
  const [
    experiment,
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AiBridgeMain
        snapshotText={snapshotText}
        overview={overview}
        pendingInboxCount={pendingInbox.length}
        importAction={importAiBlockAction}
      />
      <AiBridgeSidebar overview={overview} pendingInboxCount={pendingInbox.length} />
    </div>
  );
}
