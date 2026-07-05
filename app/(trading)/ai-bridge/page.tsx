import Link from "next/link";
import { importAiBlockAction } from "@/app/actions";
import { AiBlockPanel } from "@/app/components/ai-workspace/AiBlockPanel";
import { SystemSection } from "@/app/components/system/SystemSection";
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
import { describeProposal, parseTradingInboxPayload } from "@/lib/bridge";
import { listPendingInboxForRuntime } from "@/lib/trading-inbox-submit";
import { getExperiment, getTrades } from "@/lib/storage";

export default async function AiBridgePage() {
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">AI Bridge</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Structured bridge to your AI — not an AI itself. Copy Snapshot → describe what you want
          (Open, Adjust, Close, Analyze) → paste response → Inbox → Apply.
        </p>
      </header>

      <SystemSection
        id="ai-bridge-handoff"
        title="Snapshot & import"
        description="Copy context to your AI, then import its proposal — never auto-applied."
      >
        <AiBlockPanel snapshotText={snapshotText} importAction={importAiBlockAction} />
      </SystemSection>

      <SystemSection id="inbox" title="Inbox" description="Imported proposals wait here for human Apply.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-700">
            {pendingInbox.length === 0 ? (
              "No pending proposals."
            ) : (
              <span className="font-medium">{pendingInbox.length} pending</span>
            )}
          </p>
          <Link
            href="/inbox"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open Inbox
          </Link>
        </div>
        {pendingInbox.length > 0 && (
          <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {pendingInbox.slice(0, 5).map((item) => {
              const parsed = parseTradingInboxPayload(item.payload);
              return (
                <li key={`${item.origin}-${item.id}`} className="flex justify-between gap-3 px-4 py-2">
                  <span>{parsed ? describeProposal(parsed) : "Proposal"}</span>
                  <Link href={`/inbox/${item.id}?origin=${item.origin}`} className="underline">
                    Review
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SystemSection>

      <nav className="flex gap-4 text-sm">
        <Link href="/system" className="text-zinc-600 hover:underline">
          System (sync) →
        </Link>
        <Link href="/" className="text-zinc-600 hover:underline">
          Dashboard
        </Link>
      </nav>
    </div>
  );
}
