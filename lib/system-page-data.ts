import { fetchBridgeInbox, getBridgeConfig, getSnapshotReadUrl } from "@/lib/bridge";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { getSyncHistory } from "@/lib/sync-history";
import {
  checkWorkerReachable,
  getEnvironmentLabel,
  getLastNoteWritten,
  getLastReviewExported,
  getTokenFlags,
} from "@/lib/system-status";
import { getTrades, getVaultStatus, getRules } from "@/lib/storage";
import { getTradesStoreMode } from "@/lib/trades-json";
import { listPendingInboxForRuntime, resolveInboxBackendLabel } from "@/lib/trading-inbox-submit";
import packageJson from "@/package.json";

export async function loadSystemPageData() {
  const bridge = getBridgeConfig();
  const isVercel = Boolean(process.env.VERCEL);

  const [trades, vault, rules, revision, history, workerInbox, workerStatus, tokenFlags] =
    await Promise.all([
      getTrades(),
      getVaultStatus(),
      getRules(),
      getSnapshotRevisionState(),
      getSyncHistory(),
      fetchBridgeInbox(),
      checkWorkerReachable(),
      Promise.resolve(getTokenFlags()),
    ]);

  const pendingInbox = await listPendingInboxForRuntime(workerInbox);
  const lastNote = await getLastNoteWritten(rules);
  const lastReview = getLastReviewExported(trades);

  return {
    bridge,
    isVercel,
    env: getEnvironmentLabel(),
    buildLabel: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local dev",
    vercelUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    version: packageJson.version,
    tradesStore: getTradesStoreMode(),
    inboxBackend: resolveInboxBackendLabel(),
    pendingInboxCount: pendingInbox.length,
    snapshotUrl: getSnapshotReadUrl(),
    workerStatus,
    tokenFlags,
    revision,
    history,
    vault,
    lastNote,
    lastReview,
    localRevision: revision?.revision ?? null,
    localUpdatedAt: revision?.updatedAt ?? null,
  };
}

export type SystemPageData = Awaited<ReturnType<typeof loadSystemPageData>>;
