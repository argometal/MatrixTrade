import { Suspense } from "react";
import { importAiBlockAction } from "@/app/actions";
import { AiBridgeShell, type AiBridgeView } from "@/app/components/ai-bridge/AiBridgeShell";
import { buildAiBridgeLiveSnapshot } from "@/lib/ai-bridge-live-snapshot";
import { buildAiBlockSnapshot } from "@/lib/ai-block-snapshot";
import { listAiNotes } from "@/lib/ai-notes";
import { describeProposal, fetchBridgeInbox, getBridgeConfig, parseTradingInboxPayload } from "@/lib/bridge";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { getTradesStoreMode } from "@/lib/trades-json";
import { resolveInboxBackendLabel } from "@/lib/trading-inbox-submit";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { getSyncHistory } from "@/lib/sync-history";
import { checkWorkerReachable } from "@/lib/system-status";
import { getSetups } from "@/lib/setups";
import { listPendingInboxForRuntime } from "@/lib/trading-inbox-submit";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";

function parseInitialView(value: string | undefined): AiBridgeView {
  return value === "classic" ? "classic" : "v2";
}

export default async function AiBridgePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
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
    plans,
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
    getPlans(),
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
    plans,
    systemNotes: {
      tradesStore: getTradesStoreMode(),
      bridgeConfigured: bridge.configured,
      workerReachable: workerStatus.reachable,
      inboxBackend: resolveInboxBackendLabel(),
      lastSyncAt: lastSync?.at ?? null,
    },
  });

  const liveSnapshot = buildAiBridgeLiveSnapshot(experiment, trades, playbooks, aiNotes);
  const pendingInbox = await listPendingInboxForRuntime(workerInbox);
  const pendingInboxPreview = pendingInbox.slice(0, 5).map((item) => {
    const parsed = parseTradingInboxPayload(item.payload);
    return {
      id: item.id,
      origin: item.origin,
      summary: parsed ? describeProposal(parsed) : "Proposal",
    };
  });

  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading AI Bridge…</div>}>
      <AiBridgeShell
        snapshotText={snapshotText}
        liveSnapshot={liveSnapshot}
        pendingInboxCount={pendingInbox.length}
        pendingInboxPreview={pendingInboxPreview}
        importAction={importAiBlockAction}
        initialView={parseInitialView(params.view)}
      />
    </Suspense>
  );
}
