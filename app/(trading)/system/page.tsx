import Link from "next/link";
import { SystemBridgePanel } from "@/app/components/system/SystemBridgePanel";
import { SystemChatGptPanel } from "@/app/components/system/SystemChatGptPanel";
import { SystemSection, SystemRow, StatusBadge } from "@/app/components/system/SystemSection";
import { ConnectPageContent } from "@/app/components/ConnectPageContent";
import { getSnapshotReadUrl } from "@/lib/bridge";
import { createQrDataUrl } from "@/lib/qr";
import { buildFullContext } from "@/lib/snapshot";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { getSyncHistory } from "@/lib/sync-history";
import { getSetups } from "@/lib/setups";
import { fetchBridgeInbox } from "@/lib/bridge";
import {
  checkWorkerReachable,
  getEnvironmentLabel,
  getLastNoteWritten,
  getLastReviewExported,
  getTokenFlags,
} from "@/lib/system-status";
import { computeMistakeStats, suggestExportQuestion } from "@/lib/review";
import { listAllPendingInboxItems } from "@/lib/trading-inbox-storage";
import { getExperiment, getTrades, getTradeNotes, getVaultStatus, getRules } from "@/lib/storage";
import packageJson from "@/package.json";

const SECTION_LINKS = [
  { id: "bridge", label: "Bridge" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "phone", label: "Phone" },
  { id: "knowledge", label: "Knowledge" },
  { id: "meta", label: "System" },
] as const;

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ syncOk?: string; syncError?: string }>;
}) {
  const syncParams = await searchParams;
  const [
    experiment,
    trades,
    vault,
    notes,
    setups,
    rules,
    revision,
    history,
    workerInbox,
    workerStatus,
    tokenFlags,
  ] = await Promise.all([
    getExperiment(),
    getTrades(),
    getVaultStatus(),
    getTradeNotes(),
    getSetups(),
    getRules(),
    getSnapshotRevisionState(),
    getSyncHistory(),
    fetchBridgeInbox(),
    checkWorkerReachable(),
    Promise.resolve(getTokenFlags()),
  ]);

  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const snapshotUrl = getSnapshotReadUrl();
  const snapshotQrDataUrl = snapshotUrl ? await createQrDataUrl(snapshotUrl) : null;
  const lastNote = await getLastNoteWritten(rules);
  const lastReview = getLastReviewExported(trades);

  const snapshotOpts = { setups };
  const fullContext = buildFullContext(experiment, trades, notes, snapshotOpts);
  const fullContextAllClosed = buildFullContext(experiment, trades, notes, { full: true, setups });
  const unreviewedContext = buildFullContext(experiment, trades, notes, {
    unreviewedOnly: true,
    setups,
  });
  const mistakeStats = computeMistakeStats(trades);
  const suggestedQuestion = suggestExportQuestion(trades, mistakeStats);

  const env = getEnvironmentLabel();
  const buildLabel = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local dev";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">System</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Infrastructure hub — sync, ChatGPT, phone, and knowledge. Not shown on Dashboard.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Bridge */}
      <SystemSection
        id="bridge"
        title="Bridge"
        description="Cloudflare Worker — publish and read experiment snapshot."
      >
        <SystemBridgePanel
          syncOk={syncParams.syncOk}
          syncError={syncParams.syncError}
          workerReachable={workerStatus.reachable}
          workerHttpStatus={workerStatus.httpStatus}
          workerUpdatedAt={workerStatus.updatedAt}
          workerRevision={workerStatus.snapshotRevision}
          localRevision={revision?.revision ?? null}
          localUpdatedAt={revision?.updatedAt ?? null}
          history={history}
        />
      </SystemSection>

      {/* ChatGPT */}
      <SystemSection
        id="chatgpt"
        title="ChatGPT"
        description="Snapshot URL, QR, and handoff for analysis."
      >
        <SystemChatGptPanel
          snapshotUrl={snapshotUrl}
          snapshotQrDataUrl={snapshotQrDataUrl}
          snapshotRevision={workerStatus.snapshotRevision ?? revision?.revision ?? null}
          snapshotUpdatedAt={workerStatus.updatedAt ?? revision?.updatedAt ?? null}
          fullContext={fullContext}
          fullContextAllClosed={fullContextAllClosed}
          unreviewedContext={unreviewedContext}
          suggestedQuestion={suggestedQuestion}
        />
      </SystemSection>

      {/* Phone */}
      <SystemSection
        id="phone"
        title="Phone"
        description="Connect from mobile — local WiFi or cloud snapshot."
      >
        <dl className="space-y-3">
          <SystemRow
            label="Inbox status"
            value={
              pendingInbox.length === 0 ? (
                <span className="text-zinc-600">Empty — no pending proposals</span>
              ) : (
                <Link href="/inbox" className="font-medium text-zinc-900 underline">
                  {pendingInbox.length} pending · Review inbox →
                </Link>
              )
            }
          />
        </dl>

        <details className="rounded-lg border border-zinc-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700">
            Connect phone — local WiFi QR
          </summary>
          <div className="border-t border-zinc-100 p-4">
            <p className="mb-4 text-sm text-zinc-500">
              Same WiFi required. Opens full MatrixTrade UI on your PC&apos;s LAN IP.
            </p>
            <ConnectPageContent />
          </div>
        </details>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm">
          <h3 className="font-medium text-zinc-800">Upload (ChatGPT → inbox)</h3>
          <p className="mt-2 text-zinc-600">
            ChatGPT POSTs proposals to the Worker. On LAN you can also use:
          </p>
          <pre className="mt-2 overflow-x-auto rounded border border-zinc-200 bg-white p-3 text-xs">
            {`POST /api/trading/inbox\nAuthorization: Bearer <MATRIXTRADE_INBOX_TOKEN>\nContent-Type: application/json`}
          </pre>
          <p className="mt-2 text-zinc-500">
            Token configured:{" "}
            <StatusBadge ok={tokenFlags.inboxToken} label={tokenFlags.inboxToken ? "Yes" : "No"} />
          </p>
          <Link href="/inbox" className="mt-2 inline-block text-sm underline">
            Open inbox →
          </Link>
        </div>
      </SystemSection>

      {/* Knowledge */}
      <SystemSection
        id="knowledge"
        title="Knowledge"
        description="Obsidian vault and export timestamps."
      >
        <dl className="space-y-3">
          <SystemRow label="Obsidian location" value={vault.vaultPath} mono />
          <SystemRow label="Trades folder" value={`${vault.tradesFolder}/`} />
          <SystemRow
            label="Vault ready"
            value={<StatusBadge ok={vault.ready} label={vault.ready ? "Found" : "Missing"} />}
          />
          <SystemRow
            label="Last note written"
            value={
              lastNote.mtime ? (
                <>
                  {new Date(lastNote.mtime).toLocaleString()}
                  {lastNote.path && (
                    <span className="mt-1 block font-mono text-xs text-zinc-400">{lastNote.path}</span>
                  )}
                </>
              ) : (
                "—"
              )
            }
          />
          <SystemRow
            label="Last review exported"
            value={
              lastReview.reviewedAt ? (
                <>
                  {lastReview.tradeId} · {new Date(lastReview.reviewedAt).toLocaleString()}
                </>
              ) : (
                "—"
              )
            }
          />
          <SystemRow label="Data file" value={vault.dataFile} mono />
        </dl>
      </SystemSection>

      {/* System meta */}
      <SystemSection id="meta" title="System" description="Version, environment, and token status.">
        <dl className="space-y-3">
          <SystemRow label="Version" value={`MatrixTrade v${packageJson.version}`} />
          <SystemRow label="Build" value={buildLabel} />
          <SystemRow label="Environment" value={env} />
          <SystemRow
            label="Worker reachable"
            value={
              tokenFlags.bridgeRead ? (
                <StatusBadge
                  ok={workerStatus.reachable}
                  label={workerStatus.reachable ? "Reachable" : "Unreachable"}
                />
              ) : (
                <span className="text-zinc-500">— (no read token)</span>
              )
            }
          />
        </dl>

        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Tokens configured
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>BRIDGE_WRITE_TOKEN</span>
              <StatusBadge ok={tokenFlags.bridgeWrite} />
            </li>
            <li className="flex items-center justify-between">
              <span>BRIDGE_READ_TOKEN</span>
              <StatusBadge ok={tokenFlags.bridgeRead} />
            </li>
            <li className="flex items-center justify-between">
              <span>MATRIXTRADE_INBOX_TOKEN</span>
              <StatusBadge ok={tokenFlags.inboxToken} />
            </li>
            <li className="flex items-center justify-between">
              <span>MATRIXTRADE_PASSWORD</span>
              <StatusBadge ok={tokenFlags.tradingPassword} />
            </li>
          </ul>
          <p className="mt-3 text-xs text-zinc-400">Values are never displayed.</p>
        </div>

        {workerStatus.error && !workerStatus.reachable && tokenFlags.bridgeRead && (
          <p className="text-sm text-amber-700">Worker check: {workerStatus.error}</p>
        )}
      </SystemSection>

      <nav className="text-sm">
        <Link href="/" className="text-zinc-600 hover:underline">
          ← Dashboard
        </Link>
      </nav>
    </div>
  );
}
