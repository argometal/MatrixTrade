import Link from "next/link";
import { QuickConnectPanel } from "@/app/components/ai-workspace/QuickConnectPanel";
import { ContextHandoffPanel } from "@/app/components/ai-workspace/ContextHandoffPanel";
import { SystemSection } from "@/app/components/system/SystemSection";
import { fetchBridgeInbox, getBridgeConfig, getSnapshotReadUrl } from "@/lib/bridge";
import { createQrDataUrl } from "@/lib/qr";
import { buildFullContext } from "@/lib/snapshot";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { getSyncHistory } from "@/lib/sync-history";
import { ANALYSIS_TEMPLATES } from "@/lib/ai-workspace";
import { checkWorkerReachable } from "@/lib/system-status";
import { getSetups } from "@/lib/setups";
import { describeProposal, parseTradingInboxPayload } from "@/lib/bridge";
import { computeMistakeStats, suggestExportQuestion } from "@/lib/review";
import { listAllPendingInboxItems } from "@/lib/trading-inbox-storage";
import { getExperiment, getTrades, getTradeNotes } from "@/lib/storage";

export default async function AiWorkspacePage() {
  const bridge = getBridgeConfig();
  const [
    experiment,
    trades,
    notes,
    setups,
    revision,
    workerStatus,
    workerInbox,
    syncHistory,
  ] = await Promise.all([
    getExperiment(),
    getTrades(),
    getTradeNotes(),
    getSetups(),
    getSnapshotRevisionState(),
    checkWorkerReachable(),
    fetchBridgeInbox(),
    getSyncHistory(),
  ]);

  const snapshotUrl = getSnapshotReadUrl();
  const snapshotQrDataUrl = snapshotUrl ? await createQrDataUrl(snapshotUrl) : null;
  const pendingInbox = await listAllPendingInboxItems(workerInbox);

  const snapshotOpts = { setups };
  const fullContext = buildFullContext(experiment, trades, notes, snapshotOpts);
  const fullContextAllClosed = buildFullContext(experiment, trades, notes, { full: true, setups });
  const unreviewedContext = buildFullContext(experiment, trades, notes, {
    unreviewedOnly: true,
    setups,
  });
  const mistakeStats = computeMistakeStats(trades);
  const suggestedQuestion = suggestExportQuestion(trades, mistakeStats);

  const proposalHistory = workerInbox
    .filter((item) => item.status !== "pending")
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 8);

  const lastSync = syncHistory.find((e) => e.ok);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">AI Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Copy context, sync snapshot, paste proposals to Inbox — human Apply required.
        </p>
      </header>

      <SystemSection
        id="quick-connect"
        title="Quick Connect"
        description="Three steps after Sync — snapshot URL, QR, and assistant."
      >
        <QuickConnectPanel
          snapshotUrl={snapshotUrl}
          snapshotQrDataUrl={snapshotQrDataUrl}
          snapshotRevision={workerStatus.snapshotRevision ?? revision?.revision ?? null}
          snapshotUpdatedAt={workerStatus.updatedAt ?? revision?.updatedAt ?? null}
          bridgeConfigured={bridge.configured}
          workerReachable={workerStatus.reachable}
        />
      </SystemSection>

      <SystemSection id="context" title="Copy Context" description="Paste handoff when snapshot URL is not enough.">
        <ContextHandoffPanel
          fullContext={fullContext}
          fullContextAllClosed={fullContextAllClosed}
          unreviewedContext={unreviewedContext}
          suggestedQuestion={suggestedQuestion}
          templates={ANALYSIS_TEMPLATES}
        />
      </SystemSection>

      <SystemSection id="inbox" title="Inbox" description="Proposals from pasted JSON — review before Apply.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-700">
            {pendingInbox.length === 0 ? (
              "No pending proposals."
            ) : (
              <span className="font-medium">{pendingInbox.length} pending</span>
            )}
            {lastSync && (
              <span className="ml-2 text-zinc-400">
                · Last sync {new Date(lastSync.at).toLocaleString()}
              </span>
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
                <li key={item.id} className="flex justify-between gap-3 px-4 py-2">
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

      <SystemSection id="history" title="Proposal History" description="Recently applied or rejected (Worker).">
        {proposalHistory.length === 0 ? (
          <p className="text-sm text-zinc-500">No processed proposals yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {proposalHistory.map((item) => {
              const parsed = parseTradingInboxPayload(item.payload);
              return (
                <li key={item.id} className="flex justify-between gap-3 px-4 py-2">
                  <span className="text-zinc-700">
                    {parsed ? describeProposal(parsed) : item.id.slice(0, 8)}
                  </span>
                  <span
                    className={
                      item.status === "applied" ? "text-emerald-600" : "text-zinc-400"
                    }
                  >
                    {item.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SystemSection>

      <SystemSection id="templates" title="Analysis Templates" description="Click to use in Copy Context.">
        <ul className="space-y-2 text-sm text-zinc-700">
          {ANALYSIS_TEMPLATES.map((t) => (
            <li key={t} className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-400">
          Deep link research: see{" "}
          <code className="text-xs">md/integrations/ai-workspace-deeplinks.md</code> in the repo.
        </p>
      </SystemSection>

      <nav className="flex gap-4 text-sm">
        <Link href="/system" className="text-zinc-600 hover:underline">
          System (sync &amp; bridge) →
        </Link>
        <Link href="/" className="text-zinc-600 hover:underline">
          Dashboard
        </Link>
      </nav>
    </div>
  );
}
