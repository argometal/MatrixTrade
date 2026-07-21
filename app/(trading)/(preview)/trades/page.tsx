import { Suspense } from "react";
import { PreviewTradesHub } from "@/app/components/trades-preview/PreviewTradesHub";
import { listAiNotes } from "@/lib/ai-notes";
import { getBridgeConfig } from "@/lib/bridge";
import { loadReviewPageData } from "@/lib/load-review-page-data";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { getSetups } from "@/lib/setups";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { tradesListSnapshotItems } from "@/lib/snapshot-packages";
import { getStockTheses } from "@/lib/stock-theses";
import { checkWorkerReachable } from "@/lib/system-status";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";
import { getTradesStoreMode } from "@/lib/trades-json";
import { resolveInboxBackendLabel } from "@/lib/trading-inbox-submit";
import { getSyncHistory } from "@/lib/sync-history";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const bridge = getBridgeConfig();
  const [
    trades,
    experiment,
    monthly,
    setups,
    playbooks,
    plans,
    stockTheses,
    revision,
    workerStatus,
    syncHistory,
    aiNotes,
    reviewData,
    params,
  ] = await Promise.all([
    getTrades(),
    getExperiment(),
    getMonthlyRisk(),
    getSetups(),
    getPlaybooks(),
    getPlans(),
    getStockTheses(),
    getSnapshotRevisionState(),
    checkWorkerReachable(),
    getSyncHistory(),
    listAiNotes(20),
    loadReviewPageData(),
    searchParams,
  ]);

  const tabParam = params.tab;
  const tab =
    tabParam === "review" || tabParam === "open" || tabParam === "closed" ? tabParam : "all";
  const snapshotRevision = workerStatus.snapshotRevision ?? revision?.revision ?? 0;
  const lastSync = syncHistory.find((e) => e.ok);
  const systemNotes = {
    tradesStore: getTradesStoreMode(),
    bridgeConfigured: bridge.configured,
    workerReachable: workerStatus.reachable,
    inboxBackend: resolveInboxBackendLabel(),
    lastSyncAt: lastSync?.at ?? null,
  };
  const snapshotItems = tradesListSnapshotItems({
    experiment,
    monthly,
    trades,
    setups,
    playbooks,
    snapshotRevision,
    priorAiNotes: aiNotes,
    plans,
    stockTheses,
    systemNotes,
  });

  return (
    <Suspense fallback={null}>
      <PreviewTradesHub
        tab={tab}
        trades={trades}
        experiment={experiment}
        playbooks={playbooks}
        reviewData={{
          attentionItems: reviewData.attentionItems,
          unreviewed: reviewData.unreviewed,
          pendingInbox: reviewData.pendingInbox,
          needsPlaybook: reviewData.needsPlaybook,
          reviewedTrades: reviewData.reviewedTrades,
        }}
        snapshotItems={snapshotItems}
      />
    </Suspense>
  );
}
